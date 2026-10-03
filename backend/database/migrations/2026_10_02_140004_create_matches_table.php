<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->string('match_code', 30)->unique();
            $table->foreignId('season_id')->constrained('seasons')->cascadeOnDelete();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['BATTLE', 'RANKED'])->index();
            $table->enum('mode', ['SINGLES', 'DOUBLES'])->index();
            $table->string('venue');
            $table->dateTime('scheduled_at');
            $table->text('description')->nullable();
            $table->enum('status', [
                'PENDING_ACCEPTANCE',
                'READY',
                'IN_PROGRESS',
                'WAITING_APPROVAL',
                'COMPLETED',
                'DISPUTED',
                'CANCELLED',
                'REJECTED'
            ])->default('PENDING_ACCEPTANCE')->index();
            $table->enum('winning_team', ['TEAM_A', 'TEAM_B'])->nullable();
            $table->unsignedInteger('current_score_version')->default(1);
            $table->boolean('battle_deducted')->default(false);
            $table->boolean('points_awarded')->default(false);
            $table->timestamp('points_awarded_at')->nullable();
            $table->text('cancelled_reason')->nullable();
            $table->text('dispute_reason')->nullable();
            $table->foreignId('disputed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('admin_resolution_note')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
