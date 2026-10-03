<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * List player notifications with unread counter.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = Auth::id();
        $perPage = (int) $request->query('per_page', 20);

        $notifications = Notification::where('user_id', $userId)
            ->orderByDesc('id')
            ->paginate($perPage);

        $unreadCount = $this->notificationService->getUnreadCount($userId);

        return $this->success([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ], 'Notifications retrieved.');
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(int $id): JsonResponse
    {
        $this->notificationService->markAsRead($id, Auth::id());
        return $this->success(null, 'Notification marked as read.');
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(): JsonResponse
    {
        $count = $this->notificationService->markAllAsRead(Auth::id());
        return $this->success(['marked_count' => $count], 'All notifications marked as read.');
    }
}
