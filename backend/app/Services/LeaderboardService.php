<?php

namespace App\Services;

use App\Models\PlayerPointBalance;
use App\Models\Season;
use App\Models\SeasonPlayerStatistic;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class LeaderboardService
{
    /**
     * Get Battle Leaderboard with search, city filter, and pagination.
     */
    public function getBattleLeaderboard(
        ?string $search = null,
        ?string $city = null,
        int $page = 1,
        int $perPage = 20,
        ?int $currentUserId = null
    ): array {
        $query = User::query()
            ->join('player_point_balances', 'users.id', '=', 'player_point_balances.user_id')
            ->leftJoin('player_profiles', 'users.id', '=', 'player_profiles.user_id')
            ->where('users.status', 'active')
            ->whereNull('users.deleted_at')
            ->select([
                'users.id as user_id',
                'users.name',
                'users.username',
                'player_profiles.player_code',
                'player_profiles.avatar_url',
                'player_profiles.city',
                'player_profiles.preferred_position',
                'player_point_balances.battle_points',
                'player_point_balances.total_matches',
                'player_point_balances.battle_matches',
                'player_point_balances.total_wins',
                'player_point_balances.total_losses',
                'player_point_balances.current_streak',
                'player_point_balances.longest_streak',
            ])
            ->orderByDesc('player_point_balances.battle_points')
            ->orderByDesc('player_point_balances.total_wins')
            ->orderBy('player_point_balances.total_matches')
            ->orderBy('users.id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                  ->orWhere('users.username', 'like', "%{$search}%");
            });
        }

        if ($city) {
            $query->where('player_profiles.city', $city);
        }

        $total = $query->count();
        $offset = ($page - 1) * $perPage;
        $items = $query->offset($offset)->limit($perPage)->get();

        // Calculate positions
        $rankedItems = $items->map(function ($player, $index) use ($offset) {
            $playerArray = $player->toArray();
            $playerArray['rank_position'] = $offset + $index + 1;
            $matches = $player->total_matches;
            $wins = $player->total_wins;
            $playerArray['win_rate'] = $matches > 0 ? round(($wins / $matches) * 100, 1) : 0.0;
            return $playerArray;
        });

        // Current user position
        $currentUserRank = null;
        if ($currentUserId) {
            $userBalance = PlayerPointBalance::where('user_id', $currentUserId)->first();
            if ($userBalance) {
                $betterCount = PlayerPointBalance::join('users', 'player_point_balances.user_id', '=', 'users.id')
                    ->where('users.status', 'active')
                    ->whereNull('users.deleted_at')
                    ->where(function ($q) use ($userBalance) {
                        $q->where('battle_points', '>', $userBalance->battle_points)
                          ->orWhere(function ($q2) use ($userBalance) {
                              $q2->where('battle_points', '=', $userBalance->battle_points)
                                 ->where('total_wins', '>', $userBalance->total_wins);
                          });
                    })
                    ->count();
                $currentUserRank = $betterCount + 1;
            }
        }

        return [
            'data' => $rankedItems,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
                'current_user_rank' => $currentUserRank,
            ],
            'top_three' => $offset === 0 ? $rankedItems->take(3)->values() : [],
        ];
    }

    /**
     * Get Rank Leaderboard with seasonal filtering, city filter, and pagination.
     * Note: Rank Points can be negative!
     */
    public function getRankLeaderboard(
        ?string $search = null,
        ?string $city = null,
        ?int $seasonId = null,
        int $page = 1,
        int $perPage = 20,
        ?int $currentUserId = null
    ): array {
        // If seasonId is specified, query season_player_statistics
        if ($seasonId) {
            $query = SeasonPlayerStatistic::query()
                ->join('users', 'season_player_statistics.user_id', '=', 'users.id')
                ->leftJoin('player_profiles', 'users.id', '=', 'player_profiles.user_id')
                ->where('season_player_statistics.season_id', $seasonId)
                ->where('users.status', 'active')
                ->whereNull('users.deleted_at')
                ->select([
                    'users.id as user_id',
                    'users.name',
                    'users.username',
                    'player_profiles.player_code',
                    'player_profiles.avatar_url',
                    'player_profiles.city',
                    'player_profiles.preferred_position',
                    'season_player_statistics.rank_points',
                    'season_player_statistics.matches_played as total_matches',
                    'season_player_statistics.wins as total_wins',
                    'season_player_statistics.losses as total_losses',
                ])
                ->orderByDesc('season_player_statistics.rank_points')
                ->orderByDesc('season_player_statistics.wins')
                ->orderBy('season_player_statistics.matches_played')
                ->orderBy('users.id');
        } else {
            // General / active season rank points from player_point_balances
            $query = User::query()
                ->join('player_point_balances', 'users.id', '=', 'player_point_balances.user_id')
                ->leftJoin('player_profiles', 'users.id', '=', 'player_profiles.user_id')
                ->where('users.status', 'active')
                ->whereNull('users.deleted_at')
                ->select([
                    'users.id as user_id',
                    'users.name',
                    'users.username',
                    'player_profiles.player_code',
                    'player_profiles.avatar_url',
                    'player_profiles.city',
                    'player_profiles.preferred_position',
                    'player_point_balances.rank_points',
                    'player_point_balances.total_matches',
                    'player_point_balances.ranked_matches',
                    'player_point_balances.total_wins',
                    'player_point_balances.total_losses',
                    'player_point_balances.current_streak',
                    'player_point_balances.longest_streak',
                ])
                ->orderByDesc('player_point_balances.rank_points')
                ->orderByDesc('player_point_balances.total_wins')
                ->orderBy('player_point_balances.total_matches')
                ->orderBy('users.id');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                  ->orWhere('users.username', 'like', "%{$search}%");
            });
        }

        if ($city) {
            $query->where('player_profiles.city', $city);
        }

        $total = $query->count();
        $offset = ($page - 1) * $perPage;
        $items = $query->offset($offset)->limit($perPage)->get();

        $rankedItems = $items->map(function ($player, $index) use ($offset) {
            $playerArray = $player->toArray();
            $playerArray['rank_position'] = $offset + $index + 1;
            $matches = $player->total_matches;
            $wins = $player->total_wins;
            $playerArray['win_rate'] = $matches > 0 ? round(($wins / $matches) * 100, 1) : 0.0;
            return $playerArray;
        });

        // Current user position
        $currentUserRank = null;
        if ($currentUserId) {
            $userBalance = PlayerPointBalance::where('user_id', $currentUserId)->first();
            if ($userBalance) {
                $betterCount = PlayerPointBalance::join('users', 'player_point_balances.user_id', '=', 'users.id')
                    ->where('users.status', 'active')
                    ->whereNull('users.deleted_at')
                    ->where(function ($q) use ($userBalance) {
                        $q->where('rank_points', '>', $userBalance->rank_points)
                          ->orWhere(function ($q2) use ($userBalance) {
                              $q2->where('rank_points', '=', $userBalance->rank_points)
                                 ->where('total_wins', '>', $userBalance->total_wins);
                          });
                    })
                    ->count();
                $currentUserRank = $betterCount + 1;
            }
        }

        return [
            'data' => $rankedItems,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
                'current_user_rank' => $currentUserRank,
            ],
            'top_three' => $offset === 0 ? $rankedItems->take(3)->values() : [],
        ];
    }

    /**
     * Get both rankings for a specific user.
     */
    public function getUserRankingPositions(int $userId): array
    {
        $userBalance = PlayerPointBalance::where('user_id', $userId)->first();
        if (!$userBalance) {
            return ['battle_rank' => null, 'rank_rank' => null];
        }

        $battleRank = PlayerPointBalance::join('users', 'player_point_balances.user_id', '=', 'users.id')
            ->where('users.status', 'active')
            ->whereNull('users.deleted_at')
            ->where(function ($q) use ($userBalance) {
                $q->where('battle_points', '>', $userBalance->battle_points)
                  ->orWhere(function ($q2) use ($userBalance) {
                      $q2->where('battle_points', '=', $userBalance->battle_points)
                         ->where('total_wins', '>', $userBalance->total_wins);
                  });
            })
            ->count() + 1;

        $competitiveRank = PlayerPointBalance::join('users', 'player_point_balances.user_id', '=', 'users.id')
            ->where('users.status', 'active')
            ->whereNull('users.deleted_at')
            ->where(function ($q) use ($userBalance) {
                $q->where('rank_points', '>', $userBalance->rank_points)
                  ->orWhere(function ($q2) use ($userBalance) {
                      $q2->where('rank_points', '=', $userBalance->rank_points)
                         ->where('total_wins', '>', $userBalance->total_wins);
                  });
            })
            ->count() + 1;

        return [
            'battle_rank' => $battleRank,
            'rank_rank' => $competitiveRank,
        ];
    }
}
