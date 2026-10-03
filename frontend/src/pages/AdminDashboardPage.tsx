import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  Users,
  Swords,
  AlertTriangle,
  History,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Settings,
  Flame,
  Trophy,
} from 'lucide-react'
import api from '../lib/api'
import type { ApiResponse, GameMatch, AuditLog } from '../types'
import { formatDate, formatShortDate, getStatusBadgeClass } from '../lib/utils'

interface AdminDashboardData {
  metrics: {
    total_users: number
    total_matches: number
    disputed_matches: number
    completed_matches: number
    active_season?: string
  }
  recent_disputes: GameMatch[]
  recent_audit_logs: AuditLog[]
}

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchAdminData = () => {
    setLoading(true)
    api.get<ApiResponse<AdminDashboardData>>('/admin/dashboard')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setData(res.data.data)
        }
      })
      .catch((err) => console.error('Admin dashboard failed:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading administrator console...</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#111a2e] to-[#0a0f1d]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            League Arbiter Management Suite
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white">
            Administrator Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mt-1">
            Supervise league integrity, arbitrate match disputes, adjust points with mandatory audit logging, and oversee players.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/admin/disputes"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            Resolve Disputes ({data.metrics.disputed_matches})
          </Link>
          <Link
            to="/admin/points"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all"
          >
            Adjust Points
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Total Players</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display font-black text-3xl text-white">{data.metrics.total_users}</div>
          <Link to="/admin/users" className="text-[11px] text-emerald-400 hover:underline mt-2 inline-block">
            Manage Players →
          </Link>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Total Matches</span>
            <Swords className="w-4 h-4 text-battle-400" />
          </div>
          <div className="font-display font-black text-3xl text-white">{data.metrics.total_matches}</div>
          <Link to="/admin/matches" className="text-[11px] text-battle-300 hover:underline mt-2 inline-block">
            Inspect Matches →
          </Link>
        </div>

        <div className={`glass-panel p-5 rounded-2xl border ${data.metrics.disputed_matches > 0 ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'}`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
            <span>Pending Disputes</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-display font-black text-3xl text-rose-400">{data.metrics.disputed_matches}</div>
          <Link to="/admin/disputes" className="text-[11px] text-rose-300 hover:underline mt-2 inline-block">
            Review Dispute Queue →
          </Link>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Active Season</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-display font-black text-xl text-white truncate">{data.metrics.active_season || 'Season 1'}</div>
          <span className="text-[11px] text-amber-400 mt-2 inline-block">Live & Calculating</span>
        </div>

      </div>

      {/* Admin Quick Nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/admin/users"
          className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-white/20 transition-all flex items-center justify-between group"
        >
          <span className="text-xs font-bold text-white group-hover:text-brand-400">Player Directory</span>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/admin/disputes"
          className="p-4 rounded-2xl glass-panel border border-rose-500/30 hover:border-rose-500/50 transition-all flex items-center justify-between group"
        >
          <span className="text-xs font-bold text-rose-300">Dispute Arbiter</span>
          <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/admin/points"
          className="p-4 rounded-2xl glass-panel border border-amber-500/30 hover:border-amber-500/50 transition-all flex items-center justify-between group"
        >
          <span className="text-xs font-bold text-amber-300">Point Adjustment</span>
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/admin/audit-logs"
          className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-white/20 transition-all flex items-center justify-between group"
        >
          <span className="text-xs font-bold text-white group-hover:text-brand-400">Audit Logs</span>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* 2-Column: Unresolved Disputes & Recent Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Unresolved Disputes */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Unresolved Match Disputes
            </h3>
            <Link to="/admin/disputes" className="text-xs font-semibold text-rose-400 hover:underline">
              View All ({data.metrics.disputed_matches})
            </Link>
          </div>

          <div className="space-y-3">
            {data.recent_disputes.length > 0 ? (
              data.recent_disputes.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Match #{m.match_code}</span>
                    <span className="text-[10px] font-bold uppercase text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                      Disputed
                    </span>
                  </div>
                  <p className="text-xs text-rose-200/90 italic">
                    "{m.dispute_reason}"
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-xs">
                    <span className="text-slate-400">By {m.disputer?.name || 'Participant'}</span>
                    <Link
                      to="/admin/disputes"
                      className="text-xs font-bold text-rose-400 hover:underline flex items-center gap-1"
                    >
                      Arbitrate Now →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No active disputes. All match scores are verified or completed.
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Trail */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <History className="w-5 h-5 text-brand-400" />
              Recent Arbiter Audit Logs
            </h3>
            <Link to="/admin/audit-logs" className="text-xs font-semibold text-brand-400 hover:underline">
              Full Audit Trail →
            </Link>
          </div>

          <div className="space-y-2.5">
            {data.recent_audit_logs.length > 0 ? (
              data.recent_audit_logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#0a0f1d] border border-white/5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono bg-white/10 text-slate-300">
                        {log.action}
                      </span>
                      <span className="truncate">{log.user?.name || 'System Admin'}</span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-slate-400 truncate">
                        "{log.reason}"
                      </p>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 shrink-0">
                    {formatShortDate(log.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No recent administrative audit records.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
