import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, Shield, Ban, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import type { User, ApiResponse } from '../types'
import { getInitials } from '../lib/utils'

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchUsers = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (role) params.append('role', role)
    if (status) params.append('status', status)
    params.append('page', page.toString())
    params.append('per_page', '20')

    api.get<ApiResponse<{ data: User[]; current_page: number; last_page: number; total: number }>>(
      `/admin/users?${params.toString()}`
    )
      .then((res) => {
        if (res.data.success && res.data.data) {
          const items = Array.isArray(res.data.data) ? res.data.data : (res.data.data as any).data || []
          setUsers(items)
          setMeta(res.data.data)
        }
      })
      .catch((err) => console.error('Failed to load users:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [role, status, page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleToggleStatus = async (userToToggle: User) => {
    const action = userToToggle.status === 'active' ? 'suspend' : 'activate'
    const reason = prompt(`Enter reason to ${action} account for @${userToToggle.username}:`)
    if (!reason) return

    setActionLoading(userToToggle.id)
    try {
      await api.post(`/admin/users/${userToToggle.id}/toggle-status`, { reason })
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-3xl text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-brand-400" />
          Player & Account Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Inspect registered players, check balances, and manage account statuses.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-3 text-xs">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              setPage(1)
            }}
            className="bg-[#0a0f1d] text-white border border-white/15 rounded-xl px-3 py-2 text-xs focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="player">Players</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="bg-[#0a0f1d] text-white border border-white/15 rounded-xl px-3 py-2 text-xs focus:outline-none"
          >
            <option value="">All Account Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="suspended">Suspended Accounts</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0b1222] border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-center">Battle Points</th>
                <th className="px-6 py-4 text-center">Rank Points</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                    Loading player directory...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isSuspended = u.status === 'suspended'
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/players/${u.username}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-xl bg-white/10 text-slate-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                            {u.profile?.avatar_url ? (
                              <img src={u.profile.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(u.name)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-brand-400 transition-colors">
                              {u.name}
                            </div>
                            <div className="text-xs text-slate-400">@{u.username} • {u.profile?.player_code}</div>
                          </div>
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-300">
                        {u.email}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white/5 text-slate-300 border border-white/10'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-battle-300 text-xs">
                        {u.point_balance?.battle_points ?? 0} BP
                      </td>

                      <td className={`px-6 py-4 text-center font-bold text-xs ${
                        (u.point_balance?.rank_points ?? 0) < 0 ? 'text-rose-400' : 'text-rank-300'
                      }`}>
                        {u.point_balance?.rank_points ?? 0} RP
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isSuspended
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/players/${u.username}`}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
                          >
                            Profile
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={actionLoading === u.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              isSuspended
                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            }`}
                          >
                            {actionLoading === u.id ? '...' : isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No players found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
