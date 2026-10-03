<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaderboardSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'season_id',
        'type',
        'snapshot_date',
        'rank_position',
        'user_id',
        'points',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'rank_position' => 'integer',
            'points' => 'integer',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
