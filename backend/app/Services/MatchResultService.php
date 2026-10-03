<?php

namespace App\Services;

use App\Models\GameMatch;
use App\Models\MatchPlayer;
use App\Models\MatchScore;
use App\Models\MatchScoreApproval;
use App\Models\MatchScoreVersion;
use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use App\Models\Referral;
use App\Models\Season;
use App\Models\SeasonPlayerStatistic;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class MatchResultService
{
    public function __construct(
        protected BattlePointService $battlePointService,
        protected RankPointService $rankPointService,
        protected PointTransactionService $pointTransactionService,
        protected NotificationService $notificationService,
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Validate and transition match to READY.
     * For Ranked matches, atomically validates that each participant has >= 3 BP,
     * and deducts 3 BP inside a single database transaction.
     */
    public function validateAndSetReady(GameMatch $match): bool
    {
        return DB::transaction(function () use ($match) {
            $lockedMatch = GameMatch::where('id', $match->id)->lockForUpdate()->first();

            // Check if all players have accepted
            if (!$lockedMatch->areAllPlayersAccepted()) {
                throw new InvalidArgumentException('All invited players must accept before match can become READY.');
            }

            if ($lockedMatch->type === 'RANKED') {
                if ($lockedMatch->battle_deducted) {
                    // Already deducted
                    $lockedMatch->status = 'READY';
                    $lockedMatch->save();
                    return true;
                }

                // Verify every participant has at least 3 Battle Points
                foreach ($lockedMatch->matchPlayers as $matchPlayer) {
                    $balance = PlayerPointBalance::where('user_id', $matchPlayer->user_id)
                        ->lockForUpdate()
                        ->first();
                    $bp = $balance ? $balance->battle_points : 0;
                    if ($bp < 3) {
                        throw new InvalidArgumentException(sprintf(
                            'Player "%s" has insufficient Battle Points (%d). Minimum 3 Battle Points required for Ranked Match.',
                            $matchPlayer->user->name ?? 'Player #' . $matchPlayer->user_id,
                            $bp
                        ));
                    }
                }

                // All players have >= 3 BP. Atomically deduct 3 BP from each participant
                foreach ($lockedMatch->matchPlayers as $matchPlayer) {
                    $idempotencyKey = sprintf('ranked_entry_%d_%d', $lockedMatch->id, $matchPlayer->user_id);
                    $this->battlePointService->adjustPoints(
                        userId: $matchPlayer->user_id,
                        changeAmount: -3,
                        category: PointTransaction::CAT_RANKED_MATCH_ENTRY_DEDUCTION,
                        description: sprintf('Ranked Match #%s entry deduction (-3 BP)', $lockedMatch->match_code),
                        matchId: $lockedMatch->id,
                        idempotencyKey: $idempotencyKey
                    );
                }

                $lockedMatch->battle_deducted = true;
            }

            $lockedMatch->status = 'READY';
            $lockedMatch->save();

            // Notify all participants
            $this->notificationService->sendMany(
                userIds: $lockedMatch->matchPlayers->pluck('user_id')->all(),
                type: 'MATCH_READY',
                title: 'Match is Ready!',
                message: sprintf('Match #%s has been confirmed and is ready to play at %s.', $lockedMatch->match_code, $lockedMatch->venue),
                data: ['match_id' => $lockedMatch->id, 'match_code' => $lockedMatch->match_code]
            );

            return true;
        });
    }

    /**
     * Validate scores and create a new score version.
     * Resets all approvals from previous versions.
     */
    public function submitScore(GameMatch $match, int $submitterId, array $sets): MatchScoreVersion
    {
        return DB::transaction(function () use ($match, $submitterId, $sets) {
            $lockedMatch = GameMatch::where('id', $match->id)->lockForUpdate()->first();

            if (!$lockedMatch->isPlayerInMatch($submitterId)) {
                throw new InvalidArgumentException('Only match participants can submit scores.');
            }

            if (in_array($lockedMatch->status, ['COMPLETED', 'CANCELLED', 'REJECTED'])) {
                throw new InvalidArgumentException(sprintf('Cannot submit score for match in %s status.', $lockedMatch->status));
            }

            // Validate badminton sets
            $validation = $this->validateScoreSets($sets);
            $winningTeam = $validation['winning_team'];
            $summary = $validation['summary'];

            // Increment version
            $newVersion = $lockedMatch->current_score_version + 1;
            $lockedMatch->current_score_version = $newVersion;
            $lockedMatch->winning_team = $winningTeam;
            $lockedMatch->status = 'WAITING_APPROVAL';
            $lockedMatch->save();

            // Save individual set scores
            foreach ($sets as $set) {
                MatchScore::create([
                    'match_id' => $lockedMatch->id,
                    'version' => $newVersion,
                    'set_number' => $set['set_number'],
                    'team_a_score' => $set['team_a_score'],
                    'team_b_score' => $set['team_b_score'],
                ]);
            }

            // Save version record
            $versionRecord = MatchScoreVersion::create([
                'match_id' => $lockedMatch->id,
                'version' => $newVersion,
                'submitted_by' => $submitterId,
                'winning_team' => $winningTeam,
                'summary' => $summary,
                'sets_data' => $sets,
            ]);

            // Score submitter approves their own submitted score version
            MatchScoreApproval::create([
                'match_id' => $lockedMatch->id,
                'version' => $newVersion,
                'user_id' => $submitterId,
                'status' => 'APPROVED',
            ]);

            // Notify all other participants to review and approve
            $otherParticipantIds = $lockedMatch->matchPlayers
                ->where('user_id', '!=', $submitterId)
                ->pluck('user_id')
                ->all();

            $this->notificationService->sendMany(
                userIds: $otherParticipantIds,
                type: 'SCORE_WAITING_APPROVAL',
                title: 'Match Score Awaiting Your Approval',
                message: sprintf('A score (%s) for match #%s was submitted and requires your approval.', $summary, $lockedMatch->match_code),
                data: ['match_id' => $lockedMatch->id, 'version' => $newVersion, 'summary' => $summary]
            );

            // In case of 1v1 where submitter approved, check if all approved (if somehow 1 player)
            if ($lockedMatch->areAllPlayersApprovedCurrentVersion()) {
                $this->completeMatchAndAwardPoints($lockedMatch);
            }

            return $versionRecord;
        });
    }

    /**
     * Participant approves the score version.
     */
    public function approveScore(GameMatch $match, int $userId, int $version): bool
    {
        return DB::transaction(function () use ($match, $userId, $version) {
            $lockedMatch = GameMatch::where('id', $match->id)->lockForUpdate()->first();

            if (!$lockedMatch->isPlayerInMatch($userId)) {
                throw new InvalidArgumentException('Only match participants can approve scores.');
            }

            if ($lockedMatch->current_score_version !== $version) {
                throw new InvalidArgumentException('You can only approve the latest score version.');
            }

            if ($lockedMatch->status !== 'WAITING_APPROVAL' && $lockedMatch->status !== 'DISPUTED') {
                throw new InvalidArgumentException(sprintf('Match is not awaiting approval (current status: %s).', $lockedMatch->status));
            }

            // Save approval
            MatchScoreApproval::updateOrCreate(
                [
                    'match_id' => $lockedMatch->id,
                    'version' => $version,
                    'user_id' => $userId,
                ],
                [
                    'status' => 'APPROVED',
                    'dispute_reason' => null,
                ]
            );

            // Notify other participants of approval
            $otherParticipantIds = $lockedMatch->matchPlayers
                ->where('user_id', '!=', $userId)
                ->pluck('user_id')
                ->all();

            $this->notificationService->sendMany(
                userIds: $otherParticipantIds,
                type: 'SCORE_APPROVED',
                title: 'Score Approved by Participant',
                message: sprintf('A participant approved the score for match #%s.', $lockedMatch->match_code),
                data: ['match_id' => $lockedMatch->id, 'version' => $version]
            );

            // Check if 100% unanimous approval reached
            if ($lockedMatch->areAllPlayersApprovedCurrentVersion()) {
                $this->completeMatchAndAwardPoints($lockedMatch);
            }

            return true;
        });
    }

    /**
     * Participant disputes the score.
     */
    public function disputeScore(GameMatch $match, int $userId, string $disputeReason): bool
    {
        return DB::transaction(function () use ($match, $userId, $disputeReason) {
            $lockedMatch = GameMatch::where('id', $match->id)->lockForUpdate()->first();

            if (!$lockedMatch->isPlayerInMatch($userId)) {
                throw new InvalidArgumentException('Only match participants can dispute scores.');
            }

            if (in_array($lockedMatch->status, ['COMPLETED', 'CANCELLED'])) {
                throw new InvalidArgumentException('Completed or cancelled matches cannot be disputed directly.');
            }

            // Record dispute approval entry
            MatchScoreApproval::updateOrCreate(
                [
                    'match_id' => $lockedMatch->id,
                    'version' => $lockedMatch->current_score_version,
                    'user_id' => $userId,
                ],
                [
                    'status' => 'DISPUTED',
                    'dispute_reason' => $disputeReason,
                ]
            );

            $lockedMatch->status = 'DISPUTED';
            $lockedMatch->dispute_reason = $disputeReason;
            $lockedMatch->disputed_by = $userId;
            $lockedMatch->save();

            // Notify all participants
            $this->notificationService->sendMany(
                userIds: $lockedMatch->matchPlayers->pluck('user_id')->all(),
                type: 'MATCH_DISPUTED',
                title: 'Match Result Disputed',
                message: sprintf('Match #%s has been disputed: "%s". An admin will review.', $lockedMatch->match_code, $disputeReason),
                data: ['match_id' => $lockedMatch->id, 'reason' => $disputeReason]
            );

            return true;
        });
    }

    /**
     * Complete match and award points atomically and idempotently.
     */
    public function completeMatchAndAwardPoints(GameMatch $match): bool
    {
        return DB::transaction(function () use ($match) {
            $lockedMatch = GameMatch::where('id', $match->id)->lockForUpdate()->first();

            // Idempotency check: points must be awarded only once
            if ($lockedMatch->points_awarded) {
                return true;
            }

            if (!$lockedMatch->winning_team) {
                throw new InvalidArgumentException('Winning team must be determined before completing match.');
            }

            $winningTeam = $lockedMatch->winning_team;
            $seasonId = $lockedMatch->season_id;
            $isSingles = ($lockedMatch->mode === 'SINGLES');

            foreach ($lockedMatch->matchPlayers as $player) {
                $isWinner = ($player->team === $winningTeam);
                $userId = $player->user_id;

                // Lock player balance
                $balance = PlayerPointBalance::where('user_id', $userId)->lockForUpdate()->first();
                if (!$balance) {
                    $balance = PlayerPointBalance::create(['user_id' => $userId]);
                    $balance = PlayerPointBalance::where('id', $balance->id)->lockForUpdate()->first();
                }

                if ($lockedMatch->type === 'BATTLE') {
                    $points = $isWinner ? 3 : 1;
                    $category = $isWinner ? PointTransaction::CAT_BATTLE_MATCH_WIN : PointTransaction::CAT_BATTLE_MATCH_LOSS;
                    $description = sprintf('Battle Match #%s (%s: %s)', $lockedMatch->match_code, $isWinner ? 'Win' : 'Loss', $isWinner ? '+3 BP' : '+1 BP');
                    $idempotencyKey = sprintf('battle_award_%d_%d', $lockedMatch->id, $userId);

                    $this->battlePointService->adjustPoints(
                        userId: $userId,
                        changeAmount: $points,
                        category: $category,
                        description: $description,
                        matchId: $lockedMatch->id,
                        idempotencyKey: $idempotencyKey
                    );

                    $player->points_earned = $points;
                    $player->point_type_earned = 'BATTLE';
                    $player->save();

                    // Update stats
                    $balance->battle_matches += 1;
                } else {
                    // RANKED
                    $points = $isWinner ? 3 : -1;
                    $category = $isWinner ? PointTransaction::CAT_RANKED_MATCH_WIN : PointTransaction::CAT_RANKED_MATCH_LOSS;
                    $description = sprintf('Ranked Match #%s (%s: %s)', $lockedMatch->match_code, $isWinner ? 'Win' : 'Loss', $isWinner ? '+3 RP' : '-1 RP');
                    $idempotencyKey = sprintf('ranked_award_%d_%d', $lockedMatch->id, $userId);

                    $this->rankPointService->adjustPoints(
                        userId: $userId,
                        changeAmount: $points,
                        category: $category,
                        description: $description,
                        matchId: $lockedMatch->id,
                        idempotencyKey: $idempotencyKey,
                        seasonId: $seasonId
                    );

                    $player->points_earned = $points;
                    $player->point_type_earned = 'RANK';
                    $player->save();

                    // Update stats
                    $balance->ranked_matches += 1;
                }

                // General statistics update
                $balance->total_matches += 1;
                if ($isWinner) {
                    $balance->total_wins += 1;
                    $balance->current_streak += 1;
                    if ($balance->current_streak > $balance->longest_streak) {
                        $balance->longest_streak = $balance->current_streak;
                    }
                    if ($isSingles) {
                        $balance->singles_wins += 1;
                    } else {
                        $balance->doubles_wins += 1;
                    }
                } else {
                    $balance->total_losses += 1;
                    $balance->current_streak = 0; // Reset streak
                    if ($isSingles) {
                        $balance->singles_losses += 1;
                    } else {
                        $balance->doubles_losses += 1;
                    }
                }
                $balance->save();

                // Season statistics update
                if ($seasonId) {
                    $seasonStat = SeasonPlayerStatistic::firstOrCreate(
                        ['season_id' => $seasonId, 'user_id' => $userId],
                        ['rank_points' => 0, 'battle_points' => 0, 'matches_played' => 0, 'wins' => 0, 'losses' => 0]
                    );
                    $seasonStat->increment('matches_played');
                    if ($isWinner) {
                        $seasonStat->increment('wins');
                    } else {
                        $seasonStat->increment('losses');
                    }
                }
            }

            $lockedMatch->status = 'COMPLETED';
            $lockedMatch->points_awarded = true;
            $lockedMatch->points_awarded_at = now();
            $lockedMatch->save();

            // Check and trigger Affiliate / Referral Rewards (100 BP each) on first match completion
            $this->processAffiliateRewardsOnFirstMatch($lockedMatch);

            // Notify all participants
            $this->notificationService->sendMany(
                userIds: $lockedMatch->matchPlayers->pluck('user_id')->all(),
                type: 'MATCH_COMPLETED',
                title: 'Match Completed & Points Awarded!',
                message: sprintf('Match #%s has been finalized. Points have been credited to your ledger.', $lockedMatch->match_code),
                data: ['match_id' => $lockedMatch->id, 'winning_team' => $winningTeam]
            );

            return true;
        });
    }

    /**
     * Process referral rewards (100 BP to referred player + 100 BP to referrer)
     * when a referred player completes their first match of any type.
     */
    protected function processAffiliateRewardsOnFirstMatch(GameMatch $match): void
    {
        foreach ($match->matchPlayers as $player) {
            $userId = $player->user_id;

            // Check if user has a pending referral
            $referral = Referral::where('referred_id', $userId)
                ->where('status', Referral::STATUS_PENDING)
                ->first();

            if (!$referral) {
                continue;
            }

            $referrerId = $referral->referrer_id;
            $referrer = User::find($referrerId);
            $referredUser = User::find($userId);

            if (!$referrer || !$referredUser) {
                continue;
            }

            // Mark referral as COMPLETED
            $referral->status = Referral::STATUS_COMPLETED;
            $referral->first_match_id = $match->id;
            $referral->rewarded_at = now();
            $referral->save();

            // 1. Award 100 BP to referred user (new player)
            $newPlayerKey = sprintf('affiliate_newplayer_%d_%d', $referral->id, $match->id);
            $this->battlePointService->adjustPoints(
                userId: $userId,
                changeAmount: 100,
                category: PointTransaction::CAT_AFFILIATE_REWARD,
                description: sprintf('Bonus Afiliasi: Menyelesaikan match pertama melalui undangan @%s (+100 BP)', $referrer->username),
                matchId: $match->id,
                idempotencyKey: $newPlayerKey
            );

            // 2. Award 100 BP to referrer (affiliator)
            $referrerKey = sprintf('affiliate_referrer_%d_%d', $referral->id, $match->id);
            $this->battlePointService->adjustPoints(
                userId: $referrerId,
                changeAmount: 100,
                category: PointTransaction::CAT_AFFILIATE_REWARD,
                description: sprintf('Bonus Afiliasi: Teman (@%s) menyelesaikan match pertamanya (+100 BP)', $referredUser->username),
                matchId: $match->id,
                idempotencyKey: $referrerKey
            );

            // 3. Send notifications
            $this->notificationService->send(
                userId: $userId,
                type: 'AFFILIATE_REWARD_RECEIVED',
                title: 'Bonus Afiliasi 100 Battle Points Diterima! 🎉',
                message: sprintf('Selamat! Anda menerima bonus selamat datang 100 Battle Points karena telah menyelesaikan pertandingan pertama Anda melalui undangan @%s.', $referrer->username),
                data: ['match_id' => $match->id, 'reward_points' => 100, 'referrer_id' => $referrerId]
            );

            $this->notificationService->send(
                userId: $referrerId,
                type: 'AFFILIATE_REWARD_RECEIVED',
                title: 'Bonus Afiliasi 100 Battle Points Berhasil Didapat! 🎁',
                message: sprintf('Selamat! Teman yang Anda undang, @%s (%s), telah menyelesaikan pertandingan pertamanya. Saldo Anda telah ditambahkan 100 Battle Points!', $referredUser->username, $referredUser->name),
                data: ['match_id' => $match->id, 'reward_points' => 100, 'referred_id' => $userId]
            );

            // 4. Log audit entry
            $this->auditLogService->log(
                action: 'AFFILIATE_REWARD_AWARDED',
                auditable: $referral,
                oldValues: ['status' => 'PENDING'],
                newValues: ['status' => 'COMPLETED', 'reward_points' => 100, 'match_id' => $match->id],
                reason: sprintf('Affiliate bonus 100 BP awarded to both @%s and @%s on match #%s completion', $referrer->username, $referredUser->username, $match->match_code)
            );
        }
    }

    /**
     * Cancel match and refund Battle Points if Ranked match was previously deducted.
     */
    public function cancelMatchAndRefund(GameMatch $match, string $reason, ?int $actorId = null): bool
    {
        return DB::transaction(function () use ($match, $reason, $actorId) {
            $lockedMatch = GameMatch::where('id', $match->id)->lockForUpdate()->first();

            if ($lockedMatch->status === 'COMPLETED') {
                throw new InvalidArgumentException('Cannot cancel an already completed match.');
            }

            // Refund Ranked entry points if previously deducted or match was confirmed/disputed
            $shouldRefundRanked = ($lockedMatch->type === 'RANKED') && (
                $lockedMatch->battle_deducted ||
                in_array($lockedMatch->status, ['READY', 'IN_PROGRESS', 'WAITING_APPROVAL', 'DISPUTED']) ||
                PointTransaction::where('match_id', $lockedMatch->id)
                    ->where('category', PointTransaction::CAT_RANKED_MATCH_ENTRY_DEDUCTION)
                    ->exists()
            );

            if ($shouldRefundRanked) {
                foreach ($lockedMatch->matchPlayers as $player) {
                    $idempotencyKey = sprintf('refund_%d_%d', $lockedMatch->id, $player->user_id);
                    $alreadyRefunded = PointTransaction::where('match_id', $lockedMatch->id)
                        ->where('user_id', $player->user_id)
                        ->where('category', PointTransaction::CAT_RANKED_MATCH_REFUND)
                        ->exists();

                    if (!$alreadyRefunded) {
                        $this->battlePointService->adjustPoints(
                            userId: $player->user_id,
                            changeAmount: 3,
                            category: PointTransaction::CAT_RANKED_MATCH_REFUND,
                            description: sprintf('Pengembalian Pertandingan Ranked #%s dibatalkan (+3 BP)', $lockedMatch->match_code),
                            matchId: $lockedMatch->id,
                            idempotencyKey: $idempotencyKey,
                            actorId: $actorId
                        );
                    }
                }
                $lockedMatch->battle_deducted = false;
            }

            $lockedMatch->status = 'CANCELLED';
            $lockedMatch->cancelled_reason = $reason;
            $lockedMatch->save();

            $this->auditLogService->log(
                action: 'MATCH_CANCELLED',
                auditable: $lockedMatch,
                oldValues: ['status' => $match->status],
                newValues: ['status' => 'CANCELLED', 'reason' => $reason],
                reason: $reason,
                userId: $actorId
            );

            // Notify participants
            $this->notificationService->sendMany(
                userIds: $lockedMatch->matchPlayers->pluck('user_id')->all(),
                type: 'MATCH_CANCELLED',
                title: 'Match Cancelled',
                message: sprintf('Match #%s was cancelled. Reason: %s', $lockedMatch->match_code, $reason),
                data: ['match_id' => $lockedMatch->id]
            );

            return true;
        });
    }

    /**
     * Validate badminton score sets and determine winner.
     */
    public function validateScoreSets(array $sets): array
    {
        if (count($sets) < 2 || count($sets) > 3) {
            throw new InvalidArgumentException('A match must have either 2 or 3 sets.');
        }

        $teamAWins = 0;
        $teamBWins = 0;
        $summaries = [];

        foreach ($sets as $index => $set) {
            $setNum = $set['set_number'] ?? ($index + 1);
            $scoreA = (int) ($set['team_a_score'] ?? 0);
            $scoreB = (int) ($set['team_b_score'] ?? 0);

            if ($scoreA < 0 || $scoreB < 0) {
                throw new InvalidArgumentException("Set #{$setNum} scores must be non-negative.");
            }

            // In standard badminton, a set is won when a team reaches 21 with a 2-point lead, or first to 30.
            $maxScore = max($scoreA, $scoreB);
            $minScore = min($scoreA, $scoreB);
            $diff = $maxScore - $minScore;

            if ($maxScore < 21) {
                throw new InvalidArgumentException("Set #{$setNum} has invalid score: winning score must be at least 21.");
            }

            if ($maxScore == 21 && $diff < 2) {
                throw new InvalidArgumentException("Set #{$setNum} has invalid score: winner must lead by at least 2 points.");
            }

            if ($maxScore > 21 && $maxScore < 30 && $diff !== 2) {
                throw new InvalidArgumentException("Set #{$setNum} deuce score must have exactly a 2-point difference (or 30-29 max cap).");
            }

            if ($maxScore > 30) {
                throw new InvalidArgumentException("Set #{$setNum} maximum score is capped at 30.");
            }

            if ($scoreA > $scoreB) {
                $teamAWins++;
            } else {
                $teamBWins++;
            }

            $summaries[] = "{$scoreA}-{$scoreB}";

            // If 2 sets played and a team won 2-0, a 3rd set must not be played
            if ($setNum === 2 && ($teamAWins === 2 || $teamBWins === 2) && count($sets) === 3) {
                throw new InvalidArgumentException('Match ended 2-0 in two sets; a third set cannot be submitted.');
            }
        }

        if ($teamAWins === $teamBWins) {
            throw new InvalidArgumentException('Match results are tied. A clear winner must be established.');
        }

        $winningTeam = ($teamAWins > $teamBWins) ? 'TEAM_A' : 'TEAM_B';

        return [
            'winning_team' => $winningTeam,
            'summary' => implode(', ', $summaries),
            'sets' => $sets,
        ];
    }
}
