import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { User, ApiResponse } from '../types'
import { getInitials, getAssetUrl } from '../lib/utils'

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // Create User / Admin Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    role: 'admin' as 'admin' | 'player',
  })
  const [createLoading, setCreateLoading] = useState<boolean>(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

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
    const reason = prompt(`Masukkan alasan untuk ${action} akun @${userToToggle.username}:`)
    if (!reason) return

    setActionLoading(userToToggle.id)
    try {
      await api.post(`/admin/users/${userToToggle.id}/toggle-status`, { reason })
      showToast(`Status akun @${userToToggle.username} berhasil diubah.`)
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah status akun.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangeRole = async (targetUser: User, newRole: 'admin' | 'player') => {
    if (targetUser.id === currentUser?.id && newRole !== 'admin') {
      alert('Anda tidak dapat menurunkan peran akun Anda sendiri.')
      return
    }

    const actionText = newRole === 'admin' ? 'mengangkat menjadi Admin Sistem' : 'menurunkan menjadi Player biasa'
    const confirmChange = window.confirm(`Apakah Anda yakin ingin ${actionText} untuk akun @${targetUser.username}?`)
    if (!confirmChange) return

    setActionLoading(targetUser.id)
    try {
      const res = await api.post(`/admin/users/${targetUser.id}/change-role`, { role: newRole })
      if (res.data.success) {
        showToast(res.data.message || `Peran @${targetUser.username} berhasil diubah menjadi ${newRole}.`)
        fetchUsers()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah peran user.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    try {
      const res = await api.post('/admin/users', createForm)
      if (res.data.success) {
        setShowCreateModal(false)
        setCreateForm({
          name: '',
          username: '',
          email: '',
          password: '',
          phone: '',
          city: '',
          role: 'admin',
        })
        showToast(`Akun admin @${res.data.data.username} berhasil dibuat!`)
        fetchUsers()
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : 'Gagal membuat akun.')
      setCreateError(msg)
    } finally {
      setCreateLoading(false)
    }
  }

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 border border-emerald-400 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-3xl text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-400" />
            Manajemen User & Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kelola pemain terdaftar, angkat user menjadi admin, dan tambahkan administrator baru ke sistem.
          </p>
        </div>

        {/* Action Button: Add Admin */}
        <button
          onClick={() => {
            setCreateError(null)
            setShowCreateModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Admin Baru</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, username, email..."
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
            <option value="">Semua Peran (Role)</option>
            <option value="player">Player Saja</option>
            <option value="admin">Administrator Saja</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="bg-[#0a0f1d] text-white border border-white/15 rounded-xl px-3 py-2 text-xs focus:outline-none"
          >
            <option value="">Semua Status Akun</option>
            <option value="active">Akun Aktif</option>
            <option value="suspended">Akun Ditangguhkan</option>
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
                <th className="px-6 py-4">Peran (Role)</th>
                <th className="px-6 py-4 text-center">Battle Points</th>
                <th className="px-6 py-4 text-center">Rank Points</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                    Memuat daftar pemain & admin...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isSuspended = u.status === 'suspended'
                  const isAdmin = u.role === 'admin'
                  const isSelf = u.id === currentUser?.id

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/players/${u.username}`} className="flex items-center gap-3 group">
                          <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs overflow-hidden shrink-0 border ${
                            isAdmin ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/10 text-slate-300 border-white/10'
                          }`}>
                            {u.profile?.avatar_url ? (
                              <img src={getAssetUrl(u.profile.avatar_url)} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(u.name)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-brand-400 transition-colors flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.2 rounded">Anda</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">@{u.username} • {u.profile?.player_code || 'BCL-PL'}</div>
                          </div>
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-300">
                        {u.email}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white/5 text-slate-300 border border-white/10'
                        }`}>
                          {isAdmin && <Shield className="w-3 h-3 text-amber-400" />}
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
                          
                          {/* Role Promotion / Demotion Action */}
                          {isAdmin ? (
                            <button
                              onClick={() => handleChangeRole(u, 'player')}
                              disabled={actionLoading === u.id || isSelf}
                              title={isSelf ? 'Tidak bisa menurunkan akun sendiri' : 'Turunkan menjadi Player'}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors disabled:opacity-40"
                            >
                              {actionLoading === u.id ? '...' : 'Jadikan Player'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChangeRole(u, 'admin')}
                              disabled={actionLoading === u.id}
                              title="Angkat user menjadi Administrator Sistem"
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3 text-amber-400" />
                              <span>{actionLoading === u.id ? '...' : 'Angkat Admin'}</span>
                            </button>
                          )}

                          {/* Profile Link */}
                          <Link
                            to={`/players/${u.username}`}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
                          >
                            Profil
                          </Link>

                          {/* Suspend / Activate Toggle */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={actionLoading === u.id}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                isSuspended
                                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                              }`}
                            >
                              {actionLoading === u.id ? '...' : isSuspended ? 'Aktifkan' : 'Tangguhkan'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                    Tidak ada akun yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 bg-[#0b1222]">
            <span>Halaman {meta.current_page} dari {meta.last_page}</span>
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

      {/* Modal: Tambah Admin Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in duration-200">
            
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" />
                <span>Administrator System</span>
              </div>
              <h2 className="font-display font-black text-2xl text-white">Tambah Administrator Baru</h2>
              <p className="text-xs text-slate-400 mt-1">
                Akun administrator memiliki akses penuh ke Panel Admin, Dispute Resolution, dan Pengaturan Sistem.
              </p>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Lengkap</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Budi Santoso"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
                  <div className="relative">
                    <span className="text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold">@</span>
                    <input
                      type="text"
                      required
                      placeholder="admin_budi"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                      className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Alamat Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="admin@badmintoncl.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter..."
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nomor HP (Opsional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kota (Opsional)</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Jakarta, Surabaya..."
                      value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Peran yang Diberikan</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="admin">Administrator (Akses Penuh)</option>
                  <option value="player">Player (Pemain Biasa)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {createLoading ? 'Membuat Akun...' : 'Simpan & Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
