<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('invited_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('team', ['TEAM_A', 'TEAM_B']);
            $table->enum('status', ['PENDING', 'ACCEPTED', 'REJECTED'])->default('PENDING')->index();
            $table->string('response_note')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['match_id', 'invited_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_invitations');
    }
};
