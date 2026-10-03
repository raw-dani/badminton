<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PointController extends Controller
{
    use ApiResponse;

    /**
     * Get authenticated player's point balances and summary.
     */
    public function balance(Request $request): JsonResponse
    {
        $userId = Auth::id();
        $balance = PlayerPointBalance::firstOrCreate(
            ['user_id' => $userId],
            ['battle_points' => 0, 'rank_points' => 0]
        );

        return $this->success($balance, 'Current point balances retrieved.');
    }

    /**
     * Get authenticated player's point transaction ledger with pagination and filters.
     */
    public function transactions(Request $request): JsonResponse
    {
        $userId = Auth::id();
        $pointType = $request->query('point_type'); // BATTLE or RANK
        $category = $request->query('category');
        $perPage = (int) $request->query('per_page', 20);

        $query = PointTransaction::with(['match', 'actor'])
            ->where('user_id', $userId)
            ->orderByDesc('id');

        if ($pointType) {
            $query->where('point_type', strtoupper($pointType));
        }

        if ($category) {
            $query->where('category', strtoupper($category));
        }

        $transactions = $query->paginate($perPage);

        // Calculate summary for the user and point type
        $statsQuery = PointTransaction::where('user_id', $userId);
        if ($pointType) {
            $statsQuery->where('point_type', strtoupper($pointType));
        }
        $totalInflow = (int) (clone $statsQuery)->where('amount', '>', 0)->sum('amount');
        $totalOutflow = (int) (clone $statsQuery)->where('amount', '<', 0)->sum('amount');

        $userBalance = PlayerPointBalance::where('user_id', $userId)->first();

        $responseData = $transactions->toArray();
        $responseData['summary'] = [
            'point_type' => $pointType ? strtoupper($pointType) : 'ALL',
            'total_inflow' => $totalInflow,
            'total_outflow' => abs($totalOutflow),
            'battle_balance' => $userBalance ? $userBalance->battle_points : 0,
            'rank_balance' => $userBalance ? $userBalance->rank_points : 0,
        ];

        return $this->success($responseData, 'Point transactions retrieved.');
    }
}
