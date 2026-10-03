<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_score_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->unsignedInteger('version')->index();
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->string('winning_team', 10);
            $table->string('summary'); // e.g. "21-17, 18-21, 21-19"
            $table->json('sets_data');
            $table->timestamps();

            $table->unique(['match_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_score_versions');
    }
};
