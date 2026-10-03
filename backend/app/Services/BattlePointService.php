<?php

namespace App\Services;

use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class BattlePointService
{
    public function __construct(
        protected PointTransactionService $transactionService
    ) {}

    /**
     * Adjust a player's Battle Points.
     * Throws InvalidArgumentException if resulting balance would be negative.
     */
    public function adjustPoints(
        int $userId,
        int $changeAmount,
        string $category,
        string $description,
        ?int $matchId = null,
        ?string $idempotencyKey = null,
        ?int $actorId = null
    ): PlayerPointBalance {
        return DB::transaction(function () use (
            $userId,
            $changeAmount,
            $category,
            $description,
            $matchId,
            $idempotencyKey,
            $actorId
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

            $previousBalance = $balance->battle_points;
            $newBalance = $previousBalance + $changeAmount;

            // Enforce mandatory rule: Battle Points must NEVER become negative
            if ($newBalance < 0) {
                throw new InvalidArgumentException(sprintf(
                    'Battle Points cannot become negative. User #%d current balance: %d, requested deduction: %d.',
                    $userId,
                    $previousBalance,
                    abs($changeAmount)
                ));
            }

            $balance->battle_points = $newBalance;
            $balance->save();

            // Record immutable ledger entry
            $this->transactionService->record(
                userId: $userId,
                pointType: PointTransaction::TYPE_BATTLE,
                category: $category,
                amount: $changeAmount,
                previousBalance: $previousBalance,
                newBalance: $newBalance,
                description: $description,
                matchId: $matchId,
                idempotencyKey: $idempotencyKey,
                actorId: $actorId
            );

            return $balance;
        });
    }

    /**
     * Check if a player has at least the required Battle Points.
     */
    public function hasSufficientPoints(int $userId, int $requiredPoints = 3): bool
    {
        $balance = PlayerPointBalance::where('user_id', $userId)->first();
        return ($balance ? $balance->battle_points : 0) >= $requiredPoints;
    }

    /**
     * Get player's current Battle Points.
     */
    public function getBalance(int $userId): int
    {
        $balance = PlayerPointBalance::where('user_id', $userId)->first();
        return $balance ? $balance->battle_points : 0;
    }
}
