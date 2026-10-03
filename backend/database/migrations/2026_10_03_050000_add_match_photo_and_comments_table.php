<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add match_photo_url to matches and match_score_versions
        if (Schema::hasTable('matches')) {
            Schema::table('matches', function (Blueprint $table) {
                if (!Schema::hasColumn('matches', 'match_photo_url')) {
                    $table->string('match_photo_url', 500)->nullable()->after('live_stream_url');
                }
            });
        }

        if (Schema::hasTable('match_score_versions')) {
            Schema::table('match_score_versions', function (Blueprint $table) {
                if (!Schema::hasColumn('match_score_versions', 'match_photo_url')) {
                    $table->string('match_photo_url', 500)->nullable()->after('summary');
                }
            });
        }

        // 2. Create match_comments table
        if (!Schema::hasTable('match_comments')) {
            Schema::create('match_comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->text('comment');
                $table->timestamps();

                $table->index(['match_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('match_comments');

        if (Schema::hasTable('match_score_versions')) {
            Schema::table('match_score_versions', function (Blueprint $table) {
                if (Schema::hasColumn('match_score_versions', 'match_photo_url')) {
                    $table->dropColumn('match_photo_url');
                }
            });
        }

        if (Schema::hasTable('matches')) {
            Schema::table('matches', function (Blueprint $table) {
                if (Schema::hasColumn('matches', 'match_photo_url')) {
                    $table->dropColumn('match_photo_url');
                }
            });
        }
    }
};
