<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Season extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'start_date',
        'end_date',
        'is_active',
        'status',
        'description',
        'battle_point_reset',
        'rank_point_reset',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
            'battle_point_reset' => 'boolean',
            'rank_point_reset' => 'boolean',
        ];
    }

    public function matches(): HasMany
    {
        return $this->hasMany(GameMatch::class);
    }

    public function playerStatistics(): HasMany
    {
        return $this->hasMany(SeasonPlayerStatistic::class);
    }
}
