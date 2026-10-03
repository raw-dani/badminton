<?php

namespace App\Services;

use App\Models\Notification;

class NotificationService
{
    public function send(
        int $userId,
        string $type,
        string $title,
        string $message,
        array $data = []
    ): Notification {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'is_read' => false,
        ]);
    }

    public function sendMany(
        array $userIds,
        string $type,
        string $title,
        string $message,
        array $data = []
    ): void {
        foreach (array_unique($userIds) as $userId) {
            $this->send($userId, $type, $title, $message, $data);
        }
    }

    public function markAsRead(int $notificationId, int $userId): bool
    {
        return (bool) Notification::where('id', $notificationId)
            ->where('user_id', $userId)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
    }

    public function markAllAsRead(int $userId): int
    {
        return Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
    }

    public function getUnreadCount(int $userId): int
    {
        return Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();
    }
}
