<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamMessage;
use App\Models\User;
use App\Services\BattlePointService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class TeamController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected BattlePointService $battlePointService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Browse all active teams.
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $city = $request->query('city');
        $perPage = (int) $request->query('per_page', 15);

        $query = Team::with(['creator.profile', 'activeMembers.user.profile'])
            ->withCount('activeMembers')
            ->where('status', 'ACTIVE')
            ->orderByDesc('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($city) {
            $query->where('city', $city);
        }

        $teams = $query->paginate($perPage);

        return $this->success($teams, 'Teams retrieved successfully');
    }

    /**
     * Get current authenticated user's active team details.
     */
    public function myTeam(): JsonResponse
    {
        $user = Auth::user();
        $membership = TeamMember::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->with(['team.creator.profile', 'team.activeMembers.user.profile', 'team.activeMembers.user.pointBalance'])
            ->first();

        if (!$membership || !$membership->team) {
            return $this->success(null, 'User is not currently in any team');
        }

        $team = $membership->team;
        $team->loadCount('activeMembers');
        $team->current_user_role = $membership->role;

        return $this->success([
            'team' => $team,
            'membership' => $membership,
            'is_leader' => $membership->role === 'LEADER',
            'is_admin' => in_array($membership->role, ['LEADER', 'ADMIN']),
        ], 'Team data retrieved successfully');
    }

    /**
     * Get team details by ID.
     */
    public function show(int $id): JsonResponse
    {
        $team = Team::with([
            'creator.profile',
            'activeMembers.user.profile',
            'activeMembers.user.pointBalance',
        ])
            ->withCount('activeMembers')
            ->findOrFail($id);

        $currentUserId = Auth::id();
        $membership = null;
        if ($currentUserId) {
            $membership = TeamMember::where('team_id', $team->id)
                ->where('user_id', $currentUserId)
                ->where('status', 'ACTIVE')
                ->first();
        }

        $team->current_user_role = $membership?->role;

        return $this->success([
            'team' => $team,
            'is_member' => (bool) $membership,
            'membership' => $membership,
        ], 'Team details retrieved');
    }

    /**
     * Create a new Team.
     * Condition: Costs 1000 Battle Points for initial quota of 10 members.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        // 1. Check if user is already in an active team
        $existingMembership = TeamMember::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if ($existingMembership) {
            return $this->error('Anda sudah tergabung dalam sebuah tim. Keluar dari tim saat ini terlebih dahulu jika ingin membuat tim baru.', 400);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:100', 'unique:teams,name'],
            'description' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:100'],
            'logo_url' => ['nullable', 'string', 'max:500'],
        ]);

        // 2. Check user Battle Points (requires 1000 BP)
        $balance = PlayerPointBalance::where('user_id', $user->id)->first();
        $currentBp = $balance?->battle_points ?? 0;

        if ($currentBp < 1000) {
            return $this->error("Pembuatan tim memerlukan biaya 1000 Battle Points untuk kuota awal 10 anggota. Saldo Battle Points Anda saat ini: {$currentBp} BP.", 422);
        }

        try {
            $team = DB::transaction(function () use ($user, $validated) {
                // Deduct 1000 BP
                $idempotencyKey = sprintf('team_create_%d_%d', $user->id, time());
                $this->battlePointService->adjustPoints(
                    userId: $user->id,
                    changeAmount: -1000,
                    category: PointTransaction::CAT_TEAM_CREATION,
                    description: sprintf('Biaya Pembuatan Tim "%s" (-1000 BP, Kuota 10 Anggota)', $validated['name']),
                    idempotencyKey: $idempotencyKey
                );

                // Create Team
                $teamCode = 'TM-' . strtoupper(Str::random(6));
                $team = Team::create([
                    'name' => $validated['name'],
                    'code' => $teamCode,
                    'description' => $validated['description'] ?? null,
                    'city' => $validated['city'] ?? null,
                    'logo_url' => $validated['logo_url'] ?? null,
                    'creator_id' => $user->id,
                    'max_members' => 10,
                    'battle_points_spent' => 1000,
                    'status' => 'ACTIVE',
                ]);

                // Add Creator as LEADER
                TeamMember::create([
                    'team_id' => $team->id,
                    'user_id' => $user->id,
                    'role' => 'LEADER',
                    'status' => 'ACTIVE',
                    'joined_at' => now(),
                ]);

                return $team;
            });

            $team->load(['creator.profile', 'activeMembers.user.profile']);
            $team->loadCount('activeMembers');

            return $this->success($team, "Tim \"{$team->name}\" berhasil dibuat! 1000 Battle Points telah dipotong.", 201);
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Upgrade team member quota.
     * Condition: Costs 1000 Battle Points per 10 additional members (multiples of 10).
     */
    public function upgradeQuota(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $team = Team::findOrFail($id);

        // Check if user is LEADER or ADMIN of this team
        $membership = TeamMember::where('team_id', $team->id)
            ->where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$membership || !in_array($membership->role, ['LEADER', 'ADMIN'])) {
            return $this->error('Hanya Kapten atau Admin tim yang dapat melakukan upgrade kuota anggota tim.', 403);
        }

        $validated = $request->validate([
            'multiplier' => ['nullable', 'integer', 'min:1', 'max:10'], // default 1 (means +10 members for 1000 BP)
        ]);

        $multiplier = (int) ($validated['multiplier'] ?? 1);
        $additionalQuota = $multiplier * 10;
        $costBp = $multiplier * 1000;

        $balance = PlayerPointBalance::where('user_id', $user->id)->first();
        $currentBp = $balance?->battle_points ?? 0;

        if ($currentBp < $costBp) {
            return $this->error("Upgrade kuota +{$additionalQuota} anggota memerlukan {$costBp} Battle Points. Saldo Battle Points Anda saat ini: {$currentBp} BP.", 422);
        }

        try {
            DB::transaction(function () use ($user, $team, $costBp, $additionalQuota) {
                // Deduct Battle Points
                $idempotencyKey = sprintf('team_upgrade_%d_%d_%d', $team->id, $user->id, time());
                $this->battlePointService->adjustPoints(
                    userId: $user->id,
                    changeAmount: -$costBp,
                    category: PointTransaction::CAT_TEAM_UPGRADE,
                    description: sprintf('Upgrade Kuota Tim "%s" (+%d Anggota, -%d BP)', $team->name, $additionalQuota, $costBp),
                    idempotencyKey: $idempotencyKey
                );

                $team->increment('max_members', $additionalQuota);
                $team->increment('battle_points_spent', $costBp);
            });

            $team->refresh()->load(['creator.profile', 'activeMembers.user.profile']);
            $team->loadCount('activeMembers');

            return $this->success($team, "Kuota tim berhasil ditingkatkan +{$additionalQuota} anggota (Total kuota: {$team->max_members} anggota). {$costBp} BP telah dipotong.");
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Join a team.
     */
    public function join(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $team = Team::findOrFail($id);

        if ($team->status !== 'ACTIVE') {
            return $this->error('Tim ini sudah tidak aktif atau dibubarkan.', 400);
        }

        // Check if user is already in a team
        $existing = TeamMember::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if ($existing) {
            if ($existing->team_id === $team->id) {
                return $this->error('Anda sudah terdaftar sebagai anggota tim ini.', 400);
            }
            return $this->error('Anda sudah tergabung dalam tim lain. Keluar terlebih dahulu sebelum bergabung dengan tim baru.', 400);
        }

        // Check quota capacity
        $currentMemberCount = $team->activeMembers()->count();
        if ($currentMemberCount >= $team->max_members) {
            return $this->error("Kuota anggota tim ini sudah penuh ({$currentMemberCount}/{$team->max_members} anggota). Hubungi admin tim untuk melakukan upgrade kuota.", 400);
        }

        // Join team
        $member = TeamMember::updateOrCreate(
            ['team_id' => $team->id, 'user_id' => $user->id],
            ['role' => 'MEMBER', 'status' => 'ACTIVE', 'joined_at' => now()]
        );

        // Notify team leader
        $this->notificationService->send(
            userId: $team->creator_id,
            type: 'TEAM_MEMBER_JOINED',
            title: 'Anggota Baru Bergabung!',
            message: sprintf('%s telah bergabung dengan tim %s.', $user->name, $team->name),
            data: ['team_id' => $team->id, 'user_id' => $user->id]
        );

        $team->load(['creator.profile', 'activeMembers.user.profile']);
        $team->loadCount('activeMembers');

        return $this->success([
            'team' => $team,
            'membership' => $member,
        ], "Selamat! Anda telah resmi bergabung dengan tim {$team->name}.");
    }

    /**
     * Leave team.
     */
    public function leave(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $team = Team::findOrFail($id);

        $membership = TeamMember::where('team_id', $team->id)
            ->where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$membership) {
            return $this->error('Anda bukan anggota dari tim ini.', 400);
        }

        if ($membership->role === 'LEADER') {
            $otherMembersCount = TeamMember::where('team_id', $team->id)
                ->where('user_id', '!=', $user->id)
                ->where('status', 'ACTIVE')
                ->count();

            if ($otherMembersCount > 0) {
                return $this->error('Sebagai Kapten tim, Anda harus mengalihkan status Kapten ke anggota lain sebelum dapat keluar dari tim.', 400);
            }

            // If leader is alone, disband team
            $team->status = 'DISBANDED';
            $team->save();
        }

        $membership->delete();

        return $this->success(null, "Anda telah keluar dari tim {$team->name}.");
    }

    /**
     * Promote / demote team member role (LEADER only).
     */
    public function changeMemberRole(Request $request, int $id, int $memberUserId): JsonResponse
    {
        $user = Auth::user();
        $team = Team::findOrFail($id);

        $actorMembership = TeamMember::where('team_id', $team->id)
            ->where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$actorMembership || $actorMembership->role !== 'LEADER') {
            return $this->error('Hanya Kapten tim yang memiliki wewenang untuk mengubah status atau peran anggota tim.', 403);
        }

        $targetMember = TeamMember::where('team_id', $team->id)
            ->where('user_id', $memberUserId)
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        $validated = $request->validate([
            'role' => ['required', 'in:ADMIN,MEMBER'],
        ]);

        $targetMember->role = $validated['role'];
        $targetMember->save();

        $targetUser = User::find($memberUserId);
        $roleLabel = $validated['role'] === 'ADMIN' ? 'Admin Tim' : 'Anggota Biasa';

        return $this->success($targetMember, "Peran @{$targetUser->username} berhasil diubah menjadi {$roleLabel}.");
    }

    /**
     * Remove / kick a member from the team.
     */
    public function kickMember(Request $request, int $id, int $memberUserId): JsonResponse
    {
        $user = Auth::user();
        $team = Team::findOrFail($id);

        $actorMembership = TeamMember::where('team_id', $team->id)
            ->where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$actorMembership || !in_array($actorMembership->role, ['LEADER', 'ADMIN'])) {
            return $this->error('Hanya Kapten atau Admin tim yang dapat mengeluarkan anggota.', 403);
        }

        $targetMember = TeamMember::where('team_id', $team->id)
            ->where('user_id', $memberUserId)
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        if ($targetMember->role === 'LEADER') {
            return $this->error('Kapten tim tidak dapat dikeluarkan dari tim.', 400);
        }

        if ($actorMembership->role === 'ADMIN' && $targetMember->role === 'ADMIN') {
            return $this->error('Admin tim tidak dapat mengeluarkan sesama Admin tim. Hanya Kapten yang dapat melakukannya.', 403);
        }

        $targetMember->delete();

        return $this->success(null, 'Anggota telah dikeluarkan dari tim.');
    }

    /**
     * Get team group chat messages.
     * STRICT REQUIREMENT: Only active members of the team can access team chat!
     */
    public function getMessages(Request $request): JsonResponse
    {
        $user = Auth::user();
        $membership = TeamMember::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$membership) {
            return $this->error('Fasilitas Chat Group hanya tersedia untuk pemain yang telah tergabung dalam sebuah tim.', 403);
        }

        $messages = TeamMessage::where('team_id', $membership->team_id)
            ->with(['user.profile', 'user.teamMembership'])
            ->latest('id')
            ->take(60)
            ->get()
            ->reverse()
            ->values();

        return $this->success($messages, 'Team messages retrieved');
    }

    /**
     * Send a team group chat message.
     * STRICT REQUIREMENT: Only active members of the team can send messages to the team chat!
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $user = Auth::user();
        $membership = TeamMember::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$membership) {
            return $this->error('Fasilitas Chat Group hanya tersedia untuk pemain yang telah tergabung dalam sebuah tim.', 403);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $message = TeamMessage::create([
            'team_id' => $membership->team_id,
            'user_id' => $user->id,
            'message' => trim($validated['message']),
        ]);

        $message->load(['user.profile', 'user.teamMembership']);

        return $this->success($message, 'Message sent successfully', 201);
    }
}
