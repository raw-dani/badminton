import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Search, MapPin, Trophy, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import type { LeaderboardPlayer, ApiResponse } from '../types'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getInitials } from '../lib/utils'

export const BattleLeaderboardPage: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([])
  const [topThree, setTopThree] = useState<LeaderboardPlayer[]>([])
  const [search, setSearch] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchLeaderboard = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (city) params.append('city', city)
    params.append('page', page.toString())
    params.append('per_page', '20')

    api.get<ApiResponse<{ data: LeaderboardPlayer[]; meta: any; top_three: LeaderboardPlayer[] }>>(
      `/leaderboards/battle?${params.toString()}`
    )
      .then((res) => {
        if (res.data.success && res.data.data) {
          setPlayers(res.data.data.data)
          setMeta(res.data.data.meta)
          if (res.data.data.top_three && res.data.data.top_three.length > 0) {
            setTopThree(res.data.data.top_three)
          }
        }
      })
      .catch((err) => console.error('Failed to load battle leaderboard:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [page, city])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLeaderboard()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-battle-500/20 bg-gradient-to-r from-battle-500/10 via-[#111a2e] to-[#0a0f1d]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-battle-500/20 text-battle-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Flame className="w-4 h-4 text-battle-400" />
            {t('leaderboard.battleTitle', 'Activity & Participation Ladder')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white">
            {t('leaderboard.battleTitle', 'Battle Points Leaderboard')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mt-1">
            {t('leaderboard.battleSubtitle', 'Ranked by accumulated Battle Points (+3 Win, +1 Loss). Accumulate BP to unlock competitive Ranked matches.')}
          </p>
        </div>

        {meta?.current_user_rank && (
          <div className="px-5 py-3 rounded-2xl bg-battle-500/20 border border-battle-500/40 text-center shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-battle-300">{t('leaderboard.yourRank', 'Peringkat Anda Saat Ini')}</div>
            <div className="font-display font-black text-3xl text-white">#{meta.current_user_rank}</div>
          </div>
        )}
      </div>

      {/* Top 3 Podium Highlights */}
      {topThree.length >= 3 && page === 1 && !search && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Silver #2 */}
          <div className="order-2 md:order-1 glass-panel rounded-3xl p-6 border border-slate-400/30 text-center relative overflow-hidden flex flex-col justify-between">
            <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-950 font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
              #2
            </div>
            <div className="w-16 h-16 rounded-2xl bg-battle-500/20 text-battle-300 font-bold flex items-center justify-center text-xl mx-auto mb-2 border border-slate-400/40 overflow-hidden">
              {topThree[1].avatar_url ? (
                <img src={topThree[1].avatar_url} alt={topThree[1].name} className="w-full h-full object-cover" />
              ) : (
                getInitials(topThree[1].name)
              )}
            </div>
            <h3 className="font-bold text-base text-white truncate">{topThree[1].name}</h3>
            <p className="text-xs text-slate-400 mb-3">{topThree[1].city || 'Indonesia'}</p>
            <div className="font-display font-black text-2xl text-battle-300 mb-1">
              {topThree[1].battle_points} <span className="text-xs text-slate-400 font-normal">BP</span>
            </div>
            <div className="text-xs text-slate-400">{topThree[1].win_rate}% Win Rate • {topThree[1].total_matches} Matches</div>
          </div>

          {/* Gold #1 */}
          <div className="order-1 md:order-2 glass-panel rounded-3xl p-8 border border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-[#111a2e] text-center relative overflow-hidden shadow-xl shadow-amber-500/10 -mt-2 flex flex-col justify-between">
            <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/30">
              #1
            </div>
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-2xl mx-auto mb-2 border-2 border-amber-400/50 overflow-hidden">
              {topThree[0].avatar_url ? (
                <img src={topThree[0].avatar_url} alt={topThree[0].name} className="w-full h-full object-cover" />
              ) : (
                getInitials(topThree[0].name)
              )}
            </div>
            <h3 className="font-bold text-lg text-white truncate">{topThree[0].name}</h3>
            <p className="text-xs text-amber-300/80 mb-3">{topThree[0].city || 'Indonesia'}</p>
            <div className="font-display font-black text-3xl text-amber-300 mb-1">
              {topThree[0].battle_points} <span className="text-xs text-slate-400 font-normal">BP</span>
            </div>
            <div className="text-xs text-slate-300 font-semibold">{topThree[0].win_rate}% Win Rate • {topThree[0].total_matches} Matches</div>
          </div>

          {/* Bronze #3 */}
          <div className="order-3 glass-panel rounded-3xl p-6 border border-amber-700/40 text-center relative overflow-hidden flex flex-col justify-between">
            <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
              #3
            </div>
            <div className="w-16 h-16 rounded-2xl bg-battle-500/20 text-battle-300 font-bold flex items-center justify-center text-xl mx-auto mb-2 border border-amber-700/40 overflow-hidden">
              {topThree[2].avatar_url ? (
                <img src={topThree[2].avatar_url} alt={topThree[2].name} className="w-full h-full object-cover" />
              ) : (
                getInitials(topThree[2].name)
              )}
            </div>
            <h3 className="font-bold text-base text-white truncate">{topThree[2].name}</h3>
            <p className="text-xs text-slate-400 mb-3">{topThree[2].city || 'Indonesia'}</p>
            <div className="font-display font-black text-2xl text-battle-300 mb-1">
              {topThree[2].battle_points} <span className="text-xs text-slate-400 font-normal">BP</span>
            </div>
            <div className="text-xs text-slate-400">{topThree[2].win_rate}% Win Rate • {topThree[2].total_matches} Matches</div>
          </div>

        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('leaderboard.searchPlaceholder', 'Cari nama pemain atau username...')}
            className="w-full bg-[#0a0f1d] border border-white/15 focus:border-battle-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0a0f1d] border border-white/15 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value)
                setPage(1)
              }}
              className="bg-transparent text-white focus:outline-none text-xs"
            >
              <option value="">{t('leaderboard.allCities', 'Semua Kota / Wilayah')}</option>
              <option value="Jakarta">Jakarta</option>
              <option value="Bandung">Bandung</option>
              <option value="Surabaya">Surabaya</option>
              <option value="Kuala Lumpur">Kuala Lumpur</option>
              <option value="Copenhagen">Copenhagen</option>
              <option value="Tokyo">Tokyo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0b1222] border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">{t('leaderboard.rank', 'Peringkat')}</th>
                <th className="px-6 py-4">{t('leaderboard.player', 'Pemain')}</th>
                <th className="px-6 py-4 text-center">Battle Points</th>
                <th className="px-6 py-4 text-center">{t('leaderboard.matches', 'Pertandingan')}</th>
                <th className="px-6 py-4 text-center">{t('leaderboard.record', 'Rekor W/L')}</th>
                <th className="px-6 py-4 text-center">{t('leaderboard.winRate', 'Rasio Menang')}</th>
                <th className="px-6 py-4 text-right">{t('common.actions', 'Aksi')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                    Loading battle leaderboard...
                  </td>
                </tr>
              ) : players.length > 0 ? (
                players.map((p) => {
                  const isCurrent = user?.id === p.user_id
                  return (
                    <tr
                      key={p.user_id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isCurrent ? 'bg-battle-500/10 border-l-4 border-l-battle-500' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-display font-black text-sm">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                          p.rank_position === 1 ? 'bg-amber-400 text-slate-950' :
                          p.rank_position === 2 ? 'bg-slate-300 text-slate-950' :
                          p.rank_position === 3 ? 'bg-amber-700 text-white' : 'text-slate-400'
                        }`}>
                          #{p.rank_position}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <Link to={`/players/${p.username}`} className="flex items-center gap-3 group">
                          <div className="w-10 h-10 rounded-xl bg-battle-500/20 text-battle-300 font-bold flex items-center justify-center text-xs border border-battle-500/30 overflow-hidden shrink-0">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(p.name)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-battle-400 transition-colors flex items-center gap-1.5">
                              {p.name}
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-battle-500 text-slate-950 uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              @{p.username} • {p.city || 'Indonesia'}
                            </div>
                          </div>
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-center font-display font-black text-base text-battle-300">
                        {p.battle_points}
                      </td>

                      <td className="px-6 py-4 text-center text-xs font-semibold text-slate-300">
                        {p.total_matches}
                      </td>

                      <td className="px-6 py-4 text-center text-xs text-slate-300">
                        <span className="text-emerald-400 font-bold">{p.total_wins}W</span> -{' '}
                        <span className="text-rose-400 font-bold">{p.total_losses}L</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          {p.win_rate}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/players/${p.username}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          {t('leaderboard.viewProfile', 'Profil')}
                        </Link>
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

        {/* Pagination Controls */}
        {meta && meta.last_page > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 bg-[#0b1222]">
            <span>
              Page {meta.current_page} of {meta.last_page} ({meta.total} players)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
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
