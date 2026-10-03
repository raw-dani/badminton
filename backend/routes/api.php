<?php

use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AffiliateController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\LeaderboardController;
use App\Http\Controllers\Api\V1\MatchCommentController;
use App\Http\Controllers\Api\V1\MatchController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PlayerProfileController;
use App\Http\Controllers\Api\V1\PointController;
use App\Http\Controllers\Api\V1\SeasonController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Controllers\Api\V1\TeamWarController;
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
    Route::get('/seasons/{id}/leaderboards', [SeasonController::class, 'leaderboards'])->whereNumber('id');

    // Public matches browse & comments
    Route::get('/matches', [MatchController::class, 'index']);
    Route::get('/matches/{id}', [MatchController::class, 'show'])->whereNumber('id');
    Route::get('/matches/{id}/history', [MatchController::class, 'history'])->whereNumber('id');
    Route::get('/matches/{id}/comments', [MatchCommentController::class, 'index'])->whereNumber('id');

    // Public teams browse & leaderboard
    Route::get('/teams', [TeamController::class, 'index']);
    Route::get('/teams/leaderboard', [TeamWarController::class, 'leaderboard']);
    Route::get('/teams/{id}', [TeamController::class, 'show'])->whereNumber('id');

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

        // Teams & Team Management & Team Group Chat
        Route::get('/teams/my-team', [TeamController::class, 'myTeam']);
        Route::get('/teams/my-team/messages', [TeamController::class, 'getMessages']);
        Route::post('/teams/my-team/messages', [TeamController::class, 'sendMessage']);
        Route::post('/teams', [TeamController::class, 'store']);
        Route::post('/teams/{id}/upgrade-quota', [TeamController::class, 'upgradeQuota'])->whereNumber('id');
        Route::post('/teams/{id}/join', [TeamController::class, 'join'])->whereNumber('id');
        Route::post('/teams/{id}/leave', [TeamController::class, 'leave'])->whereNumber('id');
        Route::put('/teams/{id}/members/{memberId}/role', [TeamController::class, 'changeMemberRole'])->whereNumber('id')->whereNumber('memberId');
        Route::delete('/teams/{id}/members/{memberId}', [TeamController::class, 'kickMember'])->whereNumber('id')->whereNumber('memberId');

        // Team Wars & Challenges
        Route::get('/teams/wars', [TeamWarController::class, 'index']);
        Route::get('/teams/wars/{id}', [TeamWarController::class, 'show'])->whereNumber('id');
        Route::post('/teams/wars', [TeamWarController::class, 'store']);
        Route::post('/teams/wars/{id}/accept', [TeamWarController::class, 'accept'])->whereNumber('id');
        Route::post('/teams/wars/{id}/reject', [TeamWarController::class, 'reject'])->whereNumber('id');
        Route::post('/teams/wars/{id}/cancel', [TeamWarController::class, 'cancel'])->whereNumber('id');
        Route::put('/teams/wars/{id}/schedule', [TeamWarController::class, 'updateSchedule'])->whereNumber('id');
        Route::post('/teams/wars/{id}/matches', [TeamWarController::class, 'createMatch'])->whereNumber('id');

        // Matches workflow
        Route::post('/matches', [MatchController::class, 'store']);
        Route::post('/matches/{id}/cancel', [MatchController::class, 'cancel'])->whereNumber('id');
        Route::post('/matches/{id}/accept', [MatchController::class, 'acceptInvitation'])->whereNumber('id');
        Route::post('/matches/{id}/reject', [MatchController::class, 'rejectInvitation'])->whereNumber('id');
        Route::post('/matches/{id}/score', [MatchController::class, 'submitScore'])->whereNumber('id');
        Route::post('/matches/{id}/approve', [MatchController::class, 'approveScore'])->whereNumber('id');
        Route::post('/matches/{id}/dispute', [MatchController::class, 'disputeScore'])->whereNumber('id');
        Route::post('/matches/{id}/comments', [MatchCommentController::class, 'store'])->whereNumber('id');
        Route::delete('/matches/{id}/comments/{commentId}', [MatchCommentController::class, 'destroy'])->whereNumber('id')->whereNumber('commentId');

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->whereNumber('id');
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        // -------------------------------------------------------------
        // Administrator Endpoints
        // -------------------------------------------------------------
        Route::prefix('admin')->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);
            Route::get('/users', [AdminController::class, 'users']);
            Route::post('/users', [AdminController::class, 'createUser']);
            Route::post('/users/{id}/toggle-status', [AdminController::class, 'toggleUserStatus']);
            Route::post('/users/{id}/change-role', [AdminController::class, 'changeUserRole']);
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
