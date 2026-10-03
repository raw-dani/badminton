<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('player_code', 30)->unique();
            $table->string('avatar_url')->nullable();
            $table->string('city', 100)->nullable()->index();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->text('bio')->nullable();
            $table->enum('preferred_position', ['singles', 'doubles_front', 'doubles_back', 'all_round'])->nullable();
            $table->enum('visibility', ['public', 'private'])->default('public')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_profiles');
    }
};
