<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamSeasonScore extends Model
{
    use HasFactory;

    protected $table = 'team_season_scores';

    protected $fillable = [
        'team_id',
        'season_id',
        'score',
        'matches_played',
        'regular_points',
        'war_matches_played',
        'war_wins',
        'war_losses',
        'war_points',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'matches_played' => 'integer',
            'regular_points' => 'integer',
            'war_matches_played' => 'integer',
            'war_wins' => 'integer',
            'war_losses' => 'integer',
            'war_points' => 'integer',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }
}
