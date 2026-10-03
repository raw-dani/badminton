<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\PlayerProfile;
use App\Models\User;
use App\Services\LeaderboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PlayerProfileController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected LeaderboardService $leaderboardService
    ) {}

    /**
     * Search and list active players (e.g. for inviting to matches).
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('query');
        $excludeCurrentUser = $request->boolean('exclude_me', false);
        $excludeUserId = $request->query('exclude_user_id');

        $query = User::query()
            ->with(['profile', 'pointBalance'])
            ->where('status', 'active');

        $currentUserId = auth('sanctum')->id() ?: Auth::id();
        if ($excludeCurrentUser && $currentUserId) {
            $query->where('id', '!=', $currentUserId);
        }
        if ($excludeUserId) {
            $query->where('id', '!=', (int) $excludeUserId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhereHas('profile', function ($p) use ($search) {
                      $p->where('player_code', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%");
                  });
            });
        }

        $players = $query->limit(30)->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'player_code' => $user->profile?->player_code,
                'avatar_url' => $user->profile?->avatar_url,
                'city' => $user->profile?->city,
                'preferred_position' => $user->profile?->preferred_position,
                'battle_points' => $user->pointBalance?->battle_points ?? 0,
                'rank_points' => $user->pointBalance?->rank_points ?? 0,
            ];
        });

        return $this->success($players, 'Players retrieved successfully');
    }

    /**
     * Get public player profile by username or ID.
     */
    public function show(string $identifier): JsonResponse
    {
        $user = User::with(['profile', 'pointBalance'])
            ->where('username', strtolower($identifier))
            ->orWhere('id', is_numeric($identifier) ? (int) $identifier : 0)
            ->first();

        if (!$user) {
            return $this->error('Player profile not found.', 404);
        }

        $profile = $user->profile;
        $isOwnerOrAdmin = Auth::check() && (Auth::id() === $user->id || Auth::user()->isAdmin());

        // Privacy check
        if ($profile && $profile->visibility === 'private' && !$isOwnerOrAdmin) {
            return $this->success([
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'avatar_url' => $profile->avatar_url,
                'visibility' => 'private',
                'message' => 'This player profile is set to private.',
            ], 'Private player profile');
        }

        $ranks = $this->leaderboardService->getUserRankingPositions($user->id);

        // Fetch recent completed matches
        $recentMatches = GameMatch::whereHas('matchPlayers', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->where('status', 'COMPLETED')
        ->with(['matchPlayers.user.profile', 'currentScores'])
        ->orderByDesc('scheduled_at')
        ->limit(10)
        ->get();

        return $this->success([
            'personal' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'player_code' => $profile?->player_code,
                'avatar_url' => $profile?->avatar_url,
                'city' => $profile?->city,
                'gender' => $profile?->gender,
                'bio' => $profile?->bio,
                'preferred_position' => $profile?->preferred_position,
                'instagram' => $profile?->instagram,
                'facebook' => $profile?->facebook,
                'tiktok' => $profile?->tiktok,
                'youtube' => $profile?->youtube,
                'visibility' => $profile?->visibility ?? 'public',
                'date_joined' => $user->created_at->toIso8601String(),
            ],
            'statistics' => $user->pointBalance,
            'ranking' => [
                'battle_rank' => $ranks['battle_rank'],
                'rank_rank' => $ranks['rank_rank'],
            ],
            'recent_matches' => $recentMatches,
        ], 'Player profile details');
    }

    /**
     * Update authenticated user's own profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'city' => ['nullable', 'string', 'max:100'],
            'gender' => ['nullable', 'in:male,female,other'],
            'bio' => ['nullable', 'string', 'max:500'],
            'preferred_position' => ['nullable', 'in:singles,doubles_front,doubles_back,all_round'],
            'instagram' => ['nullable', 'string', 'max:150'],
            'facebook' => ['nullable', 'string', 'max:150'],
            'tiktok' => ['nullable', 'string', 'max:150'],
            'youtube' => ['nullable', 'string', 'max:255'],
            'visibility' => ['required', 'in:public,private'],
        ]);

        $user->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
        ]);

        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'city' => $validated['city'] ?? null,
                'gender' => $validated['gender'] ?? null,
                'bio' => $validated['bio'] ?? null,
                'preferred_position' => $validated['preferred_position'] ?? 'all_round',
                'instagram' => $validated['instagram'] ?? null,
                'facebook' => $validated['facebook'] ?? null,
                'tiktok' => $validated['tiktok'] ?? null,
                'youtube' => $validated['youtube'] ?? null,
                'visibility' => $validated['visibility'],
            ]
        );

        $user->load('profile');

        return $this->success($user, 'Profile updated successfully');
    }

    /**
     * Upload profile avatar image.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'], // 2MB max
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $fileName = sprintf('avatar_%d_%s.%s', $user->id, time(), $file->getClientOriginalExtension());
        $path = $file->storeAs('avatars', $fileName, 'public');

        $avatarUrl = '/storage/' . $path;

        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            ['avatar_url' => $avatarUrl]
        );

        return $this->success(['avatar_url' => $avatarUrl], 'Profile photo uploaded successfully');
    }

    /**
     * Get player's detailed statistics.
     */
    public function getStatistics(int $id): JsonResponse
    {
        $user = User::with('pointBalance')->findOrFail($id);
        $ranks = $this->leaderboardService->getUserRankingPositions($user->id);

        return $this->success([
            'user_id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'statistics' => $user->pointBalance,
            'ranking' => $ranks,
        ], 'Player statistics');
    }

    /**
     * Get player's matches history with pagination.
     */
    public function getMatches(Request $request, int $id): JsonResponse
    {
        $type = $request->query('type'); // BATTLE or RANKED
        $status = $request->query('status'); // COMPLETED, etc.
        $perPage = (int) $request->query('per_page', 15);

        $query = GameMatch::whereHas('matchPlayers', function ($q) use ($id) {
            $q->where('user_id', $id);
        })
        ->with(['matchPlayers.user.profile', 'currentScores', 'creator'])
        ->orderByDesc('scheduled_at');

        if ($type) {
            $query->where('type', strtoupper($type));
        }

        if ($status) {
            $query->where('status', strtoupper($status));
        }

        $matches = $query->paginate($perPage);

        return $this->success($matches, 'Player match history');
    }
}
