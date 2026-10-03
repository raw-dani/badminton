<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add referred_by_id to users table
        if (!Schema::hasColumn('users', 'referred_by_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('referred_by_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
            });
        }

        // 2. Create referrals tracking table
        if (!Schema::hasTable('referrals')) {
            Schema::create('referrals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('referrer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('referred_id')->constrained('users')->cascadeOnDelete();
                $table->enum('status', ['PENDING', 'COMPLETED'])->default('PENDING')->index();
                $table->integer('reward_points')->default(100);
                $table->foreignId('first_match_id')->nullable()->constrained('matches')->nullOnDelete();
                $table->timestamp('rewarded_at')->nullable();
                $table->timestamps();

                $table->unique('referred_id'); // Each user can only be referred once
                $table->index(['referrer_id', 'status']);
            });
        }

        // 3. Alter point_transactions category column to VARCHAR(50) so new categories like AFFILIATE_REWARD are supported seamlessly
        try {
            DB::statement("ALTER TABLE point_transactions MODIFY COLUMN category VARCHAR(50) NOT NULL");
        } catch (\Throwable $e) {
            // In case of non-mysql or existing type
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('referrals');
        if (Schema::hasColumn('users', 'referred_by_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['referred_by_id']);
                $table->dropColumn('referred_by_id');
            });
        }
    }
};
