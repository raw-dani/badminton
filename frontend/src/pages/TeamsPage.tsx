import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Shield,
  Trophy,
  Flame,
  MessageSquare,
  Send,
  Sparkles,
  PlusCircle,
  ArrowUpCircle,
  LogOut,
  CheckCircle,
  Search,
  MapPin,
  AlertCircle,
  Lock,
  Crown,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  RefreshCw,
  Coins,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import type { Team, TeamMember, TeamMessage, ApiResponse } from '../types'
import { getInitials } from '../lib/utils'

export const TeamsPage: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const { t } = useLanguage()

  // Main state
  const [activeTab, setActiveTab] = useState<'my_team' | 'chat' | 'browse'>('my_team')
  const [loading, setLoading] = useState<boolean>(true)
  const [myTeamData, setMyTeamData] = useState<{
    team: Team
    membership: TeamMember
    is_leader: boolean
    is_admin: boolean
  } | null>(null)

  // Browse teams state
  const [browseTeams, setBrowseTeams] = useState<Team[]>([])
  const [browseSearch, setBrowseSearch] = useState<string>('')
  const [browseLoading, setBrowseLoading] = useState<boolean>(false)

  // Live Points Balance state
  const [liveBp, setLiveBp] = useState<number | null>(null)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    city: '',
    description: '',
    logo_url: '',
  })
  const [createLoading, setCreateLoading] = useState<boolean>(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Upgrade quota modal
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false)
  const [upgradeMultiplier, setUpgradeMultiplier] = useState<number>(1)
  const [upgradeLoading, setUpgradeLoading] = useState<boolean>(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  // Chat state
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [chatInput, setChatInput] = useState<string>('')
  const [chatLoading, setChatLoading] = useState<boolean>(false)
  const [sendingMessage, setSendingMessage] = useState<boolean>(false)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Load My Team
  const fetchMyTeam = async () => {
    try {
      const res = await api.get<ApiResponse<{
        team: Team
        membership: TeamMember
        is_leader: boolean
        is_admin: boolean
      } | null>>('/teams/my-team')

      if (res.data.success) {
        setMyTeamData(res.data.data)
        if (!res.data.data) {
          // If not in a team, default tab is browse
          setActiveTab('browse')
        }
      }
    } catch (err) {
      console.error('Error fetching team:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load Browse Teams
  const fetchBrowseTeams = async (searchQuery = '') => {
    setBrowseLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      const res = await api.get<ApiResponse<{ data: Team[] }>>(`/teams?${params.toString()}`)
      if (res.data.success && res.data.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : (res.data.data as any).data || []
        setBrowseTeams(list)
      }
    } catch (err) {
      console.error('Error fetching browse teams:', err)
    } finally {
      setBrowseLoading(false)
    }
  }

  // Load Chat Messages
  const fetchMessages = async (silent = false) => {
    if (!silent) setChatLoading(true)
    try {
      const res = await api.get<ApiResponse<TeamMessage[]>>('/teams/my-team/messages')
      if (res.data.success && Array.isArray(res.data.data)) {
        setMessages(res.data.data)
      }
    } catch (err) {
      // Not in a team or unauthorized
    } finally {
      if (!silent) setChatLoading(false)
    }
  }

  // Load Live Point Balance
  const fetchLiveBalance = async () => {
    try {
      const res = await api.get<ApiResponse<{ battle_points: number; rank_points: number }>>('/points/balance')
      if (res.data?.success && res.data?.data) {
        setLiveBp(res.data.data.battle_points)
      }
      refreshUser()
    } catch (err) {}
  }

  useEffect(() => {
    fetchMyTeam()
    fetchBrowseTeams()
    fetchLiveBalance()
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  // Polling for chat messages when in chat tab
  useEffect(() => {
    if (activeTab === 'chat' && myTeamData) {
      fetchMessages()
      const interval = setInterval(() => {
        fetchMessages(true)
      }, 3500)
      return () => clearInterval(interval)
    }
  }, [activeTab, myTeamData])

  // Create Team Submit
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    try {
      const res = await api.post<ApiResponse<Team>>('/teams', createForm)
      if (res.data.success) {
        setShowCreateModal(false)
        showToast(res.data.message || 'Tim berhasil dibuat!')
        await fetchLiveBalance()
        await fetchMyTeam()
        setActiveTab('my_team')
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Gagal membuat tim.')
    } finally {
      setCreateLoading(false)
    }
  }

  // Upgrade Quota Submit
  const handleUpgradeQuota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myTeamData?.team) return

    setUpgradeLoading(true)
    setUpgradeError(null)

    try {
      const res = await api.post<ApiResponse<Team>>(`/teams/${myTeamData.team.id}/upgrade-quota`, {
        multiplier: upgradeMultiplier,
      })
      if (res.data.success) {
        setShowUpgradeModal(false)
        showToast(res.data.message || 'Kuota tim berhasil di-upgrade!')
        await fetchLiveBalance()
        await fetchMyTeam()
      }
    } catch (err: any) {
      setUpgradeError(err.response?.data?.message || 'Gagal upgrade kuota tim.')
    } finally {
      setUpgradeLoading(false)
    }
  }

  // Join Team Action
  const handleJoinTeam = async (teamId: number) => {
    try {
      const res = await api.post<ApiResponse<any>>(`/teams/${teamId}/join`)
      if (res.data.success) {
        showToast(res.data.message || 'Berhasil bergabung dengan tim!')
        await fetchMyTeam()
        setActiveTab('my_team')
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal bergabung dengan tim.')
    }
  }

  // Leave Team Action
  const handleLeaveTeam = async () => {
    if (!myTeamData?.team) return
    const confirm = window.confirm(`Apakah Anda yakin ingin keluar dari tim "${myTeamData.team.name}"?`)
    if (!confirm) return

    try {
      const res = await api.post<ApiResponse<any>>(`/teams/${myTeamData.team.id}/leave`)
      if (res.data.success) {
        showToast(res.data.message || 'Anda telah keluar dari tim.')
        setMyTeamData(null)
        setActiveTab('browse')
        fetchBrowseTeams()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal keluar dari tim.')
    }
  }

  // Change Member Role Action
  const handleChangeRole = async (memberUserId: number, newRole: 'ADMIN' | 'MEMBER') => {
    if (!myTeamData?.team) return
    const roleName = newRole === 'ADMIN' ? 'Admin Tim' : 'Anggota Biasa'
    const confirm = window.confirm(`Ubah status anggota menjadi ${roleName}?`)
    if (!confirm) return

    try {
      const res = await api.put<ApiResponse<any>>(`/teams/${myTeamData.team.id}/members/${memberUserId}/role`, {
        role: newRole,
      })
      if (res.data.success) {
        showToast(res.data.message || 'Peran anggota berhasil diperbarui.')
        await fetchMyTeam()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah peran anggota.')
    }
  }

  // Kick Member Action
  const handleKickMember = async (memberUserId: number, memberName: string) => {
    if (!myTeamData?.team) return
    const confirm = window.confirm(`Keluarkan ${memberName} dari tim?`)
    if (!confirm) return

    try {
      const res = await api.delete<ApiResponse<any>>(`/teams/${myTeamData.team.id}/members/${memberUserId}`)
      if (res.data.success) {
        showToast(res.data.message || 'Anggota telah dikeluarkan dari tim.')
        await fetchMyTeam()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengeluarkan anggota.')
    }
  }

  // Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || sendingMessage) return

    setSendingMessage(true)
    const content = chatInput.trim()
    setChatInput('')

    try {
      const res = await api.post<ApiResponse<TeamMessage>>('/teams/my-team/messages', {
        message: content,
      })
      if (res.data.success && res.data.data) {
        setMessages((prev) => [...prev, res.data.data])
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengirim pesan.')
    } finally {
      setSendingMessage(false)
    }
  }

  const userBp = liveBp !== null ? liveBp : (user?.point_balance?.battle_points ?? 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 border border-emerald-400 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Badminton Champion League</span>
          </div>
          <h1 className="font-display font-black text-3xl text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-400" />
            Fitur Team & Group Chat
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Bentuk tim impian, nikmati aturan poin tim yang menguntungkan, dan obrolan grup eksklusif sesama anggota tim.
          </p>
        </div>

        {/* Create Team Trigger Button (available if not in a team) */}
        {!myTeamData && (
          <button
            onClick={() => {
              fetchLiveBalance()
              setCreateError(null)
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-brand-500 to-emerald-600 text-slate-950 hover:from-brand-400 hover:to-emerald-500 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 shrink-0"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Tim Baru (-1000 BP)</span>
          </button>
        )}
      </div>

      {/* Point Rules Benefit Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-brand-500/30 bg-gradient-to-r from-brand-950/40 via-emerald-950/20 to-[#0a0f1d] relative overflow-hidden shadow-2xl">
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <Shield className="w-48 h-48 text-brand-400" />
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-[11px] font-black uppercase tracking-wider mb-2 border border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Keuntungan Bergabung Tim
            </div>
            <h2 className="text-lg sm:text-xl font-display font-black text-white">
              Aturan Poin Khusus Anggota Tim (Team Point Rules)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Setiap pemain yang tergabung dalam tim aktif otomatis menerapkan perhitungan point khusus dengan reward lebih tinggi dan fasilitas chat grup eksklusif:
            </p>
          </div>

          {/* Quick Rules Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center shrink-0">
            <div className="p-2.5 rounded-2xl bg-black/40 border border-battle-500/30">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Battle Win</div>
              <div className="text-base font-black text-battle-300">+5 BP</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-black/40 border border-battle-500/30">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Battle Loss</div>
              <div className="text-base font-black text-battle-300">+2 BP</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-black/40 border border-rose-500/30">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Ranked Entry</div>
              <div className="text-base font-black text-rose-400">-5 BP</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-black/40 border border-rank-500/30">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Ranked Win</div>
              <div className="text-base font-black text-rank-300">+5 RP</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-black/40 border border-rose-500/30">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Ranked Loss</div>
              <div className="text-base font-black text-rose-400">-2 RP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {myTeamData && (
          <button
            onClick={() => setActiveTab('my_team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'my_team'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Tim Saya ({myTeamData.team.name})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'chat'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat Group Tim</span>
          {!myTeamData && <Lock className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        <button
          onClick={() => setActiveTab('browse')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'browse'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Jelajahi Tim Lain</span>
        </button>
      </div>

      {/* TAB 1: MY TEAM */}
      {activeTab === 'my_team' && myTeamData && (
        <div className="space-y-6">
          {/* Team Info Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-brand-500/30 to-emerald-600/20 border border-brand-500/40 flex items-center justify-center font-display font-black text-2xl text-brand-300 shadow-xl overflow-hidden shrink-0">
                  {myTeamData.team.logo_url ? (
                    <img src={myTeamData.team.logo_url} alt={myTeamData.team.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(myTeamData.team.name)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
                      {myTeamData.team.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-brand-400 border border-white/10">
                      {myTeamData.team.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Peran Anda: {myTeamData.membership.role === 'LEADER' ? '👑 Kapten' : myTeamData.membership.role === 'ADMIN' ? '🛡️ Admin' : 'Anggota'}
                    </span>
                  </div>
                  {myTeamData.team.city && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{myTeamData.team.city}</span>
                    </div>
                  )}
                  {myTeamData.team.description && (
                    <p className="text-xs text-slate-300 mt-2 max-w-2xl">
                      {myTeamData.team.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Quota & Action Box */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 p-4 rounded-2xl bg-[#0a0f1d] border border-white/10 shrink-0">
                <div className="w-full">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
                    <span>Kapasitas Anggota</span>
                    <span className="text-white">
                      {myTeamData.team.active_members_count ?? myTeamData.team.active_members?.length ?? 1} / {myTeamData.team.max_members}
                    </span>
                  </div>
                  <div className="w-full sm:w-48 h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (((myTeamData.team.active_members_count ?? myTeamData.team.active_members?.length ?? 1) /
                            myTeamData.team.max_members) *
                            100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full pt-1">
                  {myTeamData.is_admin && (
                    <button
                      onClick={() => {
                        fetchLiveBalance()
                        setUpgradeError(null)
                        setShowUpgradeModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span>Upgrade Kuota (+10)</span>
                    </button>
                  )}

                  <button
                    onClick={handleLeaveTeam}
                    title="Keluar dari tim"
                    className="p-1.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Members Table */}
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-400" />
                  Daftar Anggota Tim ({myTeamData.team.active_members?.length || 1} Pemain)
                </h3>
                <p className="text-xs text-slate-400">
                  Semua anggota mendapatkan bonus rules poin tim setiap bertanding.
                </p>
              </div>

              {myTeamData.is_admin && (
                <button
                  onClick={() => setActiveTab('chat')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
                  <span>Buka Chat Tim</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0b1222] border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Pemain</th>
                    <th className="px-6 py-4">Peran di Tim</th>
                    <th className="px-6 py-4 text-center">Battle Points</th>
                    <th className="px-6 py-4 text-center">Rank Points</th>
                    <th className="px-6 py-4 text-right">Aksi Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {myTeamData.team.active_members?.map((m) => {
                    const memberUser = m.user
                    if (!memberUser) return null
                    const isSelf = memberUser.id === user?.id
                    const isLeader = m.role === 'LEADER'
                    const isAdmin = m.role === 'ADMIN'

                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/players/${memberUser.username}`} className="flex items-center gap-3 group">
                            <div className="w-9 h-9 rounded-xl bg-white/10 text-slate-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                              {memberUser.profile?.avatar_url ? (
                                <img src={memberUser.profile.avatar_url} alt={memberUser.name} className="w-full h-full object-cover" />
                              ) : (
                                getInitials(memberUser.name)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white group-hover:text-brand-400 transition-colors flex items-center gap-1.5">
                                {memberUser.name}
                                {isSelf && (
                                  <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.2 rounded">Anda</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">@{memberUser.username} • {memberUser.profile?.city || 'BCL'}</div>
                            </div>
                          </Link>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isLeader
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isAdmin
                              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                              : 'bg-white/5 text-slate-300 border border-white/10'
                          }`}>
                            {isLeader && <Crown className="w-3 h-3 text-amber-400" />}
                            {isAdmin && <Shield className="w-3 h-3 text-brand-400" />}
                            {m.role}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-battle-300 text-xs">
                          {memberUser.point_balance?.battle_points ?? 0} BP
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-rank-300 text-xs">
                          {memberUser.point_balance?.rank_points ?? 0} RP
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Leader Actions */}
                            {myTeamData.is_leader && !isLeader && !isSelf && (
                              <>
                                {isAdmin ? (
                                  <button
                                    onClick={() => handleChangeRole(memberUser.id, 'MEMBER')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                                  >
                                    Turunkan ke Anggota
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleChangeRole(memberUser.id, 'ADMIN')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30"
                                  >
                                    Angkat Jadi Admin
                                  </button>
                                )}
                              </>
                            )}

                            {/* Kick action */}
                            {myTeamData.is_admin && !isLeader && !isSelf && (myTeamData.is_leader || !isAdmin) && (
                              <button
                                onClick={() => handleKickMember(memberUser.id, memberUser.name)}
                                title="Keluarkan dari tim"
                                className="p-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}

                            <Link
                              to={`/players/${memberUser.username}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
                            >
                              Profil
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHAT GROUP TIM */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          {!myTeamData ? (
            /* Locked screen for non-team users */
            <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4 max-w-xl mx-auto shadow-2xl">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="font-display font-black text-2xl text-white">
                Fasilitas Chat Group Hanya untuk Anggota Tim
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Anda saat ini belum tergabung dalam tim manapun. Fitur obrolan grup ini diisolasi secara ketat dan hanya dapat diakses oleh anggota tim yang sama untuk koordinasi strategi dan jadwal pertandingan.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-brand-500 to-emerald-600 text-slate-950 hover:from-brand-400 hover:to-emerald-500 shadow-lg shadow-brand-500/20 transition-all"
                >
                  Buat Tim Baru (-1000 BP)
                </button>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                >
                  Jelajahi & Gabung Tim
                </button>
              </div>
            </div>
          ) : (
            /* Dedicated Team Chat Window */
            <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[650px]">
              
              {/* Chat Header */}
              <div className="px-6 py-4 bg-[#0b1222] border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center font-bold text-xs overflow-hidden">
                    {myTeamData.team.logo_url ? (
                      <img src={myTeamData.team.logo_url} alt={myTeamData.team.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(myTeamData.team.name)
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                      <span>Chat Group Tim: {myTeamData.team.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ruang obrolan rahasia & eksklusif untuk {myTeamData.team.active_members?.length || 1} anggota tim
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fetchMessages()}
                  title="Segarkan pesan"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {chatLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500">
                    Memuat percakapan tim...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-slate-400">
                    <MessageSquare className="w-10 h-10 text-slate-600" />
                    <p className="text-sm font-bold text-white">Belum ada pesan di grup tim ini.</p>
                    <p className="text-xs max-w-sm">
                      Mulai percakapan dengan menyapa rekan satu tim atau diskusikan jadwal match badminton berikutnya!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMyMsg = msg.user_id === user?.id
                    const sender = msg.user
                    const role = msg.user?.team_membership?.role || (sender?.id === myTeamData.team.creator_id ? 'LEADER' : 'MEMBER')

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${isMyMsg ? 'flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-xl bg-white/10 text-slate-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                          {sender?.profile?.avatar_url ? (
                            <img src={sender.profile.avatar_url} alt={sender.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(sender?.name || 'P')
                          )}
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[75%] sm:max-w-[65%] space-y-1 ${isMyMsg ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="font-bold text-white">{sender?.name || 'Pemain'}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                              role === 'LEADER'
                                ? 'bg-amber-500/20 text-amber-300'
                                : role === 'ADMIN'
                                ? 'bg-brand-500/20 text-brand-300'
                                : 'bg-white/5 text-slate-400'
                            }`}>
                              {role === 'LEADER' ? 'Kapten' : role === 'ADMIN' ? 'Admin' : 'Anggota'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                              isMyMsg
                                ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white rounded-tr-none'
                                : 'bg-[#121a2d] border border-white/10 text-slate-100 rounded-tl-none'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-4 bg-[#0b1222] border-t border-white/10 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Ketik pesan untuk anggota tim..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingMessage}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 text-slate-950 hover:from-brand-400 hover:to-emerald-500 shadow-md shadow-brand-500/20 transition-all disabled:opacity-40 shrink-0"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>

            </div>
          )}
        </div>
      )}

      {/* TAB 3: BROWSE TEAMS */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={browseSearch}
              onChange={(e) => {
                setBrowseSearch(e.target.value)
                fetchBrowseTeams(e.target.value)
              }}
              placeholder="Cari tim badminton berdasarkan nama tim, kode, atau kota..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {browseLoading ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400">
                Memuat daftar tim...
              </div>
            ) : browseTeams.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                Tidak ada tim yang ditemukan. Jadilah yang pertama membuat tim baru!
              </div>
            ) : (
              browseTeams.map((t) => {
                const isMyTeam = myTeamData?.team?.id === t.id
                const memberCount = t.active_members_count ?? t.active_members?.length ?? 1
                const isFull = memberCount >= t.max_members

                return (
                  <div
                    key={t.id}
                    className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between shadow-xl group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/20 to-emerald-600/10 border border-brand-500/30 flex items-center justify-center font-bold text-sm text-brand-300 overflow-hidden shrink-0">
                            {t.logo_url ? (
                              <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(t.name)
                            )}
                          </div>
                          <div>
                            <h3 className="font-display font-black text-base text-white group-hover:text-brand-400 transition-colors">
                              {t.name}
                            </h3>
                            <div className="text-[11px] font-mono text-slate-400">{t.code}</div>
                          </div>
                        </div>

                        {t.city && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10">
                            {t.city}
                          </span>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      )}

                      {/* Quota Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                          <span>Kapasitas Anggota</span>
                          <span className={isFull ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {memberCount} / {t.max_members} {isFull ? '(Penuh)' : ''}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              isFull ? 'bg-rose-500' : 'bg-gradient-to-r from-brand-500 to-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (memberCount / t.max_members) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Creator Info */}
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>Kapten: @{t.creator?.username || 'leader'}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 mt-4">
                      {isMyTeam ? (
                        <button
                          disabled
                          className="w-full py-2 rounded-xl text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30"
                        >
                          Tim Anda Saat Ini
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinTeam(t.id)}
                          disabled={isFull || !!myTeamData}
                          title={
                            myTeamData
                              ? 'Anda sudah memiliki tim'
                              : isFull
                              ? 'Kuota tim sudah penuh'
                              : 'Bergabung dengan tim ini'
                          }
                          className="w-full py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-500 to-emerald-600 text-slate-950 hover:from-brand-400 hover:to-emerald-500 shadow-md shadow-brand-500/20 transition-all disabled:opacity-40"
                        >
                          {isFull ? 'Kuota Penuh' : 'Gabung Tim Ini'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: BUAT TIM BARU */}
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
              <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" />
                <span>Pendaftaran Tim Baru</span>
              </div>
              <h2 className="font-display font-black text-2xl text-white">Buat Tim Badminton Baru</h2>
              <p className="text-xs text-slate-400 mt-1">
                Biaya pembuatan tim adalah <strong className="text-amber-400">1000 Battle Points</strong> untuk kuota awal <strong className="text-white">10 Anggota</strong>.
              </p>
            </div>

            {/* Current Balance Notice */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-battle-400" />
                Saldo Battle Points Anda:
              </span>
              <span className={`font-black ${userBp >= 1000 ? 'text-battle-300' : 'text-rose-400'}`}>
                {userBp} BP {userBp < 1000 ? '(Kurang)' : ''}
              </span>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Tim</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garuda Smash Club"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kota / Base Tim</label>
                <input
                  type="text"
                  placeholder="e.g. Jakarta Selatan"
                  value={createForm.city}
                  onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">URL Logo Tim (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={createForm.logo_url}
                  onChange={(e) => setCreateForm({ ...createForm, logo_url: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Deskripsi / Visi Tim</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan mengenai tim Anda..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
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
                  disabled={createLoading || userBp < 1000}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-brand-500 to-emerald-600 text-slate-950 hover:from-brand-400 hover:to-emerald-500 shadow-lg shadow-brand-500/20 transition-all disabled:opacity-40"
                >
                  {createLoading ? 'Membuat Tim...' : 'Buat Tim (-1000 BP)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPGRADE KUOTA TIM */}
      {showUpgradeModal && myTeamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                <ArrowUpCircle className="w-4 h-4" />
                <span>Upgrade Kapasitas</span>
              </div>
              <h2 className="font-display font-black text-2xl text-white">Upgrade Kuota Anggota</h2>
              <p className="text-xs text-slate-400 mt-1">
                Biaya upgrade kuota adalah <strong className="text-amber-400">1000 Battle Points per 10 anggota</strong> (berlaku kelipatan).
              </p>
            </div>

            {/* Current Team Status */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Kuota Saat Ini:</span>
                <span className="text-white font-bold">{myTeamData.team.max_members} Anggota</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Saldo BP Anda:</span>
                <span className="text-battle-300 font-bold">{userBp} BP</span>
              </div>
            </div>

            {upgradeError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {upgradeError}
              </div>
            )}

            <form onSubmit={handleUpgradeQuota} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Pilih Penambahan Kuota</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((mult) => {
                    const addSeats = mult * 10
                    const cost = mult * 1000
                    const isSelected = upgradeMultiplier === mult

                    return (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setUpgradeMultiplier(mult)}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-lg'
                            : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-black text-sm">+{addSeats}</div>
                        <div className="text-[10px] text-amber-400 font-bold">{cost} BP</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                <span>Total Biaya Dipotong:</span>
                <span className="font-black text-sm">{upgradeMultiplier * 1000} BP</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={upgradeLoading || userBp < upgradeMultiplier * 1000}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40"
                >
                  {upgradeLoading ? 'Memproses...' : `Konfirmasi Upgrade (+${upgradeMultiplier * 10})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
