<?php

namespace App\Services;

use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use App\Models\Season;
use App\Models\SeasonPlayerStatistic;
use Illuminate\Support\Facades\DB;

class RankPointService
{
    public function __construct(
        protected PointTransactionService $transactionService
    ) {}

    /**
     * Adjust a player's Rank Points.
     * Supports and allows negative Rank Points per system policy.
     */
    public function adjustPoints(
        int $userId,
        int $changeAmount,
        string $category,
        string $description,
        ?int $matchId = null,
        ?string $idempotencyKey = null,
        ?int $actorId = null,
        ?int $seasonId = null
    ): PlayerPointBalance {
        return DB::transaction(function () use (
            $userId,
            $changeAmount,
            $category,
            $description,
            $matchId,
            $idempotencyKey,
            $actorId,
            $seasonId
        ) {
            // Check idempotency first
            if ($idempotencyKey) {
                $existingTx = PointTransaction::where('idempotency_key', $idempotencyKey)->first();
                if ($existingTx) {
                    return PlayerPointBalance::firstOrCreate(['user_id' => $userId]);
                }
            }

            $balance = PlayerPointBalance::where('user_id', $userId)
                ->lockForUpdate()
                ->first();

            if (!$balance) {
                $balance = PlayerPointBalance::create([
                    'user_id' => $userId,
                    'battle_points' => 0,
                    'rank_points' => 0,
                ]);
                $balance = PlayerPointBalance::where('id', $balance->id)->lockForUpdate()->first();
            }

            $previousBalance = $balance->rank_points;
            $newBalance = $previousBalance + $changeAmount; // Negative values allowed!

            $balance->rank_points = $newBalance;
            $balance->save();

            // Record immutable ledger entry
            $this->transactionService->record(
                userId: $userId,
                pointType: PointTransaction::TYPE_RANK,
                category: $category,
                amount: $changeAmount,
                previousBalance: $previousBalance,
                newBalance: $newBalance,
                description: $description,
                matchId: $matchId,
                idempotencyKey: $idempotencyKey,
                actorId: $actorId
            );

            // Update seasonal statistics if a season is active or provided
            $targetSeasonId = $seasonId ?? Season::where('is_active', true)->value('id');
            if ($targetSeasonId) {
                $seasonStat = SeasonPlayerStatistic::firstOrCreate(
                    ['season_id' => $targetSeasonId, 'user_id' => $userId],
                    ['rank_points' => 0, 'battle_points' => 0, 'matches_played' => 0, 'wins' => 0, 'losses' => 0]
                );
                $seasonStat->increment('rank_points', $changeAmount);
            }

            return $balance;
        });
    }

    /**
     * Get player's current Rank Points (can be negative).
     */
    public function getBalance(int $userId): int
    {
        $balance = PlayerPointBalance::where('user_id', $userId)->first();
        return $balance ? $balance->rank_points : 0;
    }
}
