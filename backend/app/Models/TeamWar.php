<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeamWar extends Model
{
    use HasFactory;

    protected $table = 'team_wars';

    protected $fillable = [
        'war_code',
        'season_id',
        'challenger_team_id',
        'challenged_team_id',
        'created_by_user_id',
        'total_matches',
        'scheduled_at',
        'venue',
        'notes',
        'challenger_score',
        'challenged_score',
        'winner_team_id',
        'status',
        'accepted_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'total_matches' => 'integer',
            'challenger_score' => 'integer',
            'challenged_score' => 'integer',
            'scheduled_at' => 'datetime',
            'accepted_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function challengerTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'challenger_team_id');
    }

    public function challengedTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'challenged_team_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function winnerTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'winner_team_id');
    }

    public function matches(): HasMany
    {
        return $this->hasMany(GameMatch::class, 'team_war_id');
    }
}
