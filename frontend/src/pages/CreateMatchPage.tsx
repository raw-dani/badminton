import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Flame, AlertCircle, MapPin, Calendar, Clock, Video } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { GoldShuttlecock } from '../components/GoldShuttlecock'
import type { ApiResponse, GameMatch } from '../types'

interface PlayerOption {
  id: number
  name: string
  username: string
  player_code?: string
  city?: string
  battle_points: number
  rank_points: number
}

export const CreateMatchPage: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [type, setType] = useState<'BATTLE' | 'RANKED'>('BATTLE')
  const [mode, setMode] = useState<'SINGLES' | 'DOUBLES'>('SINGLES')
  const [venue, setVenue] = useState<string>('')
  const [date, setDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [time, setTime] = useState<string>('18:00')
  const [description, setDescription] = useState<string>('')
  const [liveStreamUrl, setLiveStreamUrl] = useState<string>('')

  // Player selection
  const [teammateId, setTeammateId] = useState<string>('')
  const [opponent1Id, setOpponent1Id] = useState<string>('')
  const [opponent2Id, setOpponent2Id] = useState<string>('')

  const [availablePlayers, setAvailablePlayers] = useState<PlayerOption[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Load available players list
  useEffect(() => {
    api.get<ApiResponse<PlayerOption[]>>('/players?exclude_me=true')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setAvailablePlayers(res.data.data)
        }
      })
      .catch((err) => console.error('Failed to load players:', err))
      .finally(() => setLoadingPlayers(false))
  }, [])

  // Filter out current user from all selections so creator can NEVER select themselves
  const eligiblePlayers = availablePlayers.filter((p) => p.id !== user?.id)

  const userBp = user?.point_balance?.battle_points ?? 0
  const canPlayRanked = userBp >= 3

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (type === 'RANKED' && !canPlayRanked) {
      setError(
        `Anda membutuhkan minimal 3 Battle Points untuk membuat Ranked Match (Poin Anda: ${userBp} BP). Mainkan Battle match terlebih dahulu untuk mengumpulkan Battle Points.`
      )
      return
    }

    if (mode === 'SINGLES' && !opponent1Id) {
      setError('Harap pilih pemain lawan untuk pertandingan tunggal.')
      return
    }

    if (mode === 'DOUBLES' && (!teammateId || !opponent1Id || !opponent2Id)) {
      setError('Pertandingan ganda memerlukan 1 partner dan 2 lawan.')
      return
    }

    setLoading(true)

    try {
      const scheduledAt = `${date} ${time}:00`
      const payload: any = {
        type,
        mode,
        venue,
        scheduled_at: scheduledAt,
        description: description || null,
        live_stream_url: liveStreamUrl.trim() || null,
        opponent_1_id: parseInt(opponent1Id, 10),
      }

      if (mode === 'DOUBLES') {
        payload.teammate_id = parseInt(teammateId, 10)
        payload.opponent_2_id = parseInt(opponent2Id, 10)
      }

      const res = await api.post<ApiResponse<GameMatch>>('/matches', payload)
      if (res.data.success && res.data.data) {
        navigate(`/matches/${res.data.data.id}`)
      } else {
        setError(res.data.message || 'Gagal membuat pertandingan')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Gagal membuat pertandingan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="space-y-6">
        
        {/* Header with Gold Shuttlecock */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/10 border border-amber-400/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 p-2">
            <GoldShuttlecock className="w-10 h-10" />
          </div>
          <h1 className="font-display font-black text-3xl text-white">
            {t('create.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {t('create.subtitle')}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Match Type Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t('create.typeLabel')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Battle Match Option */}
                <button
                  type="button"
                  onClick={() => setType('BATTLE')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    type === 'BATTLE'
                      ? 'bg-battle-500/15 border-battle-500 text-white shadow-lg shadow-battle-500/10 ring-1 ring-battle-500/50'
                      : 'bg-[#0a0f1d] border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 font-bold text-sm text-battle-300">
                      <Flame className="w-4 h-4 text-battle-400" />
                      Battle Match
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-battle-500/20 text-battle-300">
                      Kasual
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Kumpulkan Battle Points tanpa risiko Rank. Menang +3 BP, Kalah +1 BP.
                  </p>
                </button>

                {/* Ranked Match Option */}
                <button
                  type="button"
                  onClick={() => setType('RANKED')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    type === 'RANKED'
                      ? 'bg-rank-500/15 border-rank-500 text-white shadow-lg shadow-rank-500/10 ring-1 ring-rank-500/50'
                      : 'bg-[#0a0f1d] border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 font-bold text-sm text-rank-300">
                      <Trophy className="w-4 h-4 text-rank-400" />
                      Ranked Match
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rank-500/20 text-rank-300">
                      Kompetitif
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Kompetisi papan peringkat resmi. Masuk potong 3 BP. Menang +3 RP, Kalah -1 RP.
                  </p>
                </button>
              </div>

              {type === 'RANKED' && (
                <div className="mt-3 p-3 rounded-xl bg-rank-500/10 border border-rank-500/30 flex items-center justify-between text-xs text-rank-300">
                  <span>{t('create.rankedRequirement')}</span>
                  <span className="font-bold">
                    Saldo BP Anda: {userBp} BP {canPlayRanked ? '✓' : '✗'}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Match Mode Selection (Singles vs Doubles) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t('create.modeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('SINGLES')}
                  className={`py-3 px-4 rounded-xl text-sm font-bold border transition-all text-center ${
                    mode === 'SINGLES'
                      ? 'bg-white/10 border-brand-500 text-white shadow-sm'
                      : 'bg-[#0a0f1d] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('match.mode.singles')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('DOUBLES')}
                  className={`py-3 px-4 rounded-xl text-sm font-bold border transition-all text-center ${
                    mode === 'DOUBLES'
                      ? 'bg-white/10 border-brand-500 text-white shadow-sm'
                      : 'bg-[#0a0f1d] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('match.mode.doubles')}
                </button>
              </div>
            </div>

            {/* Step 3: Venue, Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {t('match.venue')}
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Contoh: Istora Senayan, Lapangan 2"
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Tanggal
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Waktu
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Step 3.5: Optional Live Streaming URL */}
            <div className="p-4 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 space-y-2">
              <label className="block text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-rose-400" />
                {t('match.liveStreamUrl')}
              </label>
              <input
                type="url"
                value={liveStreamUrl}
                onChange={(e) => setLiveStreamUrl(e.target.value)}
                placeholder="https://youtube.com/live/... atau https://tiktok.com/@user/live"
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{t('match.liveStreamOptional')}</span>
                <span className="flex items-center gap-1 text-slate-400">
                  Didukung: YouTube • TikTok • Twitch • FB Live
                </span>
              </div>
            </div>

            {/* Step 4: Participants Selection */}
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('create.selectParticipants')}
              </label>

              {/* Creator Card */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  <strong>Tim A ({t('create.you')}):</strong> {user?.name} (@{user?.username})
                </span>
                <span className="text-emerald-400 font-bold">{t('create.autoConfirmed')}</span>
              </div>

              {/* Doubles: Partner Picker (Strictly excludes creator & opponents) */}
              {mode === 'DOUBLES' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('create.partnerLabel')}
                  </label>
                  <select
                    value={teammateId}
                    onChange={(e) => setTeammateId(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                    required
                  >
                    <option value="">{t('create.partnerPlaceholder')}</option>
                    {eligiblePlayers
                      .filter((p) => p.id.toString() !== opponent1Id && p.id.toString() !== opponent2Id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (@{p.username}) • {p.city || 'Klub'} • {p.battle_points} BP
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Opponent 1 Picker (Strictly excludes creator, partner, opponent 2) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {mode === 'DOUBLES' ? t('create.opponent1Label') : t('create.opponentPlaceholder')}
                </label>
                <select
                  value={opponent1Id}
                  onChange={(e) => setOpponent1Id(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  required
                >
                  <option value="">{t('create.opponentPlaceholder')}</option>
                  {eligiblePlayers
                    .filter((p) => p.id.toString() !== teammateId && p.id.toString() !== opponent2Id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (@{p.username}) • {p.city || 'Klub'} • {p.battle_points} BP
                      </option>
                    ))}
                </select>
              </div>

              {/* Doubles: Opponent 2 Picker (Strictly excludes creator, partner, opponent 1) */}
              {mode === 'DOUBLES' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('create.opponent2Label')}
                  </label>
                  <select
                    value={opponent2Id}
                    onChange={(e) => setOpponent2Id(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                    required
                  >
                    <option value="">{t('create.opponentPlaceholder')}</option>
                    {eligiblePlayers
                      .filter((p) => p.id.toString() !== teammateId && p.id.toString() !== opponent1Id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (@{p.username}) • {p.city || 'Klub'} • {p.battle_points} BP
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Optional Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('match.description')}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan pertandingan, shuttlecock yang digunakan, dll..."
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
              />
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading || (type === 'RANKED' && !canPlayRanked)}
              className="w-full py-3.5 rounded-xl text-sm font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 disabled:opacity-50 transition-all shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? t('common.loading') : t('create.submitButton')}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
