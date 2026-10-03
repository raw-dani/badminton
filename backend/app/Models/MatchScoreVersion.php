<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchScoreVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_id',
        'version',
        'submitted_by',
        'winning_team',
        'summary',
        'match_photo_url',
        'sets_data',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'sets_data' => 'array',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(GameMatch::class, 'match_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
