import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Flame, Swords, Calendar, MapPin, CheckCircle, Clock, AlertTriangle, ArrowRight, Radio } from 'lucide-react'
import type { GameMatch } from '../types'
import { formatShortDate, getStatusBadgeClass } from '../lib/utils'
import { useLanguage } from '../context/LanguageContext'

interface MatchCardProps {
  match: GameMatch
  currentUserId?: number | null
  onAccept?: (id: number) => void
  onReject?: (id: number) => void
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  currentUserId,
  onAccept,
  onReject,
}) => {
  const { t } = useLanguage()
  const isRanked = match.type === 'RANKED'
  const isDoubles = match.mode === 'DOUBLES'

  const teamAPlayers = match.match_players?.filter((p) => p.team === 'TEAM_A') ?? []
  const teamBPlayers = match.match_players?.filter((p) => p.team === 'TEAM_B') ?? []

  // Check if current user has a pending invitation
  const myPlayerRecord = currentUserId
    ? match.match_players?.find((p) => p.user_id === currentUserId)
    : null
  const isMyInvitationPending = myPlayerRecord?.invitation_status === 'PENDING'

  // Current approval count
  const expectedPlayers = isDoubles ? 4 : 2
  const currentApprovalsCount = match.current_approvals?.filter((a) => a.status === 'APPROVED').length ?? 0

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300 relative group overflow-hidden">
      {/* Top Banner: Type, Mode, Status */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {isRanked ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-rank-500/15 text-rank-400 border border-rank-500/30">
              <Trophy className="w-3.5 h-3.5" />
              {t('match.type.ranked', 'Ranked Match')}
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-battle-500/15 text-battle-400 border border-battle-500/30">
              <Flame className="w-3.5 h-3.5" />
              {t('match.type.battle', 'Battle Match')}
            </span>
          )}

          <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-400 bg-white/5 border border-white/10">
            {match.mode === 'DOUBLES' ? t('match.mode.doubles', 'Ganda') : t('match.mode.singles', 'Tunggal')}
          </span>

          {match.live_stream_url && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 animate-pulse">
              <Radio className="w-3 h-3 text-red-400" />
              LIVE
            </span>
          )}
        </div>

        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadgeClass(match.status)}`}>
          {t(`match.status.${match.status.toLowerCase()}`, match.status.replace('_', ' '))}
        </span>
      </div>

      {/* Teams & Scores Breakdown */}
      <div className="bg-[#0a0f1d]/70 rounded-xl p-3.5 border border-white/5 mb-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Team A */}
          <div className="flex-1 text-left min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Team A
            </div>
            {teamAPlayers.map((p) => (
              <Link
                key={p.id}
                to={`/players/${p.user?.username}`}
                className="block text-sm font-bold text-white hover:text-brand-400 transition-colors truncate"
              >
                {p.user?.name}
              </Link>
            ))}
          </div>

          {/* Scores or VS */}
          <div className="shrink-0 text-center px-2">
            {match.current_scores && match.current_scores.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 font-display font-black text-lg text-white">
                  {match.current_scores.map((set) => (
                    <span
                      key={set.set_number}
                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs"
                    >
                      {set.team_a_score}-{set.team_b_score}
                    </span>
                  ))}
                </div>
                {match.winning_team && (
                  <span className="text-[10px] font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {match.winning_team === 'TEAM_A' ? 'Team A Won' : 'Team B Won'}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs text-slate-400 border border-white/10">
                VS
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 text-right min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Team B
            </div>
            {teamBPlayers.map((p) => (
              <Link
                key={p.id}
                to={`/players/${p.user?.username}`}
                className="block text-sm font-bold text-white hover:text-brand-400 transition-colors truncate"
              >
                {p.user?.name}
              </Link>
            ))}
          </div>

        </div>
      </div>

      {/* Match Meta: Date & Venue */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {formatShortDate(match.scheduled_at)}
        </span>
        <span className="flex items-center gap-1 truncate max-w-[180px]" title={match.venue}>
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {match.venue}
        </span>
      </div>

      {/* Approval Status Progress Bar (if waiting approval) */}
      {match.status === 'WAITING_APPROVAL' && (
        <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
          <span className="text-amber-300 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            {t('match.approvals', 'Persetujuan')}: {currentApprovalsCount} / {expectedPlayers}
          </span>
          <span className="text-[11px] text-amber-400 font-bold">
            {t('admin.version', 'Versi')} {match.current_score_version}
          </span>
        </div>
      )}

      {/* Dispute Alert (if disputed) */}
      {match.status === 'DISPUTED' && (
        <div className="mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate">{t('match.disputedNote', 'Hasil disengketakan. Menunggu keputusan admin.')}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        {isMyInvitationPending && onAccept && onReject ? (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => onReject(match.id)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
            >
              {t('match.rejectInvite', 'Tolak')}
            </button>
            <button
              onClick={() => onAccept(match.id)}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-brand-400 hover:bg-brand-300 transition-colors shadow-sm"
            >
              {t('match.acceptInvite', 'Terima Pertandingan')}
            </button>
          </div>
        ) : (
          <Link
            to={`/matches/${match.id}`}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 group-hover:text-brand-400 transition-colors ml-auto"
          >
            <span>{t('common.details', 'Detail Pertandingan')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
    </div>
  )
}
