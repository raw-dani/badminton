<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('point_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_code', 40)->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('match_id')->nullable()->constrained('matches')->nullOnDelete();
            $table->enum('point_type', ['BATTLE', 'RANK'])->index();
            $table->enum('category', [
                'BATTLE_MATCH_WIN',
                'BATTLE_MATCH_LOSS',
                'RANKED_MATCH_ENTRY_DEDUCTION',
                'RANKED_MATCH_WIN',
                'RANKED_MATCH_LOSS',
                'RANKED_MATCH_REFUND',
                'ADMIN_ADJUSTMENT',
                'SEASON_ADJUSTMENT'
            ])->index();
            $table->integer('amount');
            $table->integer('previous_balance');
            $table->integer('new_balance');
            $table->string('description');
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('point_transactions');
    }
};
