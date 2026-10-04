import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Trophy,
  Flame,
  Swords,
  MapPin,
  Lock,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  Globe,
} from 'lucide-react'
import { InstagramIcon, FacebookIcon, TikTokIcon, YoutubeIcon } from '../components/SocialIcons'
import api from '../lib/api'
import type { ApiResponse, GameMatch } from '../types'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { formatShortDate, getInitials, getStatusBadgeClass, getAssetUrl } from '../lib/utils'

interface ProfileData {
  personal: {
    id: number
    name: string
    username: string
    player_code?: string
    avatar_url?: string | null
    city?: string | null
    gender?: string | null
    bio?: string | null
    preferred_position?: string | null
    instagram?: string | null
    facebook?: string | null
    tiktok?: string | null
    youtube?: string | null
    visibility: 'public' | 'private'
    date_joined: string
  }
  statistics: any
  ranking: {
    battle_rank: number | null
    rank_rank: number | null
  }
  recent_matches: GameMatch[]
  message?: string
}

export const PublicProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>()
  const { user: authUser } = useAuth()
  const { t } = useLanguage()

  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError(null)

    api.get<ApiResponse<ProfileData>>(`/players/${username}`)
      .then((res) => {
        if (res.data.success && res.data.data) {
          setData(res.data.data)
        } else {
          setError(res.data.message || 'Player profile not found.')
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to fetch player profile.')
      })
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-white">Profil Pemain Tidak Ditemukan</h2>
        <p className="text-sm text-slate-400">{error || 'Pemain yang Anda cari tidak tersedia.'}</p>
        <Link to="/leaderboards/rank" className="inline-block px-5 py-2 rounded-xl text-sm font-bold bg-brand-500 text-slate-950">
          Kembali ke Leaderboard
        </Link>
      </div>
    )
  }

  const isOwner = authUser?.id === data.personal.id

  if (data.personal.visibility === 'private' && !isOwner && authUser?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4 glass-panel rounded-3xl border border-white/10 p-8 my-12">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">{data.personal.name} (@{data.personal.username})</h2>
        <p className="text-sm text-slate-400">Pemain ini mengatur visibilitas profil menjadi privat.</p>
        <Link to="/" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-300">
          Kembali ke Beranda
        </Link>
      </div>
    )
  }

  const stats = data.statistics || {}
  const totalMatches = stats.total_matches || 0
  const winRate = totalMatches > 0 ? Math.round((stats.total_wins / totalMatches) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile Header Banner */}
      <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-[#111a2e] to-[#0d1424]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-24 h-24 rounded-3xl bg-brand-500/20 text-brand-300 font-extrabold flex items-center justify-center text-3xl border-2 border-brand-500/30 overflow-hidden shadow-xl shrink-0">
              {data.personal.avatar_url ? (
                <img src={getAssetUrl(data.personal.avatar_url)} alt={data.personal.name} className="w-full h-full object-cover" />
              ) : (
                getInitials(data.personal.name)
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
                  {data.personal.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {data.personal.player_code}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                <span>@{data.personal.username}</span>
                {data.personal.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {data.personal.city}
                  </span>
                )}
                {data.personal.preferred_position && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-300">
                    {data.personal.preferred_position.replace('_', ' ')}
                  </span>
                )}
              </p>
              {data.personal.bio && (
                <p className="text-xs text-slate-300/80 mt-2 max-w-xl italic">
                  "{data.personal.bio}"
                </p>
              )}

              {/* Social Media Badges (Item #6) */}
              {(data.personal.instagram || data.personal.facebook || data.personal.tiktok || data.personal.youtube) && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" />
                    {t('public.socialConnect')}:
                  </span>

                  {data.personal.instagram && (
                    <a
                      href={data.personal.instagram.startsWith('http') ? data.personal.instagram : `https://instagram.com/${data.personal.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 text-xs font-semibold transition-all hover:scale-105"
                    >
                      <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                      <span>{data.personal.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@')}</span>
                    </a>
                  )}

                  {data.personal.facebook && (
                    <a
                      href={data.personal.facebook.startsWith('http') ? data.personal.facebook : `https://facebook.com/${data.personal.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all hover:scale-105"
                    >
                      <FacebookIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>Facebook</span>
                    </a>
                  )}

                  {data.personal.tiktok && (
                    <a
                      href={data.personal.tiktok.startsWith('http') ? data.personal.tiktok : `https://tiktok.com/@${data.personal.tiktok.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all hover:scale-105"
                    >
                      <TikTokIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{data.personal.tiktok.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, '@')}</span>
                    </a>
                  )}

                  {data.personal.youtube && (
                    <a
                      href={data.personal.youtube.startsWith('http') ? data.personal.youtube : `https://youtube.com/@${data.personal.youtube.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold transition-all hover:scale-105"
                    >
                      <YoutubeIcon className="w-3.5 h-3.5 text-red-400" />
                      <span>YouTube</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {isOwner ? (
              <Link
                to="/profile/edit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-brand-400 hover:bg-brand-300 transition-colors"
              >
                {t('nav.settings')}
              </Link>
            ) : (
              <Link
                to="/matches/create"
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-brand-400 hover:bg-brand-300 transition-colors shadow-md"
              >
                Tantang Bertanding
              </Link>
            )}
          </div>

        </div>
      </div>

      {/* Point & Rank Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-battle-500/30">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-battle-300 mb-2">
            <span>{t('public.battlePoints')}</span>
            <Flame className="w-4 h-4 text-battle-400" />
          </div>
          <div className="font-display font-black text-3xl text-white">{stats.battle_points ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-2">Peringkat #{data.ranking.battle_rank || 'N/A'}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-rank-500/30">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rank-300 mb-2">
            <span>{t('public.rankPoints')}</span>
            <Trophy className="w-4 h-4 text-rank-400" />
          </div>
          <div className={`font-display font-black text-3xl ${(stats.rank_points ?? 0) < 0 ? 'text-rose-400' : 'text-white'}`}>
            {stats.rank_points ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Peringkat Musim #{data.ranking.rank_rank || 'N/A'}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>{t('public.winRate')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display font-black text-3xl text-emerald-400">{winRate}%</div>
          <div className="text-[11px] text-slate-400 mt-2">{stats.total_wins || 0}M - {stats.total_losses || 0}K ({totalMatches} match)</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>{t('public.streak')}</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-display font-black text-3xl text-amber-400">{stats.current_winning_streak || 0}</div>
          <div className="text-[11px] text-slate-400 mt-2">Streak Terpanjang: {stats.longest_winning_streak || 0} kemenangan</div>
        </div>
      </div>

      {/* Stats Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Match Statistics Details */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-400" />
            {t('public.stats')}
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">{t('public.totalMatches')}</span>
              <span className="font-bold text-white">{totalMatches}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">Total Battle Matches</span>
              <span className="font-bold text-white">{stats.total_battle_matches || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">Total Ranked Matches</span>
              <span className="font-bold text-white">{stats.total_ranked_matches || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">Rekor Tunggal (Singles)</span>
              <span className="font-bold text-white">{stats.singles_wins || 0}M - {(stats.singles_matches || 0) - (stats.singles_wins || 0)}K</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-slate-400">Rekor Ganda (Doubles)</span>
              <span className="font-bold text-white">{stats.doubles_wins || 0}M - {(stats.doubles_matches || 0) - (stats.doubles_wins || 0)}K</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-slate-400">{t('public.dateJoined')}</span>
              <span className="font-bold text-slate-300">{formatShortDate(data.personal.date_joined)}</span>
            </div>
          </div>
        </div>

        {/* Recent Matches Played (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-battle-400" />
            {t('public.recentMatches')}
          </h3>

          <div className="space-y-3">
            {data.recent_matches && data.recent_matches.length > 0 ? (
              data.recent_matches.map((match) => (
                <Link
                  key={match.id}
                  to={`/matches/${match.id}`}
                  className="block p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">
                      #{match.match_code} ({match.type} {match.mode})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(match.status)}`}>
                      {match.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{match.venue} • {formatShortDate(match.scheduled_at)}</span>
                    <span className="text-white font-bold group-hover:text-brand-400 flex items-center gap-1">
                      Skor: {match.current_scores?.map((s) => `${s.team_a_score}-${s.team_b_score}`).join(', ') || 'N/A'}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada riwayat pertandingan selesai untuk pemain ini.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
