<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\MatchInvitation;
use App\Models\MatchPlayer;
use App\Models\Season;
use App\Models\User;
use App\Services\MatchResultService;
use App\Services\NotificationService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class MatchController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected MatchResultService $matchResultService,
        protected NotificationService $notificationService
    ) {}

    /**
     * List matches with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $type = $request->query('type');
        $mode = $request->query('mode');
        $myMatches = $request->boolean('my_matches', false);
        $perPage = (int) $request->query('per_page', 15);

        $query = GameMatch::with([
            'creator.profile',
            'matchPlayers.user.profile',
            'scores',
            'approvals.user.profile',
        ])
        ->orderByDesc('scheduled_at');

        $user = $request->user('sanctum') ?? Auth::user();

        if ($myMatches) {
            $userId = $user?->id ?? ($request->query('user_id') ? (int) $request->query('user_id') : null);
            if (!$userId) {
                return $this->success([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'total' => 0,
                ], 'Silakan login untuk melihat pertandingan Anda.');
            }

            $query->where(function ($q) use ($userId) {
                $q->where('creator_id', $userId)
                  ->orWhereHas('matchPlayers', function ($pq) use ($userId) {
                      $pq->where('user_id', $userId);
                  });
            });
        }

        if ($status) {
            $query->where('status', strtoupper($status));
        }

        if ($type) {
            $query->where('type', strtoupper($type));
        }

        if ($mode) {
            $query->where('mode', strtoupper($mode));
        }

        $matches = $query->paginate($perPage);

        return $this->success($matches, 'Matches retrieved successfully');
    }

    /**
     * Create a new match.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->status === 'suspended') {
            return $this->error('Suspended accounts cannot create matches.', 403);
        }

        $validated = $request->validate([
            'type' => ['required', 'in:BATTLE,RANKED'],
            'mode' => ['required', 'in:SINGLES,DOUBLES'],
            'venue' => ['required', 'string', 'max:150'],
            'scheduled_at' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:500'],
            'live_stream_url' => ['nullable', 'string', 'max:500'],
            'teammate_id' => ['nullable', 'exists:users,id'],
            'opponent_1_id' => ['required', 'exists:users,id'],
            'opponent_2_id' => ['nullable', 'exists:users,id'],
        ]);

        $mode = $validated['mode'];
        $creatorId = $user->id;

        // Mode validation
        if ($mode === 'SINGLES') {
            if (empty($validated['opponent_1_id'])) {
                return $this->error('An opponent is required for singles matches.');
            }
            if ((int) $validated['opponent_1_id'] === $creatorId) {
                return $this->error('You cannot play against yourself.');
            }
            $allParticipantIds = [$creatorId, (int) $validated['opponent_1_id']];
        } else {
            // DOUBLES
            if (empty($validated['teammate_id']) || empty($validated['opponent_1_id']) || empty($validated['opponent_2_id'])) {
                return $this->error('Doubles match requires 1 partner and 2 opponents.');
            }
            if ((int) $validated['teammate_id'] === $creatorId) {
                return $this->error('You cannot pick yourself as your doubles partner.');
            }
            if ((int) $validated['opponent_1_id'] === $creatorId || (int) $validated['opponent_2_id'] === $creatorId) {
                return $this->error('You cannot pick yourself as an opponent.');
            }
            if ((int) $validated['opponent_1_id'] === (int) $validated['opponent_2_id']) {
                return $this->error('Opponent 1 and Opponent 2 must be different players.');
            }
            if ((int) $validated['teammate_id'] === (int) $validated['opponent_1_id'] || (int) $validated['teammate_id'] === (int) $validated['opponent_2_id']) {
                return $this->error('Your partner cannot also be selected as an opponent.');
            }
            $allParticipantIds = [
                $creatorId,
                (int) $validated['teammate_id'],
                (int) $validated['opponent_1_id'],
                (int) $validated['opponent_2_id'],
            ];
        }

        // Validate no duplicate players
        if (count($allParticipantIds) !== count(array_unique($allParticipantIds))) {
            return $this->error('A player cannot participate multiple times in the same match.');
        }

        // Check active season
        $activeSeason = Season::where('is_active', true)->first();
        if (!$activeSeason) {
            $activeSeason = Season::create([
                'name' => 'Inaugural Season 2026',
                'code' => 'S1-2026',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addMonths(6)->toDateString(),
                'is_active' => true,
                'status' => 'active',
            ]);
        }

        // If Ranked match, pre-check creator balance (5 BP if in team, 3 BP if solo)
        if ($validated['type'] === 'RANKED') {
            $creatorBp = $user->pointBalance?->battle_points ?? 0;
            $requiredBp = $user->isInTeam() ? 5 : 3;
            if ($creatorBp < $requiredBp) {
                return $this->error("You need at least {$requiredBp} Battle Points to create a Ranked Match (Current: {$creatorBp} BP" . ($user->isInTeam() ? ', Team Member rate: 5 BP' : '') . ").", 422);
            }
        }

        return DB::transaction(function () use ($validated, $user, $allParticipantIds, $mode, $activeSeason) {
            $matchCode = sprintf('M-%s-%s', date('Ymd'), strtoupper(Str::random(5)));

            $match = GameMatch::create([
                'match_code' => $matchCode,
                'season_id' => $activeSeason->id,
                'creator_id' => $user->id,
                'type' => $validated['type'],
                'mode' => $validated['mode'],
                'venue' => $validated['venue'],
                'scheduled_at' => $validated['scheduled_at'],
                'description' => $validated['description'] ?? null,
                'live_stream_url' => $validated['live_stream_url'] ?? null,
                'status' => 'PENDING_ACCEPTANCE',
                'current_score_version' => 0,
            ]);

            // Add Creator as Team A Slot 1 (Automatically Accepted)
            MatchPlayer::create([
                'match_id' => $match->id,
                'user_id' => $user->id,
                'team' => 'TEAM_A',
                'slot' => 1,
                'invitation_status' => 'ACCEPTED',
                'invitation_responded_at' => now(),
            ]);

            // Add other participants
            if ($mode === 'SINGLES') {
                $opponentId = (int) $validated['opponent_1_id'];
                MatchPlayer::create([
                    'match_id' => $match->id,
                    'user_id' => $opponentId,
                    'team' => 'TEAM_B',
                    'slot' => 1,
                    'invitation_status' => 'PENDING',
                ]);

                MatchInvitation::create([
                    'match_id' => $match->id,
                    'invited_user_id' => $opponentId,
                    'invited_by_user_id' => $user->id,
                    'team' => 'TEAM_B',
                    'status' => 'PENDING',
                ]);

                $this->notificationService->send(
                    userId: $opponentId,
                    type: 'INVITATION_RECEIVED',
                    title: 'New Match Invitation',
                    message: sprintf('%s invited you to a %s Singles match at %s.', $user->name, $validated['type'], $validated['venue']),
                    data: ['match_id' => $match->id, 'type' => $validated['type']]
                );
            } else {
                // DOUBLES: Teammate (Team A slot 2)
                $teammateId = (int) $validated['teammate_id'];
                MatchPlayer::create([
                    'match_id' => $match->id,
                    'user_id' => $teammateId,
                    'team' => 'TEAM_A',
                    'slot' => 2,
                    'invitation_status' => 'PENDING',
                ]);
                MatchInvitation::create([
                    'match_id' => $match->id,
                    'invited_user_id' => $teammateId,
                    'invited_by_user_id' => $user->id,
                    'team' => 'TEAM_A',
                    'status' => 'PENDING',
                ]);
                $this->notificationService->send(
                    userId: $teammateId,
                    type: 'INVITATION_RECEIVED',
                    title: 'New Match Invitation (Partner)',
                    message: sprintf('%s invited you as teammate for a %s Doubles match at %s.', $user->name, $validated['type'], $validated['venue']),
                    data: ['match_id' => $match->id, 'type' => $validated['type']]
                );

                // Opponent 1 (Team B slot 1)
                $opp1Id = (int) $validated['opponent_1_id'];
                MatchPlayer::create([
                    'match_id' => $match->id,
                    'user_id' => $opp1Id,
                    'team' => 'TEAM_B',
                    'slot' => 1,
                    'invitation_status' => 'PENDING',
                ]);
                MatchInvitation::create([
                    'match_id' => $match->id,
                    'invited_user_id' => $opp1Id,
                    'invited_by_user_id' => $user->id,
                    'team' => 'TEAM_B',
                    'status' => 'PENDING',
                ]);
                $this->notificationService->send(
                    userId: $opp1Id,
                    type: 'INVITATION_RECEIVED',
                    title: 'New Match Invitation',
                    message: sprintf('%s invited you to a %s Doubles match at %s.', $user->name, $validated['type'], $validated['venue']),
                    data: ['match_id' => $match->id, 'type' => $validated['type']]
                );

                // Opponent 2 (Team B slot 2)
                $opp2Id = (int) $validated['opponent_2_id'];
                MatchPlayer::create([
                    'match_id' => $match->id,
                    'user_id' => $opp2Id,
                    'team' => 'TEAM_B',
                    'slot' => 2,
                    'invitation_status' => 'PENDING',
                ]);
                MatchInvitation::create([
                    'match_id' => $match->id,
                    'invited_user_id' => $opp2Id,
                    'invited_by_user_id' => $user->id,
                    'team' => 'TEAM_B',
                    'status' => 'PENDING',
                ]);
                $this->notificationService->send(
                    userId: $opp2Id,
                    type: 'INVITATION_RECEIVED',
                    title: 'New Match Invitation',
                    message: sprintf('%s invited you to a %s Doubles match at %s.', $user->name, $validated['type'], $validated['venue']),
                    data: ['match_id' => $match->id, 'type' => $validated['type']]
                );
            }

            $match->load(['matchPlayers.user.profile', 'creator.profile']);

            return $this->success($match, 'Match created and invitations sent successfully', 201);
        });
    }

    /**
     * Show match details.
     */
    public function show(int $id): JsonResponse
    {
        $match = GameMatch::with([
            'creator.profile',
            'disputer.profile',
            'matchPlayers.user.profile',
            'matchPlayers.user.pointBalance',
            'scores',
            'scoreVersions.submitter',
            'approvals.user.profile',
            'invitations.invitedUser',
            'pointTransactions.user',
            'comments.user.profile',
        ])->findOrFail($id);

        return $this->success($match, 'Match details retrieved successfully');
    }

    /**
     * Accept a match invitation.
     */
    public function acceptInvitation(int $id): JsonResponse
    {
        $userId = Auth::id();
        $match = GameMatch::with('matchPlayers.user')->findOrFail($id);

        $matchPlayer = $match->matchPlayers->where('user_id', $userId)->first();
        if (!$matchPlayer) {
            return $this->error('You are not a participant in this match.', 403);
        }

        if ($matchPlayer->invitation_status === 'ACCEPTED') {
            return $this->success($match, 'Invitation is already accepted.');
        }

        try {
            DB::transaction(function () use ($match, $matchPlayer, $userId) {
                $matchPlayer->invitation_status = 'ACCEPTED';
                $matchPlayer->invitation_responded_at = now();
                $matchPlayer->save();

                MatchInvitation::where('match_id', $match->id)
                    ->where('invited_user_id', $userId)
                    ->update([
                        'status' => 'ACCEPTED',
                        'responded_at' => now(),
                    ]);

                // Notify creator
                $this->notificationService->send(
                    userId: $match->creator_id,
                    type: 'INVITATION_ACCEPTED',
                    title: 'Invitation Accepted',
                    message: sprintf('%s accepted the invitation for match #%s.', Auth::user()->name, $match->match_code),
                    data: ['match_id' => $match->id]
                );

                // Check if all participants accepted
                if ($match->areAllPlayersAccepted()) {
                    $this->matchResultService->validateAndSetReady($match);
                }
            });

            $match->refresh()->load(['matchPlayers.user.profile', 'scores', 'approvals.user.profile']);

            return $this->success($match, 'Invitation accepted successfully.');
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Reject a match invitation.
     */
    public function rejectInvitation(Request $request, int $id): JsonResponse
    {
        $userId = Auth::id();
        $reason = $request->input('reason', 'Invitation declined');
        $match = GameMatch::with('matchPlayers')->findOrFail($id);

        $matchPlayer = $match->matchPlayers->where('user_id', $userId)->first();
        if (!$matchPlayer) {
            return $this->error('You are not a participant in this match.', 403);
        }

        DB::transaction(function () use ($match, $matchPlayer, $userId, $reason) {
            $matchPlayer->invitation_status = 'REJECTED';
            $matchPlayer->invitation_responded_at = now();
            $matchPlayer->save();

            MatchInvitation::where('match_id', $match->id)
                ->where('invited_user_id', $userId)
                ->update([
                    'status' => 'REJECTED',
                    'response_note' => $reason,
                    'responded_at' => now(),
                ]);

            $match->status = 'REJECTED';
            $match->cancelled_reason = sprintf('Invitation rejected by %s (%s)', Auth::user()->name, $reason);
            $match->save();

            // Notify creator and other participants
            $this->notificationService->sendMany(
                userIds: $match->matchPlayers->pluck('user_id')->all(),
                type: 'INVITATION_REJECTED',
                title: 'Match Invitation Rejected',
                message: sprintf('%s rejected the invitation for match #%s. The match has been closed.', Auth::user()->name, $match->match_code),
                data: ['match_id' => $match->id]
            );
        });

        return $this->success($match, 'Invitation rejected and match cancelled.');
    }

    /**
     * Submit or update match scores.
     */
    public function submitScore(Request $request, int $id): JsonResponse
    {
        $match = GameMatch::with('matchPlayers')->findOrFail($id);

        if (is_string($request->input('sets'))) {
            $decoded = json_decode($request->input('sets'), true);
            if (is_array($decoded)) {
                $request->merge(['sets' => $decoded]);
            }
        }

        $validated = $request->validate([
            'sets' => ['required', 'array', 'min:2', 'max:3'],
            'sets.*.set_number' => ['required', 'integer', 'between:1,3'],
            'sets.*.team_a_score' => ['required', 'integer', 'min:0', 'max:30'],
            'sets.*.team_b_score' => ['required', 'integer', 'min:0', 'max:30'],
            'match_photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'match_photo_url' => ['nullable', 'string', 'max:500'],
        ]);

        // Requirement 1: ketika Submit Match Score wajib juga upload 1 foto bersama untuk para pemain
        if (!$request->hasFile('match_photo') && !$request->filled('match_photo_url')) {
            return $this->error('Wajib mengunggah 1 foto bersama untuk para pemain setelah pertandingan.', 422);
        }

        $photoUrl = null;
        if ($request->hasFile('match_photo')) {
            $path = $request->file('match_photo')->store('match_photos', 'public');
            $photoUrl = '/storage/' . $path;
        } elseif ($request->filled('match_photo_url')) {
            $photoUrl = $request->input('match_photo_url');
        }

        try {
            $versionRecord = $this->matchResultService->submitScore(
                match: $match,
                submitterId: Auth::id(),
                sets: $validated['sets'],
                photoUrl: $photoUrl
            );

            $match->refresh()->load([
                'creator.profile',
                'disputer.profile',
                'matchPlayers.user.profile',
                'matchPlayers.user.pointBalance',
                'scores',
                'scoreVersions.submitter',
                'approvals.user.profile',
                'invitations.invitedUser',
                'pointTransactions.user',
                'comments.user.profile',
            ]);

            return $this->success([
                'match' => $match,
                'version' => $versionRecord,
            ], 'Skor pertandingan dan foto bersama pemain berhasil disubmit, menunggu persetujuan lawan.');
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Participant approves the score version.
     */
    public function approveScore(Request $request, int $id): JsonResponse
    {
        $match = GameMatch::with('matchPlayers')->findOrFail($id);

        $validated = $request->validate([
            'version' => ['required', 'integer'],
        ]);

        try {
            $this->matchResultService->approveScore(
                match: $match,
                userId: Auth::id(),
                version: (int) $validated['version']
            );

            $match->refresh()->load([
                'creator.profile',
                'disputer.profile',
                'matchPlayers.user.profile',
                'matchPlayers.user.pointBalance',
                'scores',
                'scoreVersions.submitter',
                'approvals.user.profile',
                'invitations.invitedUser',
                'pointTransactions.user',
                'comments.user.profile',
            ]);

            return $this->success($match, 'Score approved successfully.');
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Participant disputes the score result.
     */
    public function disputeScore(Request $request, int $id): JsonResponse
    {
        $match = GameMatch::with('matchPlayers')->findOrFail($id);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        try {
            $this->matchResultService->disputeScore(
                match: $match,
                userId: Auth::id(),
                disputeReason: $validated['reason']
            );

            $match->refresh()->load([
                'creator.profile',
                'disputer.profile',
                'matchPlayers.user.profile',
                'matchPlayers.user.pointBalance',
                'scores',
                'scoreVersions.submitter',
                'approvals.user.profile',
                'invitations.invitedUser',
                'pointTransactions.user',
                'comments.user.profile',
            ]);

            return $this->success($match, 'Dispute recorded. An administrator has been notified.');
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Cancel match.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $match = GameMatch::with('matchPlayers')->findOrFail($id);
        $user = Auth::user();

        if ($match->creator_id !== $user->id && !$user->isAdmin()) {
            return $this->error('Only the match creator or an admin can cancel this match.', 403);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->matchResultService->cancelMatchAndRefund(
                match: $match,
                reason: $validated['reason'],
                actorId: $user->id
            );

            $match->refresh();

            return $this->success($match, 'Match cancelled successfully.');
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Get match history and audit timeline.
     */
    public function history(int $id): JsonResponse
    {
        $match = GameMatch::with([
            'creator.profile',
            'matchPlayers.user.profile',
            'scores',
            'scoreVersions.submitter',
            'approvals.user',
            'invitations.invitedUser',
            'pointTransactions.user',
        ])->findOrFail($id);

        return $this->success($match, 'Match full timeline history retrieved.');
    }
}
