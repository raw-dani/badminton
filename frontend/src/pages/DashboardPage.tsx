import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  Flame,
  Swords,
  PlusCircle,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  History,
  Activity,
  Award,
  Zap,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { AffiliateCard } from '../components/AffiliateCard'
import type { GameMatch, MatchInvitation, ApiResponse } from '../types'
import { formatShortDate, getInitials, getStatusBadgeClass } from '../lib/utils'

interface DashboardData {
  user: {
    id: number
    name: string
    username: string
    role: string
    profile?: any
  }
  point_cards: {
    battle_points: number
    rank_points: number
    battle_rank: number | null
    rank_rank: number | null
  }
  statistics: {
    total_matches: number
    battle_matches: number
    ranked_matches: number
    total_wins: number
    total_losses: number
    singles_wins: number
    singles_losses: number
    doubles_wins: number
    doubles_losses: number
    current_streak: number
    longest_streak: number
    win_rate?: number
  }
  pending_actions: {
    invitations: MatchInvitation[]
    scores_awaiting_approval: GameMatch[]
    disputed_matches: GameMatch[]
    total_pending_count: number
  }
  upcoming_matches: GameMatch[]
  recent_matches: GameMatch[]
  performance_chart: Array<{
    date: string
    point_type: string
    amount: number
    new_balance: number
    category: string
  }>
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const fetchDashboard = () => {
    setLoading(true)
    api.get<ApiResponse<DashboardData>>('/dashboard')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setData(res.data.data)
        }
      })
      .catch((err) => console.error('Dashboard load failed:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const handleAcceptInvitation = async (matchId: number) => {
    try {
      const res = await api.post<ApiResponse>(`/matches/${matchId}/accept`)
      if (res.data.success) {
        setActionMessage('Invitation accepted! Match is confirmed.')
        fetchDashboard()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept invitation.')
    }
  }

  const handleRejectInvitation = async (matchId: number) => {
    try {
      const res = await api.post<ApiResponse>(`/matches/${matchId}/reject`)
      if (res.data.success) {
        setActionMessage('Invitation declined.')
        fetchDashboard()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to decline invitation.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading your player dashboard...</p>
      </div>
    )
  }

  if (!data) return null

  const winRate =
    data.statistics.total_matches > 0
      ? Math.round((data.statistics.total_wins / data.statistics.total_matches) * 100)
      : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner: Welcome & Quick Create */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/20 text-brand-300 font-extrabold flex items-center justify-center text-xl border border-brand-500/30 overflow-hidden shadow-lg shadow-brand-500/10">
            {data.user.profile?.avatar_url ? (
              <img src={data.user.profile.avatar_url} alt={data.user.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(data.user.name)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-black text-white">
                {t('dashboard.welcome', 'Selamat datang kembali')}, {data.user.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {data.user.profile?.player_code || 'PRO'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              @{data.user.username} • {data.user.profile?.city || 'Club Arena'} •{' '}
              <span className="text-emerald-400 font-semibold">{data.statistics.current_streak} {t('dashboard.streak', 'Kemenangan Beruntun')} 🔥</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/matches/create"
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>{t('nav.createMatch', 'Buat Match')}</span>
          </Link>
          <Link
            to={`/players/${data.user.username}`}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            {t('nav.profile', 'Profil Publik')}
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {actionMessage}
          </span>
          <button onClick={() => setActionMessage(null)} className="text-xs underline">{t('common.close', 'Tutup')}</button>
        </div>
      )}

      {/* Point Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Battle Points - Clickable to Separate Battle Points Ledger */}
        <Link
          to="/points/ledger?type=BATTLE"
          className="glass-panel p-5 rounded-2xl border border-battle-500/30 hover:border-battle-500/60 hover:bg-battle-500/5 transition-all relative overflow-hidden group cursor-pointer block"
          title="Klik untuk melihat riwayat mutasi Battle Points"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-battle-300 mb-2">
            <span>{t('public.battlePoints', 'Battle Points')}</span>
            <Flame className="w-4 h-4 text-battle-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-display font-black text-3xl text-white">
            {data.point_cards.battle_points}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="text-battle-400/80 group-hover:text-battle-300 font-medium">Lihat Riwayat →</span>
            <span className="text-battle-400 font-bold">{data.point_cards.battle_points >= 3 ? t('dashboard.rankedReady', 'Siap Ranked') : t('dashboard.need3BP', 'Butuh 3 BP')}</span>
          </div>
        </Link>

        {/* Rank Points - Clickable to Separate Rank Points Ledger */}
        <Link
          to="/points/ledger?type=RANK"
          className="glass-panel p-5 rounded-2xl border border-rank-500/30 hover:border-rank-500/60 hover:bg-rank-500/5 transition-all relative overflow-hidden group cursor-pointer block"
          title="Klik untuk melihat riwayat mutasi Rank Points"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rank-300 mb-2">
            <span>{t('public.rankPoints', 'Rank Points')}</span>
            <Trophy className="w-4 h-4 text-rank-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className={`font-display font-black text-3xl ${data.point_cards.rank_points < 0 ? 'text-rose-400' : 'text-white'}`}>
            {data.point_cards.rank_points}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="text-rank-400/80 group-hover:text-rank-300 font-medium">Lihat Riwayat →</span>
            <span className="text-rank-400 font-bold">+3 Win / -1 Loss</span>
          </div>
        </Link>

        {/* Battle Ladder Rank */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>{t('dashboard.standing', 'Peringkat Battle')}</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display font-black text-3xl text-white">
            {data.point_cards.battle_rank ? `#${data.point_cards.battle_rank}` : 'Unranked'}
          </div>
          <Link to="/leaderboards/battle" className="text-[11px] text-emerald-400 hover:underline mt-2 inline-block">
            {t('dashboard.viewBattleLadder', 'Lihat Battle Ladder →')}
          </Link>
        </div>

        {/* Competitive Rank Ladder Position */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>{t('dashboard.competitiveRank', 'Peringkat Ranked')}</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-display font-black text-3xl text-white">
            {data.point_cards.rank_rank ? `#${data.point_cards.rank_rank}` : 'Unranked'}
          </div>
          <Link to="/leaderboards/rank" className="text-[11px] text-purple-400 hover:underline mt-2 inline-block">
            {t('dashboard.viewRankLadder', 'Lihat Rank Ladder →')}
          </Link>
        </div>

      </div>

      {/* Pending Action Alerts (Invitations, Approvals, Disputes) */}
      {data.pending_actions.total_pending_count > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {t('dashboard.actionCenter', 'Pusat Tindakan & Persetujuan')} ({data.pending_actions.total_pending_count})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pending Invitations */}
            {data.pending_actions.invitations.map((inv) => (
              <div key={inv.id} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    {t('dashboard.invitations', 'Undangan Pertandingan')}
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    Match #{inv.match?.match_code} • {inv.match?.type} {inv.match?.mode}
                  </div>
                  <div className="text-xs text-slate-300">
                    {inv.invited_by?.name ? `${t('match.invitedBy', 'Diundang oleh')} ${inv.invited_by.name}` : ''} • {inv.match?.venue}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRejectInvitation(inv.match_id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors"
                  >
                    {t('match.rejectInvite', 'Tolak')}
                  </button>
                  <button
                    onClick={() => handleAcceptInvitation(inv.match_id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-brand-400 hover:bg-brand-300 transition-colors shadow-sm"
                  >
                    {t('match.acceptInvite', 'Terima')}
                  </button>
                </div>
              </div>
            ))}

            {/* Scores Awaiting Approval */}
            {data.pending_actions.scores_awaiting_approval.map((match) => (
              <div key={match.id} className="p-4 rounded-2xl bg-battle-500/15 border border-battle-500/30 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-battle-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    {t('dashboard.scoresAwaiting', 'Skor Menunggu Persetujuan Anda')}
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    Match #{match.match_code} ({t('admin.version', 'v')}{match.current_score_version})
                  </div>
                  <div className="text-xs text-slate-300">
                    {t('match.unanimousNote', 'Skor diinput oleh lawan. Persetujuan Anda wajib.')}
                  </div>
                </div>
                <Link
                  to={`/matches/${match.id}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-brand-400 hover:bg-brand-300 transition-all shrink-0"
                >
                  {t('match.approveScore', 'Tinjau & Setujui')}
                </Link>
              </div>
            ))}

            {/* Disputed Matches */}
            {data.pending_actions.disputed_matches.map((match) => (
              <div key={match.id} className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    {t('match.status.disputed', 'Skor Disengketakan')}
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    Match #{match.match_code}
                  </div>
                  <div className="text-xs text-rose-200/80 truncate">
                    Reason: "{match.dispute_reason}"
                  </div>
                </div>
                <Link
                  to={`/matches/${match.id}`}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shrink-0"
                >
                  {t('common.details', 'Detail Lengkap')}
                </Link>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Main 2-Column Section: Performance Chart & Player Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Performance Progression Chart (2 Cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-400" />
                {t('dashboard.performanceChart', 'Grafik Tren Performa Poin')}
              </h3>
              <p className="text-xs text-slate-400">{t('dashboard.actionSubtitle', 'Catatan fluktuasi poin terverifikasi dari pertandingan yang telah selesai')}</p>
            </div>
            <Link to="/points/ledger" className="text-xs font-semibold text-brand-400 hover:underline">
              {t('nav.ledger', 'Buku Poin')} →
            </Link>
          </div>

          <div className="h-64 w-full pt-4">
            {data.performance_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.performance_chart}>
                  <defs>
                    <linearGradient id="pointColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111a2e',
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="new_balance"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#pointColor)"
                    name="Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                {t('dashboard.noRecent', 'Belum ada transaksi poin. Mainkan pertandingan untuk mulai!')}
              </div>
            )}
          </div>
        </div>

        {/* Player Stats Overview (1 Col) */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            {t('dashboard.breakdown', 'Statistik Performa')}
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">{t('dashboard.totalMatches', 'Total Pertandingan')}</span>
              <span className="font-bold text-white">{data.statistics.total_matches}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">{t('public.winRate', 'Persentase Menang')}</span>
              <span className="font-bold text-emerald-400">{winRate}% ({data.statistics.total_wins}W - {data.statistics.total_losses}L)</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">{t('dashboard.singlesRecord', 'Rekor Tunggal')}</span>
              <span className="font-bold text-white">{data.statistics.singles_wins}W - {data.statistics.singles_losses}L</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">{t('dashboard.doublesRecord', 'Rekor Ganda')}</span>
              <span className="font-bold text-white">{data.statistics.doubles_wins}W - {data.statistics.doubles_losses}L</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">{t('public.streak', 'Winning Streak')}</span>
              <span className="font-bold text-brand-400">{data.statistics.current_streak} Wins 🔥</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-slate-400">{t('dashboard.longestStreak', 'Kemenangan Beruntun Terpanjang')}</span>
              <span className="font-bold text-white">{data.statistics.longest_streak} Wins</span>
            </div>
          </div>
        </div>

      </div>

      {/* Affiliate Program Card */}
      <AffiliateCard />

      {/* Upcoming & Recent Matches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upcoming Matches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-400" />
              {t('dashboard.upcomingMatches', 'Jadwal Pertandingan Mendatang')}
            </h3>
            <Link to="/matches" className="text-xs font-semibold text-brand-400 hover:underline">
              {t('nav.matches', 'Pertandingan')} →
            </Link>
          </div>

          <div className="space-y-3">
            {data.upcoming_matches.length > 0 ? (
              data.upcoming_matches.map((m) => (
                <Link
                  key={m.id}
                  to={`/matches/${m.id}`}
                  className="block glass-panel p-4 rounded-2xl border border-white/10 hover:border-brand-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Match #{m.match_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(m.status)}`}>
                      {t(`match.status.${m.status.toLowerCase()}`, m.status)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    {m.venue} • {formatShortDate(m.scheduled_at)}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 rounded-2xl glass-panel text-center text-xs text-slate-400">
                {t('dashboard.noUpcoming', 'Belum ada jadwal pertandingan terkonfirmasi.')}
              </div>
            )}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <History className="w-5 h-5 text-battle-400" />
              {t('public.recentMatches', 'Riwayat Pertandingan Terakhir')}
            </h3>
            <Link to="/matches" className="text-xs font-semibold text-battle-400 hover:underline">
              {t('nav.matches', 'Riwayat')} →
            </Link>
          </div>

          <div className="space-y-3">
            {data.recent_matches.length > 0 ? (
              data.recent_matches.slice(0, 4).map((m) => (
                <Link
                  key={m.id}
                  to={`/matches/${m.id}`}
                  className="block glass-panel p-4 rounded-2xl border border-white/10 hover:border-battle-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">
                      #{m.match_code} ({m.type} {m.mode})
                    </span>
                    <span className="text-xs font-extrabold text-emerald-400">
                      {m.current_scores?.map((s) => `${s.team_a_score}-${s.team_b_score}`).join(', ') || 'Finished'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Played on {formatShortDate(m.scheduled_at)} at {m.venue}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 rounded-2xl glass-panel text-center text-xs text-slate-400">
                {t('dashboard.noRecent', 'Belum ada riwayat pertandingan selesai.')}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
