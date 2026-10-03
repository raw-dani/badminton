<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Team Season Scores (Leaderboard & points per season)
        if (!Schema::hasTable('team_season_scores')) {
            Schema::create('team_season_scores', function (Blueprint $table) {
                $table->id();
                $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
                $table->foreignId('season_id')->constrained('seasons')->cascadeOnDelete();
                $table->integer('score')->default(0)->index();
                $table->integer('matches_played')->default(0);
                $table->integer('regular_points')->default(0);
                $table->integer('war_matches_played')->default(0);
                $table->integer('war_wins')->default(0);
                $table->integer('war_losses')->default(0);
                $table->integer('war_points')->default(0);
                $table->timestamps();

                $table->unique(['team_id', 'season_id']);
            });
        }

        // 2. Team Wars (Inter-team battle challenges & scheduling)
        if (!Schema::hasTable('team_wars')) {
            Schema::create('team_wars', function (Blueprint $table) {
                $table->id();
                $table->string('war_code', 32)->unique();
                $table->foreignId('season_id')->nullable()->constrained('seasons')->nullOnDelete();
                $table->foreignId('challenger_team_id')->constrained('teams')->cascadeOnDelete();
                $table->foreignId('challenged_team_id')->constrained('teams')->cascadeOnDelete();
                $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
                $table->integer('total_matches')->default(5);
                $table->dateTime('scheduled_at')->nullable();
                $table->string('venue', 255)->nullable();
                $table->text('notes')->nullable();
                $table->integer('challenger_score')->default(0);
                $table->integer('challenged_score')->default(0);
                $table->foreignId('winner_team_id')->nullable()->constrained('teams')->nullOnDelete();
                $table->enum('status', [
                    'PENDING',
                    'ACCEPTED',
                    'REJECTED',
                    'IN_PROGRESS',
                    'COMPLETED',
                    'CANCELLED'
                ])->default('PENDING')->index();
                $table->timestamp('accepted_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index(['challenger_team_id', 'status']);
                $table->index(['challenged_team_id', 'status']);
            });
        }

        // 3. Add War reference columns to matches table
        if (Schema::hasTable('matches')) {
            Schema::table('matches', function (Blueprint $table) {
                if (!Schema::hasColumn('matches', 'team_war_id')) {
                    $table->foreignId('team_war_id')->nullable()->constrained('team_wars')->nullOnDelete();
                }
                if (!Schema::hasColumn('matches', 'team_a_team_id')) {
                    $table->foreignId('team_a_team_id')->nullable()->constrained('teams')->nullOnDelete();
                }
                if (!Schema::hasColumn('matches', 'team_b_team_id')) {
                    $table->foreignId('team_b_team_id')->nullable()->constrained('teams')->nullOnDelete();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('matches')) {
            Schema::table('matches', function (Blueprint $table) {
                if (Schema::hasColumn('matches', 'team_war_id')) {
                    $table->dropForeign(['team_war_id']);
                    $table->dropColumn('team_war_id');
                }
                if (Schema::hasColumn('matches', 'team_a_team_id')) {
                    $table->dropForeign(['team_a_team_id']);
                    $table->dropColumn('team_a_team_id');
                }
                if (Schema::hasColumn('matches', 'team_b_team_id')) {
                    $table->dropForeign(['team_b_team_id']);
                    $table->dropColumn('team_b_team_id');
                }
            });
        }

        Schema::dropIfExists('team_wars');
        Schema::dropIfExists('team_season_scores');
    }
};
