<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchScore extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_id',
        'version',
        'set_number',
        'team_a_score',
        'team_b_score',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'set_number' => 'integer',
            'team_a_score' => 'integer',
            'team_b_score' => 'integer',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(GameMatch::class, 'match_id');
    }
}
