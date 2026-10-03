<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\PlayerPointBalance;
use App\Models\PlayerProfile;
use App\Models\Referral;
use App\Models\User;
use App\Services\LeaderboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected LeaderboardService $leaderboardService
    ) {}

    /**
     * Register a new player account.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'alpha_dash', 'min:3', 'max:50', 'unique:users,username'],
            'email' => ['required', 'string', 'email', 'max:100', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            'phone' => ['nullable', 'string', 'max:30'],
            'city' => ['nullable', 'string', 'max:100'],
            'gender' => ['nullable', 'in:male,female,other'],
            'preferred_position' => ['nullable', 'in:singles,doubles_front,doubles_back,all_round'],
            'bio' => ['nullable', 'string', 'max:500'],
            'ref' => ['nullable', 'string', 'max:50'],
        ]);

        // Find referrer if referral code/username was provided
        $referrerId = null;
        if (!empty($validated['ref'])) {
            $refCode = trim($validated['ref']);
            $referrer = User::where('username', strtolower($refCode))
                ->orWhereHas('profile', function ($q) use ($refCode) {
                    $q->where('player_code', strtoupper($refCode));
                })
                ->first();

            if ($referrer) {
                $referrerId = $referrer->id;
            }
        }

        $user = User::create([
            'name' => $validated['name'],
            'username' => strtolower($validated['username']),
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'role' => 'player',
            'status' => 'active',
            'referred_by_id' => $referrerId,
            'email_verified_at' => now(), // Auto-verified for seamless UX
        ]);

        // If registered through affiliate link, record pending referral
        if ($referrerId) {
            Referral::create([
                'referrer_id' => $referrerId,
                'referred_id' => $user->id,
                'status' => Referral::STATUS_PENDING,
                'reward_points' => 100,
            ]);

            // Notify referrer of new signup
            Notification::create([
                'user_id' => $referrerId,
                'type' => 'REFERRAL_NEW_SIGNUP',
                'title' => 'Pemain Baru Mendaftar dengan Link Afiliasi Anda! 🏸',
                'message' => sprintf(
                    'Pemain @%s baru saja mendaftar menggunakan link afiliasi Anda. Anda dan @%s masing-masing akan menerima 100 Battle Points setelah @%s menyelesaikan pertandingan pertamanya!',
                    $user->username,
                    $user->username,
                    $user->username
                ),
                'data' => [
                    'referred_id' => $user->id,
                    'referred_username' => $user->username,
                    'referred_name' => $user->name,
                ],
                'is_read' => false,
            ]);
        }

        // Generate player code e.g. BCL-1002
        $playerCode = 'BCL-' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT);

        PlayerProfile::create([
            'user_id' => $user->id,
            'player_code' => $playerCode,
            'city' => $validated['city'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'bio' => $validated['bio'] ?? null,
            'preferred_position' => $validated['preferred_position'] ?? 'all_round',
            'visibility' => 'public',
        ]);

        // Initialize points balance
        PlayerPointBalance::create([
            'user_id' => $user->id,
            'battle_points' => 0,
            'rank_points' => 0,
        ]);

        $token = $user->createToken('bcl_auth_token')->plainTextToken;

        return $this->success([
            'user' => $this->formatUserResponse($user),
            'token' => $token,
        ], 'Registration successful', 201);
    }

    /**
     * Login user with email or username.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'login' => ['required', 'string'], // email or username
            'password' => ['required', 'string'],
        ]);

        $login = $validated['login'];
        $user = User::where('email', strtolower($login))
            ->orWhere('username', strtolower($login))
            ->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return $this->error('Invalid credentials. Please verify your username/email and password.', 401);
        }

        if ($user->status === 'suspended') {
            return $this->error('Your account is currently suspended. Please contact administration.', 403);
        }

        $token = $user->createToken('bcl_auth_token')->plainTextToken;

        return $this->success([
            'user' => $this->formatUserResponse($user),
            'token' => $token,
        ], 'Login successful');
    }

    /**
     * Get authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        return $this->success($this->formatUserResponse($user), 'Authenticated user details');
    }

    /**
     * Logout and revoke token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->success(null, 'Logged out successfully');
    }

    /**
     * Refresh auth token.
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        $newToken = $user->createToken('bcl_auth_token')->plainTextToken;

        return $this->success([
            'user' => $this->formatUserResponse($user),
            'token' => $newToken,
        ], 'Token refreshed successfully');
    }

    protected function formatUserResponse(User $user): array
    {
        $user->loadMissing(['profile', 'pointBalance']);
        $ranks = $this->leaderboardService->getUserRankingPositions($user->id);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'status' => $user->status,
            'profile' => $user->profile,
            'point_balance' => $user->pointBalance,
            'ranking' => [
                'battle_rank' => $ranks['battle_rank'],
                'rank_rank' => $ranks['rank_rank'],
            ],
        ];
    }
}
