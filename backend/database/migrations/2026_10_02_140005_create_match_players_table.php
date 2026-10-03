<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('team', ['TEAM_A', 'TEAM_B'])->index();
            $table->tinyInteger('slot')->default(1);
            $table->enum('invitation_status', ['PENDING', 'ACCEPTED', 'REJECTED'])->default('PENDING')->index();
            $table->timestamp('invitation_responded_at')->nullable();
            $table->integer('points_earned')->default(0);
            $table->enum('point_type_earned', ['BATTLE', 'RANK'])->nullable();
            $table->timestamps();

            $table->unique(['match_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_players');
    }
};
