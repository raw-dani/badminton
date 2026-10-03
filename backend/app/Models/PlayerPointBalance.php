<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerPointBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'battle_points',
        'rank_points',
        'total_matches',
        'battle_matches',
        'ranked_matches',
        'total_wins',
        'total_losses',
        'singles_wins',
        'singles_losses',
        'doubles_wins',
        'doubles_losses',
        'current_streak',
        'longest_streak',
    ];

    protected function casts(): array
    {
        return [
            'battle_points' => 'integer',
            'rank_points' => 'integer',
            'total_matches' => 'integer',
            'battle_matches' => 'integer',
            'ranked_matches' => 'integer',
            'total_wins' => 'integer',
            'total_losses' => 'integer',
            'singles_wins' => 'integer',
            'singles_losses' => 'integer',
            'doubles_wins' => 'integer',
            'doubles_losses' => 'integer',
            'current_streak' => 'integer',
            'longest_streak' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getWinRateAttribute(): float
    {
        if ($this->total_matches === 0) {
            return 0.0;
        }
        return round(($this->total_wins / $this->total_matches) * 100, 1);
    }
}
