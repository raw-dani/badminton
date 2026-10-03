<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchPlayer extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_id',
        'user_id',
        'team',
        'slot',
        'invitation_status',
        'invitation_responded_at',
        'points_earned',
        'point_type_earned',
    ];

    protected function casts(): array
    {
        return [
            'slot' => 'integer',
            'points_earned' => 'integer',
            'invitation_responded_at' => 'datetime',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(GameMatch::class, 'match_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
