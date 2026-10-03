<?php

namespace App\Services;

use App\Models\PointTransaction;
use App\Models\User;
use Exception;
use Illuminate\Support\Str;

class PointTransactionService
{
    /**
     * Record an immutable point transaction in the ledger.
     */
    public function record(
        int $userId,
        string $pointType,
        string $category,
        int $amount,
        int $previousBalance,
        int $newBalance,
        string $description,
        ?int $matchId = null,
        ?string $idempotencyKey = null,
        ?int $actorId = null
    ): PointTransaction {
        if ($idempotencyKey) {
            $existing = PointTransaction::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }
        }

        $code = sprintf('TX-%s-%s-%s', $pointType, date('YmdHis'), strtoupper(Str::random(6)));

        return PointTransaction::create([
            'transaction_code' => $code,
            'user_id' => $userId,
            'match_id' => $matchId,
            'point_type' => $pointType,
            'category' => $category,
            'amount' => $amount,
            'previous_balance' => $previousBalance,
            'new_balance' => $newBalance,
            'description' => $description,
            'idempotency_key' => $idempotencyKey,
            'actor_id' => $actorId,
        ]);
    }
}
