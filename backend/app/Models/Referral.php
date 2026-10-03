<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Referral extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_COMPLETED = 'COMPLETED';

    protected $fillable = [
        'referrer_id',
        'referred_id',
        'status',
        'reward_points',
        'first_match_id',
        'rewarded_at',
    ];

    protected function casts(): array
    {
        return [
            'reward_points' => 'integer',
            'rewarded_at' => 'datetime',
        ];
    }

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_id');
    }

    public function firstMatch(): BelongsTo
    {
        return $this->belongsTo(GameMatch::class, 'first_match_id');
    }
}
