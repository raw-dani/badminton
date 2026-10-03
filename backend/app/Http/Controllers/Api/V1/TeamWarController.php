<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\MatchPlayer;
use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use App\Models\Season;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamSeasonScore;
use App\Models\TeamWar;
use App\Services\BattlePointService;
use App\Services\NotificationService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TeamWarController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected NotificationService $notificationService,
        protected BattlePointService $battlePointService
    ) {}

    /**
     * Get list of team wars.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $teamId = $request->query('team_id');
        $status = $request->query('status');
        $myWarsOnly = $request->boolean('my_wars_only', false);

        $query = TeamWar::with([
            'challengerTeam',
            'challengedTeam',
            'winnerTeam',
            'creator.profile',
        ])->orderByDesc('id');

        if ($myWarsOnly && $user) {
            $userTeamId = TeamMember::where('user_id', $user->id)
                ->where('status', 'ACTIVE')
                ->value('team_id');

            if ($userTeamId) {
                $query->where(function ($q) use ($userTeamId) {
                    $q->where('challenger_team_id', $userTeamId)
                      ->orWhere('challenged_team_id', $userTeamId);
                });
            } else {
                return $this->success([], 'User is not in any team');
            }
        } elseif ($teamId) {
            $query->where(function ($q) use ($teamId) {
                $q->where('challenger_team_id', $teamId)
                  ->orWhere('challenged_team_id', $teamId);
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        $wars = $query->paginate((int) $request->query('per_page', 15));

        return $this->success($wars, 'Team wars retrieved successfully');
    }

    /**
     * Get detailed information for a specific team war.
     */
    public function show(int $id): JsonResponse
    {
        $war = TeamWar::with([
            'challengerTeam.activeMembers.user.profile',
            'challengedTeam.activeMembers.user.profile',
            'winnerTeam',
            'creator.profile',
            'matches' => function ($q) {
                $q->with([
                    'matchPlayers.user.profile',
                    'matchScores',
                    'approvals',
                ])->orderBy('id');
            }
        ])->findOrFail($id);

        $user = Auth::user();
        $canManage = false;
        $isChallengerLeader = false;
        $isChallengedLeader = false;

        if ($user) {
            $isChallengerLeader = $war->challengerTeam->isLeaderOrAdmin($user->id);
            $isChallengedLeader = $war->challengedTeam->isLeaderOrAdmin($user->id);
            $canManage = $isChallengerLeader || $isChallengedLeader;
        }

        return $this->success([
            'war' => $war,
            'can_manage' => $canManage,
            'is_challenger_leader' => $isChallengerLeader,
            'is_challenged_leader' => $isChallengedLeader,
        ], 'Team war details retrieved');
    }

    /**
     * Create a new team war challenge.
     * Only LEADER or ADMIN can challenge another team.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $membership = TeamMember::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$membership || !in_array($membership->role, ['LEADER', 'ADMIN'])) {
            return $this->error('Hanya Kapten atau Admin Tim yang dapat mengajukan War Team.', 403);
        }

        $validated = $request->validate([
            'challenged_team_id' => 'required|integer|exists:teams,id|different:' . $membership->team_id,
            'total_matches' => 'required|integer|min:1|max:20',
            'scheduled_at' => 'required|date|after:now',
            'venue' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $challengedTeam = Team::where('id', $validated['challenged_team_id'])
            ->where('status', 'ACTIVE')
            ->first();

        if (!$challengedTeam) {
            return $this->error('Tim lawan tidak ditemukan atau tidak aktif.', 404);
        }

        $activeSeason = Season::where('is_active', true)->first();
        if (!$activeSeason) {
            $activeSeason = Season::create([
                'name' => 'Inaugural Season 2026',
                'code' => 'SEASON-2026',
                'start_date' => now()->startOfYear(),
                'end_date' => now()->endOfYear(),
                'is_active' => true,
                'status' => 'active',
            ]);
        }

        $warCode = 'WAR-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        $war = TeamWar::create([
            'war_code' => $warCode,
            'season_id' => $activeSeason->id,
            'challenger_team_id' => $membership->team_id,
            'challenged_team_id' => $challengedTeam->id,
            'created_by_user_id' => $user->id,
            'total_matches' => $validated['total_matches'],
            'scheduled_at' => $validated['scheduled_at'],
            'venue' => $validated['venue'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'PENDING',
        ]);

        // Notify challenged team leader & admins
        $challengedAdmins = TeamMember::where('team_id', $challengedTeam->id)
            ->where('status', 'ACTIVE')
            ->whereIn('role', ['LEADER', 'ADMIN'])
            ->pluck('user_id')
            ->all();

        $challengerTeamName = Team::where('id', $membership->team_id)->value('name');

        $this->notificationService->sendMany(
            userIds: $challengedAdmins,
            type: 'TEAM_WAR_CHALLENGE',
            title: 'Tantangan War Team Baru!',
            message: sprintf('Tim "%s" telah menantang tim Anda untuk War Team (%d Match) pada %s di %s.', $challengerTeamName, $war->total_matches, $war->scheduled_at->format('d M Y H:i'), $war->venue),
            data: ['war_id' => $war->id, 'war_code' => $war->war_code]
        );

        return $this->success($war->load(['challengerTeam', 'challengedTeam']), 'Tantangan War Team berhasil diajukan.', 201);
    }

    /**
     * Accept a team war challenge.
     * Only LEADER or ADMIN of challenged team can accept.
     */
    public function accept(int $id): JsonResponse
    {
        $user = Auth::user();
        $war = TeamWar::with(['challengerTeam', 'challengedTeam'])->findOrFail($id);

        if ($war->status !== 'PENDING') {
            return $this->error('Tantangan war ini tidak dalam status PENDING.', 422);
        }

        if (!$war->challengedTeam->isLeaderOrAdmin($user->id)) {
            return $this->error('Hanya Kapten atau Admin Tim yang ditantang yang dapat menerima tantangan war.', 403);
        }

        $war->status = 'ACCEPTED';
        $war->accepted_at = now();
        $war->save();

        // Notify challenger team leader & admins
        $challengerAdmins = TeamMember::where('team_id', $war->challenger_team_id)
            ->where('status', 'ACTIVE')
            ->whereIn('role', ['LEADER', 'ADMIN'])
            ->pluck('user_id')
            ->all();

        $this->notificationService->sendMany(
            userIds: $challengerAdmins,
            type: 'TEAM_WAR_ACCEPTED',
            title: 'Tantangan War Diterima!',
            message: sprintf('Tim "%s" telah menerima tantangan War Team (%s)! Pertandingan dijadwalkan pada %s.', $war->challengedTeam->name, $war->war_code, $war->scheduled_at ? $war->scheduled_at->format('d M Y H:i') : 'jadwal yang disepakati'),
            data: ['war_id' => $war->id, 'war_code' => $war->war_code]
        );

        return $this->success($war, 'Tantangan War Team berhasil diterima.');
    }

    /**
     * Reject a team war challenge.
     * Only LEADER or ADMIN of challenged team can reject.
     */
    public function reject(int $id): JsonResponse
    {
        $user = Auth::user();
        $war = TeamWar::with(['challengerTeam', 'challengedTeam'])->findOrFail($id);

        if ($war->status !== 'PENDING') {
            return $this->error('Tantangan war ini tidak dalam status PENDING.', 422);
        }

        if (!$war->challengedTeam->isLeaderOrAdmin($user->id)) {
            return $this->error('Hanya Kapten atau Admin Tim yang ditantang yang dapat menolak tantangan war.', 403);
        }

        $war->status = 'REJECTED';
        $war->save();

        // Notify challenger team leader & admins
        $challengerAdmins = TeamMember::where('team_id', $war->challenger_team_id)
            ->where('status', 'ACTIVE')
            ->whereIn('role', ['LEADER', 'ADMIN'])
            ->pluck('user_id')
            ->all();

        $this->notificationService->sendMany(
            userIds: $challengerAdmins,
            type: 'TEAM_WAR_REJECTED',
            title: 'Tantangan War Ditolak',
            message: sprintf('Tim "%s" menolak tantangan War Team (%s).', $war->challengedTeam->name, $war->war_code),
            data: ['war_id' => $war->id]
        );

        return $this->success($war, 'Tantangan War Team telah ditolak.');
    }

    /**
     * Cancel a team war challenge.
     * Only LEADER or ADMIN of challenger team can cancel.
     */
    public function cancel(int $id): JsonResponse
    {
        $user = Auth::user();
        $war = TeamWar::with(['challengerTeam'])->findOrFail($id);

        if ($war->status !== 'PENDING') {
            return $this->error('Hanya tantangan war dengan status PENDING yang dapat dibatalkan.', 422);
        }

        if (!$war->challengerTeam->isLeaderOrAdmin($user->id)) {
            return $this->error('Hanya Kapten atau Admin Tim penantang yang dapat membatalkan tantangan war.', 403);
        }

        $war->status = 'CANCELLED';
        $war->save();

        return $this->success($war, 'Tantangan War Team berhasil dibatalkan.');
    }

    /**
     * Update schedule or venue for an accepted/pending war.
     * Kapten or Admin of either team can adjust.
     */
    public function updateSchedule(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $war = TeamWar::with(['challengerTeam', 'challengedTeam'])->findOrFail($id);

        if (!in_array($war->status, ['PENDING', 'ACCEPTED', 'IN_PROGRESS'])) {
            return $this->error('Jadwal war ini sudah tidak dapat diubah.', 422);
        }

        $isChallengerLeader = $war->challengerTeam->isLeaderOrAdmin($user->id);
        $isChallengedLeader = $war->challengedTeam->isLeaderOrAdmin($user->id);

        if (!$isChallengerLeader && !$isChallengedLeader) {
            return $this->error('Hanya Kapten atau Admin dari tim yang bertanding yang dapat mengatur jadwal war.', 403);
        }

        $validated = $request->validate([
            'scheduled_at' => 'required|date',
            'venue' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $war->update([
            'scheduled_at' => $validated['scheduled_at'],
            'venue' => $validated['venue'],
            'notes' => $validated['notes'] ?? $war->notes,
        ]);

        return $this->success($war, 'Jadwal dan lokasi War Team berhasil diperbarui.');
    }

    /**
     * Create / schedule a match within a Team War.
     * Kapten or Admin of either team can arrange matches.
     */
    public function createMatch(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $war = TeamWar::with(['challengerTeam', 'challengedTeam'])->findOrFail($id);

        if (!in_array($war->status, ['ACCEPTED', 'IN_PROGRESS'])) {
            return $this->error('Pertandingan hanya dapat ditambahkan pada war yang berstatus ACCEPTED atau IN_PROGRESS.', 422);
        }

        $isChallengerLeader = $war->challengerTeam->isLeaderOrAdmin($user->id);
        $isChallengedLeader = $war->challengedTeam->isLeaderOrAdmin($user->id);

        if (!$isChallengerLeader && !$isChallengedLeader) {
            return $this->error('Hanya Kapten atau Admin tim yang terlibat yang dapat menambahkan pertandingan war.', 403);
        }

        $currentMatchCount = GameMatch::where('team_war_id', $war->id)->count();
        if ($currentMatchCount >= $war->total_matches) {
            return $this->error("Kapasitas pertandingan untuk war ini sudah mencapai batas maksimum ({$war->total_matches} match).", 422);
        }

        $validated = $request->validate([
            'type' => 'required|in:BATTLE,RANKED',
            'mode' => 'required|in:SINGLES,DOUBLES',
            'scheduled_at' => 'nullable|date',
            'venue' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'team_a_player_ids' => 'required|array',
            'team_a_player_ids.*' => 'required|integer|exists:users,id',
            'team_b_player_ids' => 'required|array',
            'team_b_player_ids.*' => 'required|integer|exists:users,id',
        ]);

        $mode = $validated['mode'];
        $expectedPlayerCount = ($mode === 'SINGLES') ? 1 : 2;

        if (count($validated['team_a_player_ids']) !== $expectedPlayerCount) {
            return $this->error("Mode {$mode} membutuhkan tepat {$expectedPlayerCount} pemain untuk Tim Penantang.", 422);
        }

        if (count($validated['team_b_player_ids']) !== $expectedPlayerCount) {
            return $this->error("Mode {$mode} membutuhkan tepat {$expectedPlayerCount} pemain untuk Tim Lawan.", 422);
        }

        // Verify players belong to corresponding teams
        foreach ($validated['team_a_player_ids'] as $pId) {
            if (!$war->challengerTeam->isMember($pId)) {
                return $this->error("Pemain ID {$pId} bukan anggota aktif dari tim penantang ({$war->challengerTeam->name}).", 422);
            }
        }

        foreach ($validated['team_b_player_ids'] as $pId) {
            if (!$war->challengedTeam->isMember($pId)) {
                return $this->error("Pemain ID {$pId} bukan anggota aktif dari tim lawan ({$war->challengedTeam->name}).", 422);
            }
        }

        // Check duplicate players
        $allPlayers = array_merge($validated['team_a_player_ids'], $validated['team_b_player_ids']);
        if (count($allPlayers) !== count(array_unique($allPlayers))) {
            return $this->error('Pemain tidak boleh ganda dalam pertandingan yang sama.', 422);
        }

        // If RANKED, verify entry fee (5 BP for team members)
        $rankedEntryFee = 5;
        if ($validated['type'] === 'RANKED') {
            foreach ($allPlayers as $pId) {
                $bal = PlayerPointBalance::where('user_id', $pId)->value('battle_points') ?? 0;
                if ($bal < $rankedEntryFee) {
                    return $this->error("Pemain ID {$pId} tidak memiliki cukup Battle Points (butuh {$rankedEntryFee} BP untuk match ranked).", 422);
                }
            }
        }

        return DB::transaction(function () use ($validated, $user, $war, $allPlayers, $mode, $rankedEntryFee) {
            $matchCode = 'M-' . strtoupper(Str::random(8));

            $match = GameMatch::create([
                'match_code' => $matchCode,
                'season_id' => $war->season_id,
                'creator_id' => $user->id,
                'type' => $validated['type'],
                'mode' => $mode,
                'venue' => $validated['venue'] ?? ($war->venue ?: 'GOR Pertandingan'),
                'scheduled_at' => $validated['scheduled_at'] ?? ($war->scheduled_at ?: now()),
                'description' => $validated['description'] ?? ("War Match #{$war->war_code}: {$war->challengerTeam->name} vs {$war->challengedTeam->name}"),
                'status' => 'READY',
                'team_war_id' => $war->id,
                'team_a_team_id' => $war->challenger_team_id,
                'team_b_team_id' => $war->challenged_team_id,
            ]);

            // Deduct BP for ranked matches
            if ($validated['type'] === 'RANKED') {
                foreach ($allPlayers as $pId) {
                    $this->battlePointService->adjustPoints(
                        userId: $pId,
                        changeAmount: -$rankedEntryFee,
                        category: PointTransaction::CAT_RANKED_MATCH_ENTRY,
                        description: sprintf('Biaya Entry War Ranked Match #%s (-%d BP)', $match->match_code, $rankedEntryFee),
                        matchId: $match->id,
                        idempotencyKey: sprintf('war_entry_%d_%d', $match->id, $pId)
                    );
                }
                $match->battle_deducted = true;
                $match->save();
            }

            // Create Match Players (Auto-accepted because arranged by captains)
            $slot = 1;
            foreach ($validated['team_a_player_ids'] as $pId) {
                MatchPlayer::create([
                    'match_id' => $match->id,
                    'user_id' => $pId,
                    'team' => 'TEAM_A',
                    'slot' => $slot++,
                    'invitation_status' => 'ACCEPTED',
                    'invitation_responded_at' => now(),
                ]);
            }

            $slot = 1;
            foreach ($validated['team_b_player_ids'] as $pId) {
                MatchPlayer::create([
                    'match_id' => $match->id,
                    'user_id' => $pId,
                    'team' => 'TEAM_B',
                    'slot' => $slot++,
                    'invitation_status' => 'ACCEPTED',
                    'invitation_responded_at' => now(),
                ]);
            }

            if ($war->status === 'ACCEPTED') {
                $war->status = 'IN_PROGRESS';
                $war->save();
            }

            // Notify all players that they are scheduled in this war match
            $this->notificationService->sendMany(
                userIds: $allPlayers,
                type: 'WAR_MATCH_SCHEDULED',
                title: 'Jadwal Pertandingan War Team!',
                message: sprintf('Anda telah didaftarkan dalam pertandingan War Team (%s): %s vs %s di %s.', $war->war_code, $war->challengerTeam->name, $war->challengedTeam->name, $match->venue),
                data: ['war_id' => $war->id, 'match_id' => $match->id]
            );

            return $this->success($match->load(['matchPlayers.user.profile', 'teamWar']), 'Pertandingan War Team berhasil dibuat dan siap dimainkan.', 201);
        });
    }

    /**
     * Get Team Season Score Leaderboard.
     * Displays ranked teams for the active or requested season.
     */
    public function leaderboard(Request $request): JsonResponse
    {
        $seasonId = $request->query('season_id') ? (int) $request->query('season_id') : null;

        if (!$seasonId) {
            $seasonId = Season::where('is_active', true)->value('id')
                ?? Season::orderByDesc('start_date')->value('id');
        }

        $season = Season::find($seasonId);

        $scores = TeamSeasonScore::with(['team.creator.profile'])
            ->where('season_id', $seasonId)
            ->orderByDesc('score')
            ->orderByDesc('war_wins')
            ->orderByDesc('matches_played')
            ->paginate((int) $request->query('per_page', 20));

        return $this->success([
            'season' => $season,
            'leaderboard' => $scores,
        ], 'Team season leaderboard retrieved');
    }
}
