<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PointTransaction;
use App\Models\Referral;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AffiliateController extends Controller
{
    use ApiResponse;

    /**
     * Get affiliate statistics and invited friends for the authenticated user.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = Auth::user();
        $user->loadMissing('profile');

        $referralCode = $user->username;
        $playerCode = $user->profile?->player_code ?? 'BCL-' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT);

        // Referrals where this user is the referrer
        $referrals = Referral::with(['referred.profile', 'firstMatch'])
            ->where('referrer_id', $user->id)
            ->orderByDesc('id')
            ->get();

        $totalReferred = $referrals->count();
        $completedReferred = $referrals->where('status', Referral::STATUS_COMPLETED)->count();
        $pendingReferred = $referrals->where('status', Referral::STATUS_PENDING)->count();

        // Calculate total BP earned from affiliate program
        $totalPointsEarned = (int) PointTransaction::where('user_id', $user->id)
            ->where('category', PointTransaction::CAT_AFFILIATE_REWARD)
            ->where('amount', '>', 0)
            ->sum('amount');

        // If user was referred by someone, include that information
        $referredByInfo = null;
        if ($user->referred_by_id) {
            $referrerUser = User::with('profile')->find($user->referred_by_id);
            if ($referrerUser) {
                $userReferral = Referral::where('referred_id', $user->id)->first();
                $referredByInfo = [
                    'referrer_name' => $referrerUser->name,
                    'referrer_username' => $referrerUser->username,
                    'status' => $userReferral ? $userReferral->status : 'COMPLETED',
                    'reward_points' => 100,
                ];
            }
        }

        $formattedReferrals = $referrals->map(function ($ref) {
            return [
                'id' => $ref->id,
                'status' => $ref->status,
                'reward_points' => $ref->reward_points,
                'first_match_id' => $ref->first_match_id,
                'first_match_code' => $ref->firstMatch?->match_code,
                'rewarded_at' => $ref->rewarded_at?->toIso8601String(),
                'created_at' => $ref->created_at->toIso8601String(),
                'referred_user' => [
                    'id' => $ref->referred?->id,
                    'name' => $ref->referred?->name,
                    'username' => $ref->referred?->username,
                    'player_code' => $ref->referred?->profile?->player_code,
                    'avatar_url' => $ref->referred?->profile?->avatar_url,
                    'city' => $ref->referred?->profile?->city,
                ],
            ];
        });

        return $this->success([
            'referral_code' => $referralCode,
            'player_code' => $playerCode,
            'total_referred' => $totalReferred,
            'completed_referred' => $completedReferred,
            'pending_referred' => $pendingReferred,
            'total_points_earned' => $totalPointsEarned,
            'reward_per_referral' => 100,
            'referred_by' => $referredByInfo,
            'referrals' => $formattedReferrals,
        ], 'Affiliate statistics retrieved successfully.');
    }
}
