<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('season_player_statistics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('season_id')->constrained('seasons')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('rank_points')->default(0)->index();
            $table->integer('battle_points')->default(0)->index();
            $table->integer('matches_played')->default(0);
            $table->integer('wins')->default(0);
            $table->integer('losses')->default(0);
            $table->unsignedInteger('final_rank_position')->nullable();
            $table->timestamps();

            $table->unique(['season_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('season_player_statistics');
    }
};
