<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Season;
use App\Services\LeaderboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeasonController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected LeaderboardService $leaderboardService
    ) {}

    /**
     * List all seasons.
     */
    public function index(): JsonResponse
    {
        $seasons = Season::withCount('matches')->orderByDesc('start_date')->get();
        return $this->success($seasons, 'Seasons retrieved.');
    }

    /**
     * Get currently active season.
     */
    public function active(): JsonResponse
    {
        $season = Season::where('is_active', true)->first();
        if (!$season) {
            $season = Season::orderByDesc('start_date')->first();
        }
        return $this->success($season, 'Active season retrieved.');
    }

    /**
     * Get seasonal leaderboard for a specific season.
     */
    public function leaderboards(Request $request, int $id): JsonResponse
    {
        $season = Season::findOrFail($id);
        $search = $request->query('search');
        $city = $request->query('city');
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 20);

        $rankLeaderboard = $this->leaderboardService->getRankLeaderboard(
            search: $search,
            city: $city,
            seasonId: $season->id,
            page: $page,
            perPage: $perPage
        );

        return $this->success([
            'season' => $season,
            'leaderboard' => $rankLeaderboard,
        ], 'Seasonal leaderboard retrieved.');
    }
}
