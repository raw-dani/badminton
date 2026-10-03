<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'logo_url',
        'city',
        'creator_id',
        'max_members',
        'battle_points_spent',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'max_members' => 'integer',
            'battle_points_spent' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    public function activeMembers(): HasMany
    {
        return $this->hasMany(TeamMember::class)->where('status', 'ACTIVE');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TeamMessage::class);
    }

    public function isMember(int $userId): bool
    {
        return $this->activeMembers()->where('user_id', $userId)->exists();
    }

    public function isLeaderOrAdmin(int $userId): bool
    {
        return $this->activeMembers()
            ->where('user_id', $userId)
            ->whereIn('role', ['LEADER', 'ADMIN'])
            ->exists();
    }
}
