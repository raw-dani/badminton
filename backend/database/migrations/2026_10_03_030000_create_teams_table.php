<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Teams table
        if (!Schema::hasTable('teams')) {
            Schema::create('teams', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100)->unique();
                $table->string('code', 30)->unique();
                $table->text('description')->nullable();
                $table->string('logo_url', 500)->nullable();
                $table->string('city', 100)->nullable();
                $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
                $table->integer('max_members')->default(10);
                $table->integer('battle_points_spent')->default(1000);
                $table->enum('status', ['ACTIVE', 'DISBANDED'])->default('ACTIVE')->index();
                $table->timestamps();
            });
        }

        // 2. Team Members table
        if (!Schema::hasTable('team_members')) {
            Schema::create('team_members', function (Blueprint $table) {
                $table->id();
                $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->enum('role', ['LEADER', 'ADMIN', 'MEMBER'])->default('MEMBER');
                $table->enum('status', ['ACTIVE', 'PENDING'])->default('ACTIVE')->index();
                $table->timestamp('joined_at')->nullable();
                $table->timestamps();

                $table->unique(['team_id', 'user_id']);
                $table->index(['user_id', 'status']);
            });
        }

        // 3. Team Messages (Group Chat) table
        if (!Schema::hasTable('team_messages')) {
            Schema::create('team_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->text('message');
                $table->timestamps();

                $table->index(['team_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('team_messages');
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
    }
};
