<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'username',
        'email',
        'phone',
        'role',
        'status',
        'referred_by_id',
        'password',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function profile(): HasOne
    {
        return $this->hasOne(PlayerProfile::class);
    }

    public function pointBalance(): HasOne
    {
        return $this->hasOne(PlayerPointBalance::class);
    }

    public function matchPlayers(): HasMany
    {
        return $this->hasMany(MatchPlayer::class);
    }

    public function matchesCreated(): HasMany
    {
        return $this->hasMany(GameMatch::class, 'creator_id');
    }

    public function pointTransactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class);
    }

    public function userNotifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function seasonStatistics(): HasMany
    {
        return $this->hasMany(SeasonPlayerStatistic::class);
    }

    public function invitationsReceived(): HasMany
    {
        return $this->hasMany(MatchInvitation::class, 'invited_user_id');
    }

    public function scoreApprovals(): HasMany
    {
        return $this->hasMany(MatchScoreApproval::class);
    }

    public function referredBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_by_id');
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(Referral::class, 'referrer_id');
    }

    public function referralRecord(): HasOne
    {
        return $this->hasOne(Referral::class, 'referred_id');
    }

    public function teamMembership(): HasOne
    {
        return $this->hasOne(TeamMember::class)->where('status', 'ACTIVE');
    }

    public function isInTeam(): bool
    {
        return $this->teamMembership()->exists();
    }
}

