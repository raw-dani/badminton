<?php

use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AffiliateController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\LeaderboardController;
use App\Http\Controllers\Api\V1\MatchController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PlayerProfileController;
use App\Http\Controllers\Api\V1\PointController;
use App\Http\Controllers\Api\V1\SeasonController;
use Illuminate\Support\Facades\Route;

// Health check endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'app' => 'Badminton Champion League API',
        'version' => '1.0.0',
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('v1')->group(function () {

    // -------------------------------------------------------------
    // Public Endpoints
    // -------------------------------------------------------------
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    // Public leaderboards
    Route::get('/leaderboards/battle', [LeaderboardController::class, 'battle']);
    Route::get('/leaderboards/rank', [LeaderboardController::class, 'rank']);

    // Public player profiles
    Route::get('/players', [PlayerProfileController::class, 'index']);
    Route::get('/players/{id}', [PlayerProfileController::class, 'show']);
    Route::get('/players/{id}/statistics', [PlayerProfileController::class, 'getStatistics']);
    Route::get('/players/{id}/matches', [PlayerProfileController::class, 'getMatches']);

    // Public seasons
    Route::get('/seasons', [SeasonController::class, 'index']);
    Route::get('/seasons/active', [SeasonController::class, 'active']);
    Route::get('/seasons/{id}/leaderboards', [SeasonController::class, 'leaderboards']);

    // Public matches browse
    Route::get('/matches', [MatchController::class, 'index']);
    Route::get('/matches/{id}', [MatchController::class, 'show']);
    Route::get('/matches/{id}/history', [MatchController::class, 'history']);

    // -------------------------------------------------------------
    // Authenticated Endpoints
    // -------------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function () {

        // Auth management
        Route::prefix('auth')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/refresh', [AuthController::class, 'refresh']);
        });

        // Profile self-management
        Route::put('/players/profile', [PlayerProfileController::class, 'updateProfile']);
        Route::post('/players/profile/photo', [PlayerProfileController::class, 'uploadAvatar']);

        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Points
        Route::get('/points/balance', [PointController::class, 'balance']);
        Route::get('/points/transactions', [PointController::class, 'transactions']);

        // Affiliate program
        Route::get('/affiliate/stats', [AffiliateController::class, 'stats']);

        // Matches workflow
        Route::post('/matches', [MatchController::class, 'store']);
        Route::post('/matches/{id}/cancel', [MatchController::class, 'cancel']);
        Route::post('/matches/{id}/accept', [MatchController::class, 'acceptInvitation']);
        Route::post('/matches/{id}/reject', [MatchController::class, 'rejectInvitation']);
        Route::post('/matches/{id}/score', [MatchController::class, 'submitScore']);
        Route::post('/matches/{id}/approve', [MatchController::class, 'approveScore']);
        Route::post('/matches/{id}/dispute', [MatchController::class, 'disputeScore']);

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        // -------------------------------------------------------------
        // Administrator Endpoints
        // -------------------------------------------------------------
        Route::prefix('admin')->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);
            Route::get('/users', [AdminController::class, 'users']);
            Route::post('/users/{id}/toggle-status', [AdminController::class, 'toggleUserStatus']);
            Route::get('/matches', [AdminController::class, 'matches']);
            Route::get('/disputes', [AdminController::class, 'disputes']);
            Route::post('/disputes/{id}/resolve', [AdminController::class, 'resolveDispute']);
            Route::post('/points/adjust', [AdminController::class, 'adjustPoints']);
            Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
            Route::get('/settings', [AdminController::class, 'settings']);
            Route::post('/settings', [AdminController::class, 'updateSetting']);
        });
    });
});
