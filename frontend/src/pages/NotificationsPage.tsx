import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  CheckCircle,
  Clock,
  Swords,
  Trophy,
  Flame,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import api from '../lib/api'
import type { NotificationItem, ApiResponse } from '../types'
import { formatDate } from '../lib/utils'

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [page, setPage] = useState<number>(1)
  const [meta, setMeta] = useState<any>(null)

  const fetchNotifications = () => {
    setLoading(true)
    api.get<ApiResponse<{ notifications: { data: NotificationItem[]; current_page: number; last_page: number }; unread_count: number }>>(
      `/notifications?page=${page}`
    )
      .then((res) => {
        if (res.data.success && res.data.data) {
          const list = res.data.data.notifications?.data || []
          setNotifications(list)
          setUnreadCount(res.data.data.unread_count || 0)
          setMeta(res.data.data.notifications)
        }
      })
      .catch((err) => console.error('Failed to load notifications:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchNotifications()
  }, [page])

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error(e)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INVITATION_RECEIVED':
      case 'INVITATION_ACCEPTED':
      case 'MATCH_READY':
        return <Swords className="w-5 h-5 text-emerald-400" />
      case 'SCORE_WAITING_APPROVAL':
      case 'SCORE_APPROVED':
        return <Trophy className="w-5 h-5 text-amber-400" />
      case 'BATTLE_POINT_CHANGED':
        return <Flame className="w-5 h-5 text-battle-400" />
      case 'MATCH_DISPUTED':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />
      default:
        return <Bell className="w-5 h-5 text-slate-400" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white flex items-center gap-3">
            <Bell className="w-7 h-7 text-brand-400" />
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time updates on match invitations, score approval requests, and point transactions.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-brand-400" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 rounded-2xl glass-panel border transition-all flex items-start justify-between gap-4 ${
                !n.is_read
                  ? 'border-brand-500/40 bg-brand-500/[0.04]'
                  : 'border-white/5 bg-[#0a0f1d]/60'
              }`}
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  <div className="text-[11px] text-slate-400 pt-1">
                    {formatDate(n.created_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.data?.match_id && (
                  <Link
                    to={`/matches/${n.data.match_id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    View Match
                  </Link>
                )}

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-white/5"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400/50 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">You're all caught up!</p>
            <p className="text-xs text-slate-400">No new notifications.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-4">
          <span>Page {meta.current_page} of {meta.last_page}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= meta.last_page}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
