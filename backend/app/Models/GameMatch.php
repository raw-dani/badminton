<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GameMatch extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'matches';

    protected $fillable = [
        'match_code',
        'season_id',
        'creator_id',
        'type',
        'mode',
        'venue',
        'scheduled_at',
        'description',
        'live_stream_url',
        'status',
        'winning_team',
        'current_score_version',
        'battle_deducted',
        'points_awarded',
        'points_awarded_at',
        'cancelled_reason',
        'dispute_reason',
        'disputed_by',
        'admin_resolution_note',
        'team_war_id',
        'team_a_team_id',
        'team_b_team_id',
    ];

    protected $appends = ['current_scores', 'current_approvals'];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'current_score_version' => 'integer',
            'battle_deducted' => 'boolean',
            'points_awarded' => 'boolean',
            'points_awarded_at' => 'datetime',
        ];
    }

    public function teamWar(): BelongsTo
    {
        return $this->belongsTo(TeamWar::class, 'team_war_id');
    }

    public function teamA(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_a_team_id');
    }

    public function teamB(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_b_team_id');
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function disputer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disputed_by');
    }

    public function matchPlayers(): HasMany
    {
        return $this->hasMany(MatchPlayer::class, 'match_id');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(MatchScore::class, 'match_id');
    }

    public function currentScores(): HasMany
    {
        return $this->hasMany(MatchScore::class, 'match_id')
            ->where('version', $this->current_score_version)
            ->orderBy('set_number');
    }

    public function getCurrentScoresAttribute()
    {
        if ($this->relationLoaded('scores')) {
            return $this->scores->where('version', $this->current_score_version)->values();
        }
        return MatchScore::where('match_id', $this->id)
            ->where('version', $this->current_score_version)
            ->orderBy('set_number')
            ->get();
    }

    public function scoreVersions(): HasMany
    {
        return $this->hasMany(MatchScoreVersion::class, 'match_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(MatchScoreApproval::class, 'match_id');
    }

    public function currentApprovals(): HasMany
    {
        return $this->hasMany(MatchScoreApproval::class, 'match_id')
            ->where('version', $this->current_score_version);
    }

    public function getCurrentApprovalsAttribute()
    {
        if ($this->relationLoaded('approvals')) {
            return $this->approvals->where('version', $this->current_score_version)->values();
        }
        return MatchScoreApproval::where('match_id', $this->id)
            ->where('version', $this->current_score_version)
            ->with('user.profile')
            ->get();
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(MatchInvitation::class, 'match_id');
    }

    public function pointTransactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class, 'match_id');
    }

    public function isPlayerInMatch(int $userId): bool
    {
        return $this->matchPlayers->contains('user_id', $userId);
    }

    public function expectedPlayerCount(): int
    {
        return $this->mode === 'SINGLES' ? 2 : 4;
    }

    public function areAllPlayersAccepted(): bool
    {
        $players = $this->matchPlayers;
        if ($players->count() !== $this->expectedPlayerCount()) {
            return false;
        }
        return $players->every(fn($p) => $p->invitation_status === 'ACCEPTED');
    }

    public function areAllPlayersApprovedCurrentVersion(): bool
    {
        $players = $this->matchPlayers;
        $expectedCount = $this->expectedPlayerCount();
        if ($players->count() !== $expectedCount) {
            return false;
        }

        $approvals = MatchScoreApproval::where('match_id', $this->id)
            ->where('version', $this->current_score_version)
            ->where('status', 'APPROVED')
            ->pluck('user_id')
            ->all();

        $playerIds = $players->pluck('user_id')->all();

        return count(array_intersect($playerIds, $approvals)) === $expectedCount;
    }
}
