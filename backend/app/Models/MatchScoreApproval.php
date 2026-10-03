<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchScoreApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_id',
        'version',
        'user_id',
        'status',
        'dispute_reason',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
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
