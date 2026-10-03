<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeasonPlayerStatistic extends Model
{
    use HasFactory;

    protected $fillable = [
        'season_id',
        'user_id',
        'rank_points',
        'battle_points',
        'matches_played',
        'wins',
        'losses',
        'final_rank_position',
    ];

    protected function casts(): array
    {
        return [
            'rank_points' => 'integer',
            'battle_points' => 'integer',
            'matches_played' => 'integer',
            'wins' => 'integer',
            'losses' => 'integer',
            'final_rank_position' => 'integer',
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

    public function getWinRateAttribute(): float
    {
        if ($this->matches_played === 0) {
            return 0.0;
        }
        return round(($this->wins / $this->matches_played) * 100, 1);
    }
}
