<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\MatchInvitation;
use App\Models\MatchScoreApproval;
use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use App\Services\LeaderboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected LeaderboardService $leaderboardService
    ) {}

    /**
     * Get comprehensive personalized player dashboard data.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'pointBalance']);
        $userId = $user->id;

        // Leaderboard ranking positions
        $ranks = $this->leaderboardService->getUserRankingPositions($userId);

        // Upcoming matches (READY or IN_PROGRESS)
        $upcomingMatches = GameMatch::whereHas('matchPlayers', function ($q) use ($userId) {
            $q->where('user_id', $userId)->where('invitation_status', 'ACCEPTED');
        })
        ->whereIn('status', ['READY', 'IN_PROGRESS'])
        ->with(['creator.profile', 'matchPlayers.user.profile'])
        ->orderBy('scheduled_at')
        ->limit(5)
        ->get();

        // Pending Invitations awaiting this user's response
        $pendingInvitations = MatchInvitation::with(['match.creator.profile', 'invitedBy.profile'])
            ->where('invited_user_id', $userId)
            ->where('status', 'PENDING')
            ->whereHas('match', function ($q) {
                $q->where('status', 'PENDING_ACCEPTANCE');
            })
            ->get();

        // Scores awaiting this user's approval
        $scoresAwaitingApproval = GameMatch::whereHas('matchPlayers', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
        ->where('status', 'WAITING_APPROVAL')
        ->whereDoesntHave('approvals', function ($q) use ($userId) {
            $q->where('user_id', $userId)
              ->whereColumn('version', 'matches.current_score_version');
        })
        ->with(['creator.profile', 'matchPlayers.user.profile', 'currentScores'])
        ->get();

        // Disputed matches involving this user
        $disputedMatches = GameMatch::whereHas('matchPlayers', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
        ->where('status', 'DISPUTED')
        ->with(['creator.profile', 'disputer.profile'])
        ->get();

        // Recent matches (last 10 completed)
        $recentMatches = GameMatch::whereHas('matchPlayers', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
        ->where('status', 'COMPLETED')
        ->with(['matchPlayers.user.profile', 'currentScores'])
        ->orderByDesc('scheduled_at')
        ->limit(10)
        ->get();

        // Performance Chart data: last 15 point transactions
        $recentTransactions = PointTransaction::where('user_id', $userId)
            ->orderBy('id', 'desc')
            ->limit(15)
            ->get()
            ->reverse()
            ->values()
            ->map(function ($tx) {
                return [
                    'date' => $tx->created_at->format('M d'),
                    'point_type' => $tx->point_type,
                    'amount' => $tx->amount,
                    'new_balance' => $tx->new_balance,
                    'category' => $tx->category,
                ];
            });

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'role' => $user->role,
                'profile' => $user->profile,
            ],
            'point_cards' => [
                'battle_points' => $user->pointBalance?->battle_points ?? 0,
                'rank_points' => $user->pointBalance?->rank_points ?? 0,
                'battle_rank' => $ranks['battle_rank'],
                'rank_rank' => $ranks['rank_rank'],
            ],
            'statistics' => $user->pointBalance,
            'pending_actions' => [
                'invitations' => $pendingInvitations,
                'scores_awaiting_approval' => $scoresAwaitingApproval,
                'disputed_matches' => $disputedMatches,
                'total_pending_count' => $pendingInvitations->count() + $scoresAwaitingApproval->count() + $disputedMatches->count(),
            ],
            'upcoming_matches' => $upcomingMatches,
            'recent_matches' => $recentMatches,
            'performance_chart' => $recentTransactions,
        ], 'Dashboard data retrieved.');
    }
}
