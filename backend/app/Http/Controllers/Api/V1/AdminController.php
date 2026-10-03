<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\GameMatch;
use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use App\Models\Season;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\BattlePointService;
use App\Services\MatchResultService;
use App\Services\NotificationService;
use App\Services\RankPointService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AdminController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected BattlePointService $battlePointService,
        protected RankPointService $rankPointService,
        protected MatchResultService $matchResultService,
        protected AuditLogService $auditLogService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Helper to verify admin authorization.
     */
    protected function authorizeAdmin(): void
    {
        if (!Auth::check() || !Auth::user()->isAdmin()) {
            abort(403, 'Unauthorized. Administrator access required.');
        }
    }

    /**
     * Admin dashboard summary metrics.
     */
    public function dashboard(): JsonResponse
    {
        $this->authorizeAdmin();

        $totalUsers = User::count();
        $totalMatches = GameMatch::count();
        $disputedMatches = GameMatch::where('status', 'DISPUTED')->count();
        $completedMatches = GameMatch::where('status', 'COMPLETED')->count();
        $activeSeason = Season::where('is_active', true)->first();

        $recentDisputes = GameMatch::where('status', 'DISPUTED')
            ->with(['creator.profile', 'disputer.profile', 'matchPlayers.user.profile'])
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get();

        $recentAuditLogs = AuditLog::with('user')
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        return $this->success([
            'metrics' => [
                'total_users' => $totalUsers,
                'total_matches' => $totalMatches,
                'disputed_matches' => $disputedMatches,
                'completed_matches' => $completedMatches,
                'active_season' => $activeSeason?->name,
            ],
            'recent_disputes' => $recentDisputes,
            'recent_audit_logs' => $recentAuditLogs,
        ], 'Admin metrics');
    }

    /**
     * List all users for user management.
     */
    public function users(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $search = $request->query('search');
        $role = $request->query('role');
        $status = $request->query('status');
        $perPage = (int) $request->query('per_page', 20);

        $query = User::with(['profile', 'pointBalance'])->orderByDesc('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role) {
            $query->where('role', $role);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $users = $query->paginate($perPage);

        return $this->success($users, 'Users retrieved.');
    }

    /**
     * Activate or suspend a user account.
     */
    public function toggleUserStatus(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();

        $user = User::findOrFail($id);
        $adminId = Auth::id();

        if ($user->id === $adminId) {
            return $this->error('Administrators cannot suspend their own account.', 400);
        }

        $newStatus = $user->status === 'active' ? 'suspended' : 'active';
        $reason = $request->input('reason', "Status changed to {$newStatus} by admin");

        $oldStatus = $user->status;
        $user->status = $newStatus;
        $user->save();

        $this->auditLogService->log(
            action: 'USER_STATUS_CHANGE',
            auditable: $user,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => $newStatus],
            reason: $reason,
            userId: $adminId
        );

        return $this->success($user, "User account has been {$newStatus}.");
    }

    /**
     * List all matches with admin inspection data.
     */
    public function matches(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $status = $request->query('status');
        $type = $request->query('type');
        $perPage = (int) $request->query('per_page', 20);

        $query = GameMatch::with([
            'creator.profile',
            'matchPlayers.user.profile',
            'currentScores',
            'currentApprovals.user',
        ])->orderByDesc('scheduled_at');

        if ($status) {
            $query->where('status', strtoupper($status));
        }

        if ($type) {
            $query->where('type', strtoupper($type));
        }

        $matches = $query->paginate($perPage);

        return $this->success($matches, 'Matches retrieved.');
    }

    /**
     * List disputed matches or dispute resolution history.
     */
    public function disputes(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $status = $request->query('status', 'active'); // 'active' or 'history'

        $query = GameMatch::query()
            ->with([
                'creator.profile',
                'disputer.profile',
                'matchPlayers.user.profile',
                'scores',
                'approvals.user.profile',
                'scoreVersions.submitter.profile',
            ]);

        if ($status === 'history') {
            // Matches that were disputed and resolved with admin note
            $query->whereNotNull('admin_resolution_note')
                ->whereIn('status', ['COMPLETED', 'CANCELLED'])
                ->orderByDesc('updated_at');
        } else {
            $query->where('status', 'DISPUTED')
                ->orderByDesc('updated_at');
        }

        $disputes = $query->get();

        return $this->success($disputes, 'Dispute records retrieved.');
    }

    /**
     * Resolve a match dispute.
     */
    public function resolveDispute(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();

        $match = GameMatch::with('matchPlayers')->findOrFail($id);
        $admin = Auth::user();

        if ($match->status !== 'DISPUTED') {
            return $this->error('Match is not currently disputed.', 400);
        }

        $validated = $request->validate([
            'resolution_action' => ['required', 'in:CONFIRM_RESULT,CORRECT_SCORE,CANCEL_MATCH'],
            'resolution_reason' => ['required', 'string', 'min:5', 'max:1000'],
            'corrected_sets' => ['nullable', 'array', 'min:2', 'max:3'],
            'corrected_sets.*.set_number' => ['required_with:corrected_sets', 'integer', 'between:1,3'],
            'corrected_sets.*.team_a_score' => ['required_with:corrected_sets', 'integer', 'min:0', 'max:30'],
            'corrected_sets.*.team_b_score' => ['required_with:corrected_sets', 'integer', 'min:0', 'max:30'],
        ]);

        $action = $validated['resolution_action'];
        $reason = $validated['resolution_reason'];

        try {
            DB::transaction(function () use ($match, $action, $reason, $validated, $admin) {
                $oldStatus = $match->status;
                $match->admin_resolution_note = sprintf('[%s] %s: %s', now()->toDateTimeString(), $admin->name, $reason);

                if ($action === 'CANCEL_MATCH') {
                    $this->matchResultService->cancelMatchAndRefund(
                        match: $match,
                        reason: "Admin dispute cancellation: {$reason}",
                        actorId: $admin->id
                    );
                } elseif ($action === 'CONFIRM_RESULT') {
                    // Confirms current winning team and completes
                    $match->status = 'WAITING_APPROVAL';
                    $match->save();
                    $this->matchResultService->completeMatchAndAwardPoints($match);
                } elseif ($action === 'CORRECT_SCORE') {
                    if (empty($validated['corrected_sets'])) {
                        throw new InvalidArgumentException('Corrected score sets must be provided for CORRECT_SCORE action.');
                    }
                    $this->matchResultService->submitScore(
                        match: $match,
                        submitterId: $admin->id,
                        sets: $validated['corrected_sets']
                    );
                    $this->matchResultService->completeMatchAndAwardPoints($match);
                }

                $this->auditLogService->log(
                    action: 'DISPUTE_RESOLVED',
                    auditable: $match,
                    oldValues: ['status' => $oldStatus, 'dispute_reason' => $match->dispute_reason],
                    newValues: ['status' => $match->fresh()->status, 'resolution_action' => $action],
                    reason: $reason,
                    userId: $admin->id
                );
            });

            return $this->success($match->fresh(), 'Dispute resolved successfully.');
        } catch (Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Manual point adjustment with mandatory reason and complete audit log.
     */
    public function adjustPoints(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'point_type' => ['required', 'in:BATTLE,RANK'],
            'amount' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $userId = (int) $validated['user_id'];
        $pointType = $validated['point_type'];
        $amount = (int) $validated['amount'];
        $reason = $validated['reason'];
        $admin = Auth::user();

        try {
            $balance = DB::transaction(function () use ($userId, $pointType, $amount, $reason, $admin) {
                if ($pointType === 'BATTLE') {
                    $updated = $this->battlePointService->adjustPoints(
                        userId: $userId,
                        changeAmount: $amount,
                        category: PointTransaction::CAT_ADMIN_ADJUSTMENT,
                        description: sprintf('Admin manual adjustment: %s', $reason),
                        actorId: $admin->id
                    );
                } else {
                    $updated = $this->rankPointService->adjustPoints(
                        userId: $userId,
                        changeAmount: $amount,
                        category: PointTransaction::CAT_ADMIN_ADJUSTMENT,
                        description: sprintf('Admin manual adjustment: %s', $reason),
                        actorId: $admin->id
                    );
                }

                $this->auditLogService->log(
                    action: 'ADMIN_POINT_ADJUSTMENT',
                    auditable: $updated,
                    oldValues: null,
                    newValues: [
                        'user_id' => $userId,
                        'point_type' => $pointType,
                        'amount' => $amount,
                        'new_battle_points' => $updated->battle_points,
                        'new_rank_points' => $updated->rank_points,
                    ],
                    reason: $reason,
                    userId: $admin->id
                );

                $this->notificationService->send(
                    userId: $userId,
                    type: $pointType === 'BATTLE' ? 'BATTLE_POINT_CHANGED' : 'RANK_POINT_CHANGED',
                    title: 'Point Balance Adjusted by Admin',
                    message: sprintf('An administrator adjusted your %s points by %s%d. Reason: %s', $pointType, $amount > 0 ? '+' : '', $amount, $reason),
                    data: ['point_type' => $pointType, 'amount' => $amount]
                );

                return $updated;
            });

            return $this->success($balance, 'Point adjustment executed successfully.');
        } catch (Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Query audit logs with pagination and search.
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $action = $request->query('action');
        $userId = $request->query('user_id');
        $perPage = (int) $request->query('per_page', 25);

        $query = AuditLog::with('user')->orderByDesc('id');

        if ($action) {
            $query->where('action', $action);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $logs = $query->paginate($perPage);

        return $this->success($logs, 'Audit logs retrieved.');
    }

    /**
     * Get system settings.
     */
    public function settings(): JsonResponse
    {
        $this->authorizeAdmin();
        $settings = SystemSetting::all();
        return $this->success($settings, 'System settings retrieved.');
    }

    /**
     * Update system setting.
     */
    public function updateSetting(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'key' => ['required', 'string'],
            'value' => ['required'],
            'type' => ['nullable', 'string'],
        ]);

        $setting = SystemSetting::set(
            $validated['key'],
            $validated['value'],
            $validated['type'] ?? 'string'
        );

        $this->auditLogService->log(
            action: 'SYSTEM_SETTING_UPDATE',
            auditable: $setting,
            oldValues: null,
            newValues: ['key' => $setting->key, 'value' => $setting->value],
            reason: 'System setting updated by admin',
            userId: Auth::id()
        );

        return $this->success($setting, 'Setting updated successfully.');
    }
}
