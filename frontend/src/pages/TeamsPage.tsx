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
  Swords,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  BarChart2,
  Check,
  XCircle,
  Plus,
  Eye,
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import type { Team, TeamMember, TeamMessage, TeamWar, TeamSeasonScore, ApiResponse } from '../types'
import { getInitials, getAssetUrl } from '../lib/utils'

export const TeamsPage: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const { t } = useLanguage()

  // Main state
  const [activeTab, setActiveTab] = useState<'my_team' | 'wars' | 'team_leaderboard' | 'chat' | 'browse'>('my_team')
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

  // Team Wars state
  const [wars, setWars] = useState<TeamWar[]>([])
  const [warsLoading, setWarsLoading] = useState<boolean>(false)
  const [warFilter, setWarFilter] = useState<'all' | 'my' | 'pending'>('my')
  const [selectedWarId, setSelectedWarId] = useState<number | null>(null)
  const [selectedWarDetail, setSelectedWarDetail] = useState<{
    war: TeamWar
    can_manage: boolean
    is_challenger_leader: boolean
    is_challenged_leader: boolean
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)

  // Challenge modal state
  const [showChallengeModal, setShowChallengeModal] = useState<boolean>(false)
  const [challengeForm, setChallengeForm] = useState({
    challenged_team_id: 0,
    total_matches: 5,
    scheduled_at: '',
    venue: '',
    notes: '',
  })
  const [challengeLoading, setChallengeLoading] = useState<boolean>(false)
  const [challengeError, setChallengeError] = useState<string | null>(null)

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false)
  const [targetWarForSchedule, setTargetWarForSchedule] = useState<TeamWar | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: '',
    venue: '',
    notes: '',
  })
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  // Add Match to War modal state
  const [showAddMatchModal, setShowAddMatchModal] = useState<boolean>(false)
  const [targetWarForMatch, setTargetWarForMatch] = useState<TeamWar | null>(null)
  const [warMatchForm, setWarMatchForm] = useState<{
    type: 'BATTLE' | 'RANKED'
    mode: 'SINGLES' | 'DOUBLES'
    scheduled_at: string
    venue: string
    description: string
    team_a_player_ids: number[]
    team_b_player_ids: number[]
  }>({
    type: 'BATTLE',
    mode: 'SINGLES',
    scheduled_at: '',
    venue: '',
    description: '',
    team_a_player_ids: [],
    team_b_player_ids: [],
  })
  const [addMatchLoading, setAddMatchLoading] = useState<boolean>(false)
  const [addMatchError, setAddMatchError] = useState<string | null>(null)

  // Team Leaderboard state
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamSeasonScore[]>([])
  const [teamLeaderboardSeason, setTeamLeaderboardSeason] = useState<any>(null)
  const [teamLeaderboardLoading, setTeamLeaderboardLoading] = useState<boolean>(false)

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

  // Load Team Wars
  const fetchWars = async (filter = warFilter) => {
    setWarsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'my') {
        params.append('my_wars_only', '1')
      } else if (filter === 'pending') {
        params.append('status', 'PENDING')
      }
      const res = await api.get<ApiResponse<{ data: TeamWar[] } | TeamWar[]>>(`/teams/wars?${params.toString()}`)
      if (res.data.success && res.data.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : (res.data.data as any).data || []
        setWars(list)
      }
    } catch (err) {
      console.error('Error fetching wars:', err)
    } finally {
      setWarsLoading(false)
    }
  }

  // Load Single War Details
  const fetchWarDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const res = await api.get<ApiResponse<{
        war: TeamWar
        can_manage: boolean
        is_challenger_leader: boolean
        is_challenged_leader: boolean
      }>>(`/teams/wars/${id}`)
      if (res.data.success && res.data.data) {
        setSelectedWarDetail(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching war details:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Load Team Leaderboard
  const fetchTeamLeaderboard = async () => {
    setTeamLeaderboardLoading(true)
    try {
      const res = await api.get<ApiResponse<{
        season: any
        leaderboard: { data: TeamSeasonScore[] }
      }>>('/teams/leaderboard')
      if (res.data.success && res.data.data) {
        setTeamLeaderboard(res.data.data.leaderboard?.data || [])
        setTeamLeaderboardSeason(res.data.data.season)
      }
    } catch (err) {
      console.error('Error fetching team leaderboard:', err)
    } finally {
      setTeamLeaderboardLoading(false)
    }
  }

  useEffect(() => {
    fetchMyTeam()
    fetchBrowseTeams()
    fetchLiveBalance()
    fetchWars()
    fetchTeamLeaderboard()
  }, [])

  // Auto-scroll chat to bottom is DISABLED as requested by user.

  // Polling for chat messages when in chat tab
  useEffect(() => {
    if (activeTab === 'chat' && myTeamData) {
      fetchMessages()
      const interval = setInterval(() => {
        fetchMessages(true)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [activeTab, myTeamData])

  // Polling / Refetching when changing tabs
  useEffect(() => {
    if (activeTab === 'wars') {
      fetchWars(warFilter)
    } else if (activeTab === 'team_leaderboard') {
      fetchTeamLeaderboard()
    }
  }, [activeTab, warFilter])

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
        await fetchBrowseTeams()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal keluar dari tim.')
    }
  }

  // Change Member Role Action (Leader only)
  const handleChangeRole = async (memberUserId: number, newRole: 'ADMIN' | 'MEMBER') => {
    if (!myTeamData?.team) return
    try {
      const res = await api.put<ApiResponse<any>>(`/teams/${myTeamData.team.id}/members/${memberUserId}/role`, {
        role: newRole,
      })
      if (res.data.success) {
        showToast(res.data.message || 'Peran anggota berhasil diperbarui.')
        await fetchMyTeam()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memperbarui peran anggota.')
    }
  }

  // Kick Member Action (Leader & Admin)
  const handleKickMember = async (memberUserId: number, memberName: string) => {
    if (!myTeamData?.team) return
    const confirm = window.confirm(`Apakah Anda yakin ingin mengeluarkan "${memberName}" dari tim?`)
    if (!confirm) return

    try {
      const res = await api.delete<ApiResponse<any>>(`/teams/${myTeamData.team.id}/members/${memberUserId}`)
      if (res.data.success) {
        showToast(res.data.message || 'Anggota berhasil dikeluarkan dari tim.')
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

  // -------------------------------------------------------------
  // War Team Actions
  // -------------------------------------------------------------

  // Submit Challenge (Create War)
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    setChallengeLoading(true)
    setChallengeError(null)

    try {
      const res = await api.post<ApiResponse<TeamWar>>('/teams/wars', challengeForm)
      if (res.data.success) {
        setShowChallengeModal(false)
        showToast('Tantangan War Team berhasil diajukan!')
        setChallengeForm({
          challenged_team_id: 0,
          total_matches: 5,
          scheduled_at: '',
          venue: '',
          notes: '',
        })
        await fetchWars()
      }
    } catch (err: any) {
      setChallengeError(err.response?.data?.message || 'Gagal mengajukan tantangan war.')
    } finally {
      setChallengeLoading(false)
    }
  }

  // Accept War
  const handleAcceptWar = async (warId: number) => {
    try {
      const res = await api.post<ApiResponse<TeamWar>>(`/teams/wars/${warId}/accept`)
      if (res.data.success) {
        showToast('Tantangan War Team berhasil diterima!')
        await fetchWars()
        if (selectedWarId === warId) fetchWarDetail(warId)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menerima tantangan war.')
    }
  }

  // Reject War
  const handleRejectWar = async (warId: number) => {
    const confirm = window.confirm('Apakah Anda yakin ingin menolak tantangan war ini?')
    if (!confirm) return

    try {
      const res = await api.post<ApiResponse<TeamWar>>(`/teams/wars/${warId}/reject`)
      if (res.data.success) {
        showToast('Tantangan War Team ditolak.')
        await fetchWars()
        if (selectedWarId === warId) fetchWarDetail(warId)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menolak tantangan war.')
    }
  }

  // Cancel War
  const handleCancelWar = async (warId: number) => {
    const confirm = window.confirm('Apakah Anda yakin ingin membatalkan tantangan war ini?')
    if (!confirm) return

    try {
      const res = await api.post<ApiResponse<TeamWar>>(`/teams/wars/${warId}/cancel`)
      if (res.data.success) {
        showToast('Tantangan War Team berhasil dibatalkan.')
        await fetchWars()
        if (selectedWarId === warId) fetchWarDetail(warId)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membatalkan tantangan war.')
    }
  }

  // Submit Schedule Update
  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetWarForSchedule) return

    setScheduleLoading(true)
    setScheduleError(null)

    try {
      const res = await api.put<ApiResponse<TeamWar>>(`/teams/wars/${targetWarForSchedule.id}/schedule`, scheduleForm)
      if (res.data.success) {
        setShowScheduleModal(false)
        showToast('Jadwal dan lokasi war berhasil diperbarui!')
        await fetchWars()
        if (selectedWarId === targetWarForSchedule.id) fetchWarDetail(targetWarForSchedule.id)
      }
    } catch (err: any) {
      setScheduleError(err.response?.data?.message || 'Gagal memperbarui jadwal war.')
    } finally {
      setScheduleLoading(false)
    }
  }

  // Submit War Match Creation
  const handleCreateWarMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetWarForMatch) return

    setAddMatchLoading(true)
    setAddMatchError(null)

    try {
      const res = await api.post<ApiResponse<any>>(`/teams/wars/${targetWarForMatch.id}/matches`, warMatchForm)
      if (res.data.success) {
        setShowAddMatchModal(false)
        showToast('Pertandingan War Team berhasil dibuat!')
        await fetchWars()
        if (selectedWarId === targetWarForMatch.id) fetchWarDetail(targetWarForMatch.id)
      }
    } catch (err: any) {
      setAddMatchError(err.response?.data?.message || 'Gagal membuat pertandingan war.')
    } finally {
      setAddMatchLoading(false)
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
            Fitur Team, War Team & Chat
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Bentuk tim impian, ajukan War antar tim, kumpulkan Team Score setiap season, dan nikmati obrolan grup eksklusif.
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
              Aturan Poin Tim & War Team Season
            </div>
            <h2 className="text-lg sm:text-xl font-display font-black text-white">
              Aturan Poin Khusus & Team Score System
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Setiap pertandingan anggota tim menambah <strong>+3 Skor Tim</strong> (menang/kalah). Pada <strong>War Team</strong>: Menang <strong>+5 Skor Tim</strong>, Kalah <strong>-1 Skor Tim</strong>. Pemain juga tetap mendapatkan Battle/Rank Points perorangan!
            </p>
          </div>

          {/* Quick Rules Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center shrink-0">
            <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-[9px] text-amber-300 font-bold uppercase">Match Anggota</div>
              <div className="text-sm font-black text-amber-300">+3 Team PTS</div>
              <div className="text-[9px] text-slate-400">Menang/Kalah</div>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[9px] text-emerald-300 font-bold uppercase">War Match Win</div>
              <div className="text-sm font-black text-emerald-300">+5 Team PTS</div>
              <div className="text-[9px] text-slate-400">Ke Tim Pemenang</div>
            </div>
            <div className="p-2 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <div className="text-[9px] text-rose-300 font-bold uppercase">War Match Loss</div>
              <div className="text-sm font-black text-rose-400">-1 Team PTS</div>
              <div className="text-[9px] text-slate-400">Ke Tim Kalah</div>
            </div>
            <div className="p-2 rounded-2xl bg-black/40 border border-battle-500/30">
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Pemain Battle</div>
              <div className="text-sm font-black text-battle-300">+5 / +2 BP</div>
              <div className="text-[9px] text-slate-400">Win / Loss</div>
            </div>
            <div className="p-2 rounded-2xl bg-black/40 border border-rank-500/30">
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Pemain Ranked</div>
              <div className="text-sm font-black text-rank-300">+5 / -2 RP</div>
              <div className="text-[9px] text-slate-400">Win / Loss</div>
            </div>
            <div className="p-2 rounded-2xl bg-black/40 border border-rose-500/30">
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Ranked Entry</div>
              <div className="text-sm font-black text-rose-400">-5 BP</div>
              <div className="text-[9px] text-slate-400">Biaya Entry</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
        {myTeamData && (
          <button
            onClick={() => setActiveTab('my_team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
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
          onClick={() => setActiveTab('wars')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'wars'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Swords className="w-4 h-4 text-rose-400" />
          <span>War Team</span>
        </button>

        <button
          onClick={() => setActiveTab('team_leaderboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'team_leaderboard'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Klasemen Tim (Skor Tim)</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'browse'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Jelajahi Tim Lain</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MY TEAM                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'my_team' && myTeamData && (
        <div className="space-y-6">

          {/* Team Season Score Showcase Card */}
          <div className="glass-panel p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-black/40 to-brand-950/20 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 shadow-lg">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[11px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Skor Tim Musim Ini (Team Score)</span>
                  </div>
                  <div className="text-3xl font-display font-black text-white flex items-baseline gap-2">
                    <span>{myTeamData.team.current_season_score?.score ?? 0}</span>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Points</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Poin Match Reguler</div>
                  <div className="text-base font-black text-brand-300">
                    +{myTeamData.team.current_season_score?.regular_points ?? 0} PTS
                  </div>
                  <div className="text-[9px] text-slate-500">{myTeamData.team.current_season_score?.matches_played ?? 0} Pertandingan</div>
                </div>

                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Rekor War Team</div>
                  <div className="text-base font-black text-white">
                    <span className="text-emerald-400">{myTeamData.team.current_season_score?.war_wins ?? 0}M</span>
                    {' - '}
                    <span className="text-rose-400">{myTeamData.team.current_season_score?.war_losses ?? 0}K</span>
                  </div>
                  <div className="text-[9px] text-slate-500">{myTeamData.team.current_season_score?.war_matches_played ?? 0} War Match</div>
                </div>

                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Net Poin War</div>
                  <div className="text-base font-black text-emerald-400">
                    {(myTeamData.team.current_season_score?.war_points ?? 0) >= 0 ? '+' : ''}
                    {myTeamData.team.current_season_score?.war_points ?? 0} PTS
                  </div>
                  <div className="text-[9px] text-slate-500">+5 Win / -1 Loss</div>
                </div>
              </div>
            </div>
          </div>

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
                    <>
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

                      <button
                        onClick={() => {
                          setChallengeError(null)
                          setShowChallengeModal(true)
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Ajukan War</span>
                      </button>
                    </>
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('wars')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Lihat War Tim</span>
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
                  <span>Buka Chat Tim</span>
                </button>
              </div>
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
                                <img src={getAssetUrl(memberUser.profile.avatar_url)} alt={memberUser.name} className="w-full h-full object-cover" />
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

      {/* ========================================================================= */}
      {/* TAB 2: WAR TEAM (BATTLE ANTAR TIM)                                        */}
      {/* ========================================================================= */}
      {activeTab === 'wars' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10">
            <div>
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Swords className="w-4 h-4" />
                <span>Inter-Team War System</span>
              </div>
              <h2 className="text-xl font-display font-black text-white">
                Pertempuran & Jadwal War Antar Tim
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Kapten dan Admin tim dapat mengajukan tantangan war, mengatur tanggal bertanding, lokasi GOR, dan mendaftarkan match war. Pemenang match war mendapat +5 Skor Tim, yang kalah -1 Skor Tim!
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {myTeamData?.is_admin && (
                <button
                  onClick={() => {
                    setChallengeError(null)
                    setShowChallengeModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-rose-500 to-amber-600 text-white hover:from-rose-400 hover:to-amber-500 shadow-lg shadow-rose-500/20 transition-all hover:scale-105"
                >
                  <Swords className="w-4 h-4" />
                  <span>Tantang Tim Baru (War)</span>
                </button>
              )}
            </div>
          </div>

          {/* War Filter Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWarFilter('my')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  warFilter === 'my'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                War Tim Saya
              </button>
              <button
                onClick={() => setWarFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  warFilter === 'pending'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Menunggu Konfirmasi (Pending)
              </button>
              <button
                onClick={() => setWarFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  warFilter === 'all'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua War Terjadwal
              </button>
            </div>

            <button
              onClick={() => fetchWars(warFilter)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Segarkan War"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* War Cards List */}
          {warsLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
              <span>Memuat data pertempuran antar tim...</span>
            </div>
          ) : wars.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3 max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Swords className="w-7 h-7" />
              </div>
              <h3 className="font-display font-black text-lg text-white">Belum Ada War Team</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Belum ada agenda pertempuran antar tim yang tercatat pada filter ini.
                {myTeamData?.is_admin && ' Jadilah yang pertama menantang tim rival sekarang!'}
              </p>
              {myTeamData?.is_admin && (
                <button
                  onClick={() => setShowChallengeModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition-colors"
                >
                  Ajukan Tantangan War
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {wars.map((war) => {
                const isChallenger = myTeamData && war.challenger_team_id === myTeamData.team.id
                const isChallenged = myTeamData && war.challenged_team_id === myTeamData.team.id
                const canManageWar = myTeamData?.is_admin && (isChallenger || isChallenged)
                const isExpanded = selectedWarId === war.id

                return (
                  <div
                    key={war.id}
                    className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all"
                  >
                    {/* War Card Header */}
                    <div className="p-5 sm:p-6 bg-gradient-to-r from-black/60 via-[#0a0f1d] to-black/60 border-b border-white/5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/5 text-slate-300 border border-white/10">
                            {war.war_code}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            war.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : war.status === 'ACCEPTED' || war.status === 'IN_PROGRESS'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : war.status === 'PENDING'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {war.status === 'PENDING' && '⏳ Menunggu Konfirmasi'}
                            {war.status === 'ACCEPTED' && '📅 Diterima / Terjadwal'}
                            {war.status === 'IN_PROGRESS' && '⚔️ Sedang Berlangsung'}
                            {war.status === 'COMPLETED' && '🏆 War Selesai'}
                            {war.status === 'REJECTED' && '❌ Ditolak'}
                            {war.status === 'CANCELLED' && '🚫 Dibatalkan'}
                          </span>
                        </div>

                        {/* Scheduling & Venue Info */}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          {war.scheduled_at && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-rose-400" />
                              <span>{new Date(war.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                          {war.venue && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              <span>{war.venue}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Teams Battle Arena Banner */}
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-11 items-center gap-4 py-4 px-5 rounded-2xl bg-black/40 border border-white/10">
                        {/* Challenger Team */}
                        <div className="md:col-span-5 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center font-display font-black text-xl text-brand-300 overflow-hidden shrink-0 shadow-lg">
                            {war.challenger_team?.logo_url ? (
                              <img src={war.challenger_team.logo_url} alt={war.challenger_team.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(war.challenger_team?.name || 'T1')
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Tim Penantang (Challenger)</div>
                            <h3 className="font-display font-black text-lg text-white">
                              {war.challenger_team?.name}
                            </h3>
                            <div className="text-xs text-slate-400">{war.challenger_team?.city || 'BCL Club'}</div>
                          </div>
                        </div>

                        {/* VS Score Display */}
                        <div className="md:col-span-1 text-center py-2">
                          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase tracking-widest border border-rose-500/30 mb-1">
                            VS
                          </div>
                          <div className="font-display font-black text-2xl text-white">
                            <span className={war.challenger_score > war.challenged_score ? 'text-emerald-400' : ''}>{war.challenger_score}</span>
                            <span className="text-slate-600 mx-1">:</span>
                            <span className={war.challenged_score > war.challenger_score ? 'text-emerald-400' : ''}>{war.challenged_score}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">Batas {war.total_matches} Match</div>
                        </div>

                        {/* Challenged Team */}
                        <div className="md:col-span-5 flex items-center md:justify-end gap-4">
                          <div className="md:text-right order-2 md:order-1">
                            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Tim Tertantang (Challenged)</div>
                            <h3 className="font-display font-black text-lg text-white">
                              {war.challenged_team?.name}
                            </h3>
                            <div className="text-xs text-slate-400">{war.challenged_team?.city || 'BCL Club'}</div>
                          </div>
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-display font-black text-xl text-amber-300 overflow-hidden shrink-0 shadow-lg order-1 md:order-2">
                            {war.challenged_team?.logo_url ? (
                              <img src={war.challenged_team.logo_url} alt={war.challenged_team.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(war.challenged_team?.name || 'T2')
                            )}
                          </div>
                        </div>
                      </div>

                      {war.notes && (
                        <div className="mt-3 text-xs text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          <strong className="text-slate-300">Catatan Kesepakatan:</strong> {war.notes}
                        </div>
                      )}

                      {/* Captain Action Bar */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                        
                        {/* Pending Actions */}
                        {war.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            {isChallenged && myTeamData?.is_admin && (
                              <>
                                <button
                                  onClick={() => handleAcceptWar(war.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Terima Tantangan War</span>
                                </button>
                                <button
                                  onClick={() => handleRejectWar(war.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            )}

                            {isChallenger && myTeamData?.is_admin && (
                              <button
                                onClick={() => handleCancelWar(war.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                              >
                                <span>Batalkan Tantangan</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Active / In-Progress Actions */}
                        {(war.status === 'ACCEPTED' || war.status === 'IN_PROGRESS') && canManageWar && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setTargetWarForSchedule(war)
                                setScheduleForm({
                                  scheduled_at: war.scheduled_at ? new Date(war.scheduled_at).toISOString().slice(0, 16) : '',
                                  venue: war.venue || '',
                                  notes: war.notes || '',
                                })
                                setShowScheduleModal(true)
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>Atur Jadwal / Lokasi</span>
                            </button>

                            <button
                              onClick={() => {
                                setTargetWarForMatch(war)
                                setWarMatchForm({
                                  type: 'BATTLE',
                                  mode: 'SINGLES',
                                  scheduled_at: war.scheduled_at ? new Date(war.scheduled_at).toISOString().slice(0, 16) : '',
                                  venue: war.venue || '',
                                  description: `War Match: ${war.challenger_team?.name} vs ${war.challenged_team?.name}`,
                                  team_a_player_ids: [],
                                  team_b_player_ids: [],
                                })
                                setAddMatchError(null)
                                setShowAddMatchModal(true)
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Match (+ Pertandingan)</span>
                            </button>
                          </div>
                        )}

                        {/* Toggle Match List Detail */}
                        <button
                          onClick={() => {
                            if (isExpanded) {
                              setSelectedWarId(null)
                              setSelectedWarDetail(null)
                            } else {
                              setSelectedWarId(war.id)
                              fetchWarDetail(war.id)
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-brand-300 transition-colors ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isExpanded ? 'Tutup Detail Pertandingan' : 'Lihat Roster & Match'}</span>
                        </button>

                      </div>
                    </div>

                    {/* Expanded Matches Detail View */}
                    {isExpanded && (
                      <div className="p-5 sm:p-6 bg-[#070b16] space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display font-black text-sm text-white flex items-center gap-2">
                            <Swords className="w-4 h-4 text-rose-400" />
                            Daftar Pertandingan dalam War Ini ({selectedWarDetail?.war.matches?.length || 0} / {war.total_matches})
                          </h4>
                          <span className="text-xs text-slate-400">
                            Aturan War: Menang +5 Team PTS, Kalah -1 Team PTS
                          </span>
                        </div>

                        {detailLoading ? (
                          <div className="py-8 text-center text-xs text-slate-400">Memuat rincian pertandingan war...</div>
                        ) : !selectedWarDetail?.war.matches || selectedWarDetail.war.matches.length === 0 ? (
                          <div className="p-6 rounded-2xl bg-black/30 border border-white/5 text-center text-xs text-slate-400 space-y-2">
                            <div>Belum ada match yang dijadwalkan dalam war ini.</div>
                            {canManageWar && (
                              <button
                                onClick={() => {
                                  setTargetWarForMatch(war)
                                  setWarMatchForm({
                                    type: 'BATTLE',
                                    mode: 'SINGLES',
                                    scheduled_at: war.scheduled_at ? new Date(war.scheduled_at).toISOString().slice(0, 16) : '',
                                    venue: war.venue || '',
                                    description: `War Match: ${war.challenger_team?.name} vs ${war.challenged_team?.name}`,
                                    team_a_player_ids: [],
                                    team_b_player_ids: [],
                                  })
                                  setAddMatchError(null)
                                  setShowAddMatchModal(true)
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                              >
                                + Daftarkan Match Pertama Sekarang
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedWarDetail.war.matches.map((m, idx) => {
                              const teamAPlayers = m.match_players?.filter((p) => p.team === 'TEAM_A') || []
                              const teamBPlayers = m.match_players?.filter((p) => p.team === 'TEAM_B') || []

                              return (
                                <div
                                  key={m.id}
                                  className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-white/10 text-slate-300">
                                        Match #{idx + 1} ({m.match_code})
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-500/20 text-brand-300">
                                        {m.mode} • {m.type}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        m.status === 'COMPLETED'
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'bg-amber-500/20 text-amber-300'
                                      }`}>
                                        {m.status}
                                      </span>
                                    </div>

                                    {/* Lineup */}
                                    <div className="text-xs text-white mt-1">
                                      <strong className="text-brand-300">{war.challenger_team?.name}:</strong>{' '}
                                      {teamAPlayers.map((p) => p.user?.name).join(' & ') || 'Belum diisi'}
                                      <span className="text-slate-500 mx-2">vs</span>
                                      <strong className="text-amber-300">{war.challenged_team?.name}:</strong>{' '}
                                      {teamBPlayers.map((p) => p.user?.name).join(' & ') || 'Belum diisi'}
                                    </div>
                                  </div>

                                  {/* Match Score Sets */}
                                  <div className="flex items-center gap-3 shrink-0">
                                    {m.match_scores && m.match_scores.length > 0 ? (
                                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                                        {m.match_scores.map((s) => (
                                          <span key={s.id} className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-white">
                                            {s.team_a_score}-{s.team_b_score}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-500 italic">Belum ada skor</span>
                                    )}

                                    <Link
                                      to={`/matches/${m.id}`}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-brand-300 border border-white/10 transition-colors"
                                    >
                                      Buka Match
                                    </Link>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KLASEMEN SKOR TIM (TEAM SCORE LEADERBOARD)                         */}
      {/* ========================================================================= */}
      {activeTab === 'team_leaderboard' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-black/40 to-brand-950/20 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-2 border border-amber-500/30">
                  <Trophy className="w-3.5 h-3.5" />
                  Klasemen Tim Musim Ini
                </div>
                <h2 className="text-2xl font-display font-black text-white">
                  Leaderboard Team Score: {teamLeaderboardSeason?.name || 'Musim Aktif BCL 2026'}
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Peringkat tim berdasarkan total akumulasi <strong>Skor Tim</strong> per season. Skor bertambah +3 setiap anggota bertanding di match reguler, serta +5 jika menang dan -1 jika kalah dalam War Team.
                </p>
              </div>

              <button
                onClick={fetchTeamLeaderboard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan Klasemen</span>
              </button>
            </div>
          </div>

          {/* Leaderboard Table */}
          {teamLeaderboardLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Memuat klasemen tim musim ini...</span>
            </div>
          ) : teamLeaderboard.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3 max-w-md mx-auto">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-display font-black text-lg text-white">Belum Ada Skor Tim</h3>
              <p className="text-xs text-slate-400">
                Belum ada tim yang menyelesaikan pertandingan pada musim aktif ini. Mainkan pertandingan bersama anggota tim untuk mulai mengumpulkan poin!
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0b1222] border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4 text-center">Rank</th>
                      <th className="px-6 py-4">Nama Tim</th>
                      <th className="px-6 py-4 text-center">Total Skor Tim</th>
                      <th className="px-6 py-4 text-center">Match Reguler (+3)</th>
                      <th className="px-6 py-4 text-center">Rekor War (M / K)</th>
                      <th className="px-6 py-4 text-center">Poin War Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {teamLeaderboard.map((item, idx) => {
                      const rank = idx + 1
                      const isTop1 = rank === 1
                      const isTop2 = rank === 2
                      const isTop3 = rank === 3

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-white/[0.02] transition-colors ${
                            isTop1 ? 'bg-amber-500/[0.04]' : ''
                          }`}
                        >
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-display font-black text-sm ${
                              isTop1
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                                : isTop2
                                ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                                : isTop3
                                ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                                : 'text-slate-400 font-bold'
                            }`}>
                              {rank}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0">
                                {item.team?.logo_url ? (
                                  <img src={item.team.logo_url} alt={item.team.name} className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(item.team?.name || 'TM')
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{item.team?.name}</span>
                                  {isTop1 && <Crown className="w-4 h-4 text-amber-400" />}
                                </div>
                                <div className="text-xs text-slate-400">{item.team?.city || 'BCL Club'} • {item.team?.code}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-xl font-display font-black text-base text-amber-300 bg-amber-500/15 border border-amber-500/30">
                              {item.score} <span className="text-[10px] ml-1 uppercase text-amber-400 font-semibold">PTS</span>
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center text-xs">
                            <span className="font-bold text-brand-300">+{item.regular_points} PTS</span>
                            <span className="text-[10px] text-slate-500 block">{item.matches_played} Match</span>
                          </td>

                          <td className="px-6 py-4 text-center text-xs">
                            <span className="font-bold text-white">
                              <span className="text-emerald-400">{item.war_wins}M</span>
                              {' - '}
                              <span className="text-rose-400">{item.war_losses}K</span>
                            </span>
                            <span className="text-[10px] text-slate-500 block">{item.war_matches_played} War Match</span>
                          </td>

                          <td className="px-6 py-4 text-center text-xs">
                            <span className={`font-bold ${item.war_points >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {item.war_points >= 0 ? '+' : ''}{item.war_points} PTS
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CHAT GROUP TIM                                                     */}
      {/* ========================================================================= */}
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                    title="Gulir ke pesan terbaru"
                  >
                    Ke Bawah
                  </button>
                  <button
                    onClick={() => fetchMessages()}
                    title="Segarkan pesan"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Body - AUTO SCROLL DISABLED as requested */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {chatLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500">
                    Memuat pesan obrolan tim...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 text-slate-600" />
                    <p className="font-bold text-white">Belum Ada Pesan di Chat Tim Ini</p>
                    <p className="text-[11px] text-slate-400">Mulailah percakapan pertama untuk berdiskusi dengan anggota tim!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMyMsg = msg.user_id === user?.id
                    const senderRole = msg.user?.team_membership?.role

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${
                          isMyMsg ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/10 text-slate-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0 mt-0.5">
                          {msg.user?.profile?.avatar_url ? (
                            <img src={getAssetUrl(msg.user.profile.avatar_url)} alt={msg.user.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(msg.user?.name || 'U')
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 text-[10px] text-slate-400 ${isMyMsg ? 'justify-end' : ''}`}>
                            <span className="font-bold text-slate-300">{msg.user?.name || 'Anggota'}</span>
                            {senderRole && (
                              <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                                senderRole === 'LEADER'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : senderRole === 'ADMIN'
                                  ? 'bg-brand-500/20 text-brand-300'
                                  : 'bg-white/10 text-slate-400'
                              }`}>
                                {senderRole}
                              </span>
                            )}
                            <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
                              isMyMsg
                                ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-slate-950 font-medium rounded-tr-none'
                                : 'bg-[#0a0f1d] text-slate-200 border border-white/10 rounded-tl-none'
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

              {/* Chat Input Footer */}
              <form onSubmit={handleSendMessage} className="p-4 bg-[#0b1222] border-t border-white/10 flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  placeholder="Ketik pesan untuk anggota tim..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-[#050811] border border-white/15 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingMessage}
                  className="p-3 rounded-2xl bg-gradient-to-r from-brand-500 to-emerald-600 text-slate-950 hover:from-brand-400 hover:to-emerald-500 disabled:opacity-40 transition-all shrink-0"
                >
                  <Send className="w-5 h-5 stroke-[2.5]" />
                </button>
              </form>

            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BROWSE OTHER TEAMS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari tim berdasarkan nama, kode, atau kota..."
                value={browseSearch}
                onChange={(e) => {
                  setBrowseSearch(e.target.value)
                  fetchBrowseTeams(e.target.value)
                }}
                className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              onClick={() => fetchBrowseTeams(browseSearch)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              Cari Tim
            </button>
          </div>

          {/* Teams Grid */}
          {browseLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Memuat daftar tim...</div>
          ) : browseTeams.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3 max-w-md mx-auto">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-display font-black text-lg text-white">Tidak Ada Tim Ditemukan</h3>
              <p className="text-xs text-slate-400">
                Belum ada tim yang terdaftar atau sesuai kata kunci pencarian Anda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {browseTeams.map((tItem) => {
                const isMyTeam = myTeamData?.team?.id === tItem.id
                const memberCount = tItem.active_members_count ?? tItem.active_members?.length ?? 1
                const isFull = memberCount >= tItem.max_members

                return (
                  <div
                    key={tItem.id}
                    className="glass-panel rounded-3xl border border-white/10 p-6 flex flex-col justify-between hover:border-brand-500/40 transition-all group shadow-xl"
                  >
                    <div>
                      <div className="flex items-center gap-3.5 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/20 to-emerald-600/10 border border-brand-500/30 flex items-center justify-center font-bold text-brand-300 overflow-hidden shrink-0">
                          {tItem.logo_url ? (
                            <img src={tItem.logo_url} alt={tItem.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(tItem.name)
                          )}
                        </div>
                        <div>
                          <h3 className="font-display font-black text-base text-white group-hover:text-brand-400 transition-colors">
                            {tItem.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400">{tItem.code}</span>
                            {tItem.city && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {tItem.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {tItem.description && (
                        <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                          {tItem.description}
                        </p>
                      )}

                      {/* Quota bar */}
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                          <span>Anggota Terisi:</span>
                          <span className={isFull ? 'text-rose-400' : 'text-slate-200'}>
                            {memberCount} / {tItem.max_members}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isFull ? 'bg-rose-500' : 'bg-brand-500'}`}
                            style={{ width: `${Math.min(100, (memberCount / tItem.max_members) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Join / Status Button */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      {isMyTeam ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-brand-300 bg-brand-500/10 border border-brand-500/20">
                          Tim Anda Saat Ini
                        </span>
                      ) : myTeamData ? (
                        <span className="text-xs text-slate-500 italic">Sudah memiliki tim</span>
                      ) : isFull ? (
                        <span className="text-xs text-rose-400 font-bold">Kuota Penuh</span>
                      ) : (
                        <button
                          onClick={() => handleJoinTeam(tItem.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 transition-all hover:scale-105"
                        >
                          Gabung Tim Ini
                        </button>
                      )}

                      <span className="text-[10px] text-slate-500">
                        Dibuat oleh @{tItem.creator?.username || 'leader'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BUAT TIM BARU                                                    */}
      {/* ========================================================================= */}
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
                <PlusCircle className="w-4 h-4" />
                <span>Registrasi Tim Resmi</span>
              </div>
              <h2 className="font-display font-black text-2xl text-white">Buat Tim Baru</h2>
              <p className="text-xs text-slate-400 mt-1">
                Pembuatan tim memerlukan biaya <strong className="text-battle-300">1000 Battle Points</strong> dengan kuota awal <strong className="text-white">10 Anggota</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-400">Saldo BP Anda:</span>
              <span className={`font-black text-sm ${userBp >= 1000 ? 'text-battle-300' : 'text-rose-400'}`}>
                {userBp} BP {userBp < 1000 && '(Tidak Cukup)'}
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
                  placeholder="e.g. Sidoarjo / Surabaya"
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

      {/* ========================================================================= */}
      {/* MODAL 2: UPGRADE KUOTA TIM                                                */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL 3: AJUKAN WAR TEAM (TANTANG TIM LAIN)                               */}
      {/* ========================================================================= */}
      {showChallengeModal && myTeamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowChallengeModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Swords className="w-4 h-4" />
                <span>Inter-Team War Challenge</span>
              </div>
              <h2 className="font-display font-black text-2xl text-white">Ajukan Tantangan War</h2>
              <p className="text-xs text-slate-400 mt-1">
                Tantang tim rival untuk bertanding. Atur kuota match yang disepakati, tanggal pertandingan, dan venue GOR.
              </p>
            </div>

            {challengeError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {challengeError}
              </div>
            )}

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pilih Tim Lawan</label>
                <select
                  required
                  value={challengeForm.challenged_team_id || ''}
                  onChange={(e) => setChallengeForm({ ...challengeForm, challenged_team_id: Number(e.target.value) })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Pilih Tim yang Akan Ditantang --</option>
                  {browseTeams
                    .filter((t) => t.id !== myTeamData.team.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city || 'BCL'}) - {t.code}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Jumlah Pertandingan (Total Matches)
                </label>
                <select
                  value={challengeForm.total_matches}
                  onChange={(e) => setChallengeForm({ ...challengeForm, total_matches: Number(e.target.value) })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value={1}>1 Match (Single Showdown)</option>
                  <option value={3}>3 Matches (Best of 3)</option>
                  <option value={5}>5 Matches (Standar War)</option>
                  <option value={7}>7 Matches (Extended War)</option>
                  <option value={10}>10 Matches (Full Roster War)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Jadwal Pertandingan (Tanggal & Waktu)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={challengeForm.scheduled_at}
                  onChange={(e) => setChallengeForm({ ...challengeForm, scheduled_at: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Lokasi / Venue GOR
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GOR Sudirman Court 1 & 2"
                  value={challengeForm.venue}
                  onChange={(e) => setChallengeForm({ ...challengeForm, venue: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Catatan / Aturan Khusus (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Membawa shuttlecock sendiri, 3 single 2 double..."
                  value={challengeForm.notes}
                  onChange={(e) => setChallengeForm({ ...challengeForm, notes: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChallengeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={challengeLoading || !challengeForm.challenged_team_id}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-amber-600 text-white hover:from-rose-400 hover:to-amber-500 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-40"
                >
                  {challengeLoading ? 'Mengirim...' : 'Kirim Tantangan War'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ATUR JADWAL & LOKASI WAR                                         */}
      {/* ========================================================================= */}
      {showScheduleModal && targetWarForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowScheduleModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Calendar className="w-4 h-4" />
                <span>Pengaturan Jadwal War</span>
              </div>
              <h2 className="font-display font-black text-2xl text-white">Atur Jadwal & Venue</h2>
              <p className="text-xs text-slate-400 mt-1">
                War #{targetWarForSchedule.war_code}: {targetWarForSchedule.challenger_team?.name} vs {targetWarForSchedule.challenged_team?.name}
              </p>
            </div>

            {scheduleError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {scheduleError}
              </div>
            )}

            <form onSubmit={handleUpdateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tanggal & Waktu Bertanding
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleForm.scheduled_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Lokasi / Venue GOR
                </label>
                <input
                  type="text"
                  required
                  value={scheduleForm.venue}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Catatan Kesepakatan
                </label>
                <textarea
                  rows={2}
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40"
                >
                  {scheduleLoading ? 'Menyimpan...' : 'Simpan Perubahan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TAMBAH MATCH DALAM WAR                                           */}
      {/* ========================================================================= */}
      {showAddMatchModal && targetWarForMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-xl rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowAddMatchModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Plus className="w-4 h-4" />
                <span>War Roster Match</span>
              </div>
              <h2 className="font-display font-black text-2xl text-white">Tambah Pertandingan War</h2>
              <p className="text-xs text-slate-400 mt-1">
                Daftarkan pemain dari <strong>{targetWarForMatch.challenger_team?.name}</strong> melawan pemain dari <strong>{targetWarForMatch.challenged_team?.name}</strong>.
              </p>
            </div>

            {addMatchError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {addMatchError}
              </div>
            )}

            <form onSubmit={handleCreateWarMatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipe Pertandingan</label>
                  <select
                    value={warMatchForm.type}
                    onChange={(e) => setWarMatchForm({ ...warMatchForm, type: e.target.value as any })}
                    className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="BATTLE">BATTLE (Non-Ranked)</option>
                    <option value="RANKED">RANKED (-5 BP Entry per pemain)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mode Pertandingan</label>
                  <select
                    value={warMatchForm.mode}
                    onChange={(e) => {
                      const mode = e.target.value as any
                      setWarMatchForm({
                        ...warMatchForm,
                        mode,
                        team_a_player_ids: [],
                        team_b_player_ids: [],
                      })
                    }}
                    className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="SINGLES">SINGLES (1 vs 1)</option>
                    <option value="DOUBLES">DOUBLES (2 vs 2)</option>
                  </select>
                </div>
              </div>

              {/* Player Selection: Team A */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-brand-500/30 space-y-2">
                <div className="text-xs font-bold text-brand-300 flex items-center justify-between">
                  <span>Pemain {targetWarForMatch.challenger_team?.name} ({warMatchForm.mode === 'SINGLES' ? 'Pilih 1' : 'Pilih 2'} Pemain)</span>
                  <span className="text-[10px] text-slate-400">Terpilih: {warMatchForm.team_a_player_ids.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {targetWarForMatch.challenger_team?.active_members?.map((m) => {
                    const isSelected = warMatchForm.team_a_player_ids.includes(m.user_id)
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setWarMatchForm({
                              ...warMatchForm,
                              team_a_player_ids: warMatchForm.team_a_player_ids.filter((id) => id !== m.user_id),
                            })
                          } else {
                            const max = warMatchForm.mode === 'SINGLES' ? 1 : 2
                            if (warMatchForm.team_a_player_ids.length < max) {
                              setWarMatchForm({
                                ...warMatchForm,
                                team_a_player_ids: [...warMatchForm.team_a_player_ids, m.user_id],
                              })
                            }
                          }
                        }}
                        className={`p-2 rounded-xl text-left text-xs border transition-all ${
                          isSelected
                            ? 'bg-brand-500/30 border-brand-400 text-white font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="truncate">{m.user?.name}</div>
                        <div className="text-[10px] text-slate-400">@{m.user?.username}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Player Selection: Team B */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/30 space-y-2">
                <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                  <span>Pemain {targetWarForMatch.challenged_team?.name} ({warMatchForm.mode === 'SINGLES' ? 'Pilih 1' : 'Pilih 2'} Pemain)</span>
                  <span className="text-[10px] text-slate-400">Terpilih: {warMatchForm.team_b_player_ids.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {targetWarForMatch.challenged_team?.active_members?.map((m) => {
                    const isSelected = warMatchForm.team_b_player_ids.includes(m.user_id)
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setWarMatchForm({
                              ...warMatchForm,
                              team_b_player_ids: warMatchForm.team_b_player_ids.filter((id) => id !== m.user_id),
                            })
                          } else {
                            const max = warMatchForm.mode === 'SINGLES' ? 1 : 2
                            if (warMatchForm.team_b_player_ids.length < max) {
                              setWarMatchForm({
                                ...warMatchForm,
                                team_b_player_ids: [...warMatchForm.team_b_player_ids, m.user_id],
                              })
                            }
                          }
                        }}
                        className={`p-2 rounded-xl text-left text-xs border transition-all ${
                          isSelected
                            ? 'bg-amber-500/30 border-amber-400 text-white font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="truncate">{m.user?.name}</div>
                        <div className="text-[10px] text-slate-400">@{m.user?.username}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMatchModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    addMatchLoading ||
                    warMatchForm.team_a_player_ids.length !== (warMatchForm.mode === 'SINGLES' ? 1 : 2) ||
                    warMatchForm.team_b_player_ids.length !== (warMatchForm.mode === 'SINGLES' ? 1 : 2)
                  }
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-amber-600 text-white hover:from-rose-400 hover:to-amber-500 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-40"
                >
                  {addMatchLoading ? 'Menyimpan...' : 'Simpan & Jadwalkan Match War'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
