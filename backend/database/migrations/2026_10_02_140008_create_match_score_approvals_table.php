<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_score_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->unsignedInteger('version')->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['APPROVED', 'DISPUTED'])->index();
            $table->text('dispute_reason')->nullable();
            $table->timestamps();

            $table->unique(['match_id', 'version', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_score_approvals');
    }
};
