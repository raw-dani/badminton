<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seasons', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 50)->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false)->index();
            $table->enum('status', ['upcoming', 'active', 'completed', 'archived'])->default('upcoming')->index();
            $table->text('description')->nullable();
            $table->boolean('battle_point_reset')->default(false);
            $table->boolean('rank_point_reset')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seasons');
    }
};
