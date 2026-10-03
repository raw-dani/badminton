<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointTransaction extends Model
{
    use HasFactory;

    public const TYPE_BATTLE = 'BATTLE';
    public const TYPE_RANK = 'RANK';

    public const CAT_BATTLE_MATCH_WIN = 'BATTLE_MATCH_WIN';
    public const CAT_BATTLE_MATCH_LOSS = 'BATTLE_MATCH_LOSS';
    public const CAT_RANKED_MATCH_ENTRY_DEDUCTION = 'RANKED_MATCH_ENTRY_DEDUCTION';
    public const CAT_RANKED_MATCH_WIN = 'RANKED_MATCH_WIN';
    public const CAT_RANKED_MATCH_LOSS = 'RANKED_MATCH_LOSS';
    public const CAT_RANKED_MATCH_REFUND = 'RANKED_MATCH_REFUND';
    public const CAT_AFFILIATE_REWARD = 'AFFILIATE_REWARD';
    public const CAT_TEAM_CREATION = 'TEAM_CREATION';
    public const CAT_TEAM_UPGRADE = 'TEAM_UPGRADE';
    public const CAT_ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT';
    public const CAT_SEASON_ADJUSTMENT = 'SEASON_ADJUSTMENT';

    protected $fillable = [
        'transaction_code',
        'user_id',
        'match_id',
        'point_type',
        'category',
        'amount',
        'previous_balance',
        'new_balance',
        'description',
        'idempotency_key',
        'actor_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'previous_balance' => 'integer',
            'new_balance' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(GameMatch::class, 'match_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
