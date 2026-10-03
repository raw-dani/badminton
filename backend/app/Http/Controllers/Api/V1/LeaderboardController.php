<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\LeaderboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LeaderboardController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected LeaderboardService $leaderboardService
    ) {}

    /**
     * Get Battle Points Leaderboard.
     */
    public function battle(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $city = $request->query('city');
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 20);
        $currentUserId = Auth::id();

        $result = $this->leaderboardService->getBattleLeaderboard(
            search: $search,
            city: $city,
            page: $page,
            perPage: $perPage,
            currentUserId: $currentUserId
        );

        return $this->success($result, 'Battle leaderboard retrieved.');
    }

    /**
     * Get Rank Points Leaderboard.
     */
    public function rank(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $city = $request->query('city');
        $seasonId = $request->query('season_id') ? (int) $request->query('season_id') : null;
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 20);
        $currentUserId = Auth::id();

        $result = $this->leaderboardService->getRankLeaderboard(
            search: $search,
            city: $city,
            seasonId: $seasonId,
            page: $page,
            perPage: $perPage,
            currentUserId: $currentUserId
        );

        return $this->success($result, 'Rank leaderboard retrieved.');
    }
}
