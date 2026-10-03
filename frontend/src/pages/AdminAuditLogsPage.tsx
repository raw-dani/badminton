import React, { useEffect, useState } from 'react'
import { History, Shield, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import type { AuditLog, ApiResponse } from '../types'
import { formatDate } from '../lib/utils'

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [action, setAction] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchLogs = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (action) params.append('action', action)
    params.append('page', page.toString())
    params.append('per_page', '25')

    api.get<ApiResponse<{ data: AuditLog[]; current_page: number; last_page: number; total: number }>>(
      `/admin/audit-logs?${params.toString()}`
    )
      .then((res) => {
        if (res.data.success && res.data.data) {
          const items = Array.isArray(res.data.data) ? res.data.data : (res.data.data as any).data || []
          setLogs(items)
          setMeta(res.data.data)
        }
      })
      .catch((err) => console.error('Failed to load audit logs:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLogs()
  }, [action, page])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-3xl text-white flex items-center gap-3">
          <History className="w-8 h-8 text-brand-400" />
          Administrative Audit Trail
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Complete historical record of all administrative rulings, point adjustments, dispute resolutions, and account status modifications.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              setPage(1)
            }}
            className="bg-[#0a0f1d] text-white border border-white/15 rounded-xl px-3.5 py-2 text-xs focus:outline-none"
          >
            <option value="">All Administrative Actions</option>
            <option value="DISPUTE_RESOLVED">Dispute Resolved</option>
            <option value="ADMIN_POINT_ADJUSTMENT">Admin Point Adjustment</option>
            <option value="USER_STATUS_CHANGE">User Status Change</option>
            <option value="MATCH_CANCELLED">Match Cancelled</option>
            <option value="SYSTEM_SETTING_UPDATE">Setting Updated</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing {logs.length} audit records
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0b1222] border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Arbiter Actor</th>
                <th className="px-6 py-4">Reason / Notes</th>
                <th className="px-6 py-4">Payload Delta</th>
                <th className="px-6 py-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {formatDate(log.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-white border border-white/15">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-bold text-white">
                      {log.user?.name || 'System Auto Arbiter'}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-300 max-w-sm truncate" title={log.reason || 'N/A'}>
                      {log.reason || '-'}
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-slate-400 max-w-xs truncate">
                      {log.new_values ? JSON.stringify(log.new_values) : '-'}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400 text-right font-mono">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No audit records matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 bg-[#0b1222]">
            <span>Page {meta.current_page} of {meta.last_page}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
