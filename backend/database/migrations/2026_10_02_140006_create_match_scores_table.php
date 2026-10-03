<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1)->index();
            $table->unsignedTinyInteger('set_number');
            $table->unsignedSmallInteger('team_a_score');
            $table->unsignedSmallInteger('team_b_score');
            $table->timestamps();

            $table->unique(['match_id', 'version', 'set_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_scores');
    }
};
