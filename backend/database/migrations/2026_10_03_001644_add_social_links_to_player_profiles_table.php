<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('player_profiles', function (Blueprint $table) {
            $table->string('instagram', 150)->nullable()->after('preferred_position');
            $table->string('facebook', 150)->nullable()->after('instagram');
            $table->string('tiktok', 150)->nullable()->after('facebook');
            $table->string('youtube', 255)->nullable()->after('tiktok');
        });
    }

    public function down(): void
    {
        Schema::table('player_profiles', function (Blueprint $table) {
            $table->dropColumn(['instagram', 'facebook', 'tiktok', 'youtube']);
        });
    }
};
