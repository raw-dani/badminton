<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leaderboard_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('season_id')->nullable()->constrained('seasons')->nullOnDelete();
            $table->enum('type', ['BATTLE', 'RANK'])->index();
            $table->date('snapshot_date')->index();
            $table->unsignedInteger('rank_position');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('points');
            $table->timestamps();

            $table->index(['season_id', 'type', 'snapshot_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leaderboard_snapshots');
    }
};
