<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_point_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->integer('battle_points')->default(0)->index();
            $table->integer('rank_points')->default(0)->index(); // Allowed negative
            $table->integer('total_matches')->default(0);
            $table->integer('battle_matches')->default(0);
            $table->integer('ranked_matches')->default(0);
            $table->integer('total_wins')->default(0);
            $table->integer('total_losses')->default(0);
            $table->integer('singles_wins')->default(0);
            $table->integer('singles_losses')->default(0);
            $table->integer('doubles_wins')->default(0);
            $table->integer('doubles_losses')->default(0);
            $table->integer('current_streak')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_point_balances');
    }
};
