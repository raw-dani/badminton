import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock3,
  ShieldCheck,
  ShieldAlert,
  FileEdit,
  History,
  Tv,
  ExternalLink,
  MessageSquare,
  Send,
  Trash2,
  Camera,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { formatFullDate, getInitials, getStatusBadgeClass } from '../lib/utils'
import { ScoreSubmissionModal } from '../components/ScoreSubmissionModal'
import { DisputeModal } from '../components/DisputeModal'
import type { GameMatch, ApiResponse, MatchComment } from '../types'

export const MatchDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [match, setMatch] = useState<GameMatch | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Comments state
  const [comments, setComments] = useState<MatchComment[]>([])
  const [loadingComments, setLoadingComments] = useState<boolean>(false)
  const [newComment, setNewComment] = useState<string>('')
  const [submittingComment, setSubmittingComment] = useState<boolean>(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  // Modals state
  const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false)
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState<boolean>(false)

  const fetchComments = async () => {
    try {
      setLoadingComments(true)
      const res = await api.get<ApiResponse<MatchComment[]>>(`/matches/${id}/comments`)
      if (res.data.success && res.data.data) {
        setComments(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmittingComment(true)
    setCommentError(null)

    try {
      const res = await api.post<ApiResponse<MatchComment>>(`/matches/${id}/comments`, {
        comment: newComment.trim(),
      })
      if (res.data.success && res.data.data) {
        setComments((prev) => [res.data.data, ...prev])
        setNewComment('')
      }
    } catch (err: any) {
      setCommentError(
        err.response?.data?.message || 'Gagal mengirim komentar. Mohon gunakan bahasa yang sopan tanpa kata-kata kasar atau rasis.'
      )
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Yakin ingin menghapus komentar ini?')) return

    try {
      const res = await api.delete<ApiResponse>(`/matches/${id}/comments/${commentId}`)
      if (res.data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus komentar.')
    }
  }

  const fetchMatchDetails = async () => {
    try {
      const res = await api.get<ApiResponse<GameMatch>>(`/matches/${id}`)
      if (res.data.success && res.data.data) {
        setMatch(res.data.data)
      } else {
        setError(res.data.message || 'Match details not found.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch match details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatchDetails()
    fetchComments()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-white">{t('common.error')}</h2>
        <p className="text-sm text-slate-400">{error || 'Match not found.'}</p>
        <Link to="/matches" className="inline-block px-5 py-2 rounded-xl text-sm font-bold bg-brand-500 text-slate-950">
          {t('common.back')}
        </Link>
      </div>
    )
  }

  const teamAPlayers = match.match_players?.filter((p) => p.team === 'TEAM_A') ?? []
  const teamBPlayers = match.match_players?.filter((p) => p.team === 'TEAM_B') ?? []

  const isParticipant = user ? match.match_players?.some((p) => p.user_id === user.id) : false
  const myPlayerRecord = user ? match.match_players?.find((p) => p.user_id === user.id) : null

  // Approvals on current score version
  const currentApprovals = match.current_approvals ?? []
  const myApproval = user ? currentApprovals.find((a) => a.user_id === user.id) : null
  const hasApprovedCurrentVersion = myApproval?.status === 'APPROVED'

  const expectedParticipants = match.mode === 'DOUBLES' ? 4 : 2
  const approvedCount = currentApprovals.filter((a) => a.status === 'APPROVED').length

  const handleApproveScore = async () => {
    setActionLoading(true)
    try {
      const res = await api.post<ApiResponse<GameMatch>>(`/matches/${match.id}/approve`, {
        version: match.current_score_version,
      })
      if (res.data.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
        if (res.data.data) {
          setMatch(res.data.data)
        }
        await fetchMatchDetails()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyetujui skor.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptInvite = async () => {
    setActionLoading(true)
    try {
      const res = await api.post<ApiResponse<GameMatch>>(`/matches/${match.id}/accept`)
      if (res.data.data) {
        setMatch(res.data.data)
      }
      await fetchMatchDetails()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menerima undangan.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectInvite = async () => {
    setActionLoading(true)
    try {
      const res = await api.post<ApiResponse<GameMatch>>(`/matches/${match.id}/reject`)
      if (res.data.data) {
        setMatch(res.data.data)
      }
      await fetchMatchDetails()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menolak undangan.')
    } finally {
      setActionLoading(false)
    }
  }

  // Extract YouTube embed URL if applicable
  const getYouTubeEmbedUrl = (url?: string | null) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null
  }

  const embedUrl = getYouTubeEmbedUrl(match.live_stream_url)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                match.type === 'RANKED'
                  ? 'bg-rank-500/20 text-rank-300 border border-rank-500/40'
                  : 'bg-battle-500/20 text-battle-300 border border-battle-500/40'
              }`}>
                {match.type === 'RANKED' ? t('match.type.ranked') : t('match.type.battle')}
              </span>
              <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
                {match.mode === 'DOUBLES' ? t('match.mode.doubles') : t('match.mode.singles')}
              </span>
              {match.live_stream_url && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping mr-0.5" />
                  {t('match.liveBadge')}
                </span>
              )}
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
              Match #{match.match_code}
            </h1>
          </div>

          <div>
            <span className={`px-4 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider ${getStatusBadgeClass(match.status)}`}>
              {match.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Schedule & Venue Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{match.venue}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{formatFullDate(match.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Dibuat oleh: {match.creator?.name || 'Player'}</span>
          </div>
        </div>

        {/* Invitation Action Banner for Pending Player */}
        {isParticipant && myPlayerRecord && myPlayerRecord.invitation_status === 'PENDING' && match.status === 'PENDING_ACCEPTANCE' && (
          <div className="p-4 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-brand-200">
              <strong>Undangan Menunggu Respon:</strong> Anda telah diundang ke pertandingan ini. Silakan konfirmasi partisipasi Anda.
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRejectInvite}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors"
              >
                {t('match.rejectInvite')}
              </button>
              <button
                onClick={handleAcceptInvite}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-brand-400 hover:bg-brand-300 transition-all shadow-md"
              >
                {t('match.acceptInvite')}
              </button>
            </div>
          </div>
        )}

        {/* Dispute Resolution Note Banner (if disputed or resolved) */}
        {match.status === 'DISPUTED' && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 space-y-1">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              {t('match.status.disputed')}
            </div>
            <p className="text-xs text-rose-200">
              Alasan Sengketa: "{match.dispute_reason}". Alokasi poin ditunda menunggu keputusan Administrator Liga.
            </p>
          </div>
        )}

        {match.admin_resolution_note && (
          <div className="p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30 space-y-1">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Catatan Keputusan Arbitrase Admin
            </div>
            <p className="text-xs text-purple-200">
              {match.admin_resolution_note}
            </p>
          </div>
        )}
      </div>

      {/* Live Streaming Broadcast Section (Item #3) */}
      {match.live_stream_url && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 bg-rose-500/[0.02] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  {t('match.liveStream')}
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                </h3>
                <p className="text-xs text-slate-400">
                  Siaran langsung pertandingan bulu tangkis ini dapat ditonton secara publik.
                </p>
              </div>
            </div>

            <a
              href={match.live_stream_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-600/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka di Tab Baru
            </a>
          </div>

          {embedUrl ? (
            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <iframe
                src={embedUrl}
                title="Badminton Champion League Live Stream"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span className="truncate max-w-lg">{match.live_stream_url}</span>
              <a
                href={match.live_stream_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-400 hover:underline shrink-0 ml-2"
              >
                Buka Link Siaran ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Main Scoreboard Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Papan Skor Resmi
          </h3>

          <div className="flex items-center gap-3">
            {match.current_score_version > 0 && (
              <span className="text-xs font-semibold text-slate-400">
                Versi Skor {match.current_score_version}
              </span>
            )}
            {isParticipant && match.status !== 'COMPLETED' && match.status !== 'CANCELLED' && match.status !== 'REJECTED' && (
              <button
                onClick={() => setIsScoreModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 flex items-center gap-1.5 transition-colors"
              >
                <FileEdit className="w-3.5 h-3.5 text-brand-400" />
                {match.current_scores && match.current_scores.length > 0 ? t('match.updateScore') : t('match.submitScore')}
              </button>
            )}
          </div>
        </div>

        {/* Set By Set Score Display */}
        {match.current_scores && match.current_scores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {match.current_scores.map((set) => {
              const aWon = set.team_a_score > set.team_b_score
              return (
                <div
                  key={set.set_number}
                  className="p-5 rounded-2xl bg-[#0a0f1d] border border-white/10 text-center space-y-3 relative overflow-hidden"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Set {set.set_number}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-3xl font-display font-black">
                    <span className={aWon ? 'text-emerald-400' : 'text-slate-400'}>
                      {set.team_a_score}
                    </span>
                    <span className="text-slate-400 text-lg">:</span>
                    <span className={!aWon ? 'text-emerald-400' : 'text-slate-400'}>
                      {set.team_b_score}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {aWon ? 'Tim A memenangkan set' : 'Tim B memenangkan set'}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-10 rounded-2xl bg-[#0a0f1d] border border-white/10 text-center space-y-2">
            <Clock3 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Skor pertandingan belum diinput.</p>
            <p className="text-xs text-slate-400">
              Setiap pemain yang bertanding dapat menginput skor final setelah pertandingan selesai.
            </p>
          </div>
        )}

        {/* Teams and Participants Roster */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
          
          {/* Team A */}
          <div className={`p-5 rounded-2xl border ${match.winning_team === 'TEAM_A' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'} space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tim A {match.winning_team === 'TEAM_A' && <span className="text-emerald-400 font-bold ml-1">★ Menang</span>}
              </span>
            </div>
            <div className="space-y-2">
              {teamAPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <Link to={`/players/${p.user?.username}`} className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                      {p.user?.profile?.avatar_url ? (
                        <img src={p.user.profile.avatar_url} alt={p.user.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(p.user?.name)
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">
                        {p.user?.name}
                      </div>
                      <div className="text-[11px] text-slate-400">@{p.user?.username}</div>
                    </div>
                  </Link>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    p.invitation_status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {p.invitation_status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team B */}
          <div className={`p-5 rounded-2xl border ${match.winning_team === 'TEAM_B' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'} space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tim B {match.winning_team === 'TEAM_B' && <span className="text-emerald-400 font-bold ml-1">★ Menang</span>}
              </span>
            </div>
            <div className="space-y-2">
              {teamBPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <Link to={`/players/${p.user?.username}`} className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                      {p.user?.profile?.avatar_url ? (
                        <img src={p.user.profile.avatar_url} alt={p.user.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(p.user?.name)
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">
                        {p.user?.name}
                      </div>
                      <div className="text-[11px] text-slate-400">@{p.user?.username}</div>
                    </div>
                  </Link>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    p.invitation_status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {p.invitation_status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Match Documentation Photo */}
      {match.match_photo_url && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-brand-400" />
              Foto Bersama Pemain
            </h3>
            <span className="text-xs text-slate-400">Dokumentasi & Bukti Pertandingan</span>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 max-h-[500px] flex items-center justify-center p-2">
            <img
              src={match.match_photo_url}
              alt="Foto Bersama Pemain"
              className="w-full h-auto max-h-[480px] object-contain rounded-xl shadow-lg"
            />
          </div>
        </div>
      )}

      {/* Verification & Approvals Hub (Unanimous Approval Engine) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              {t('match.approvalProgress')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('match.unanimousNote')}
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
            {approvedCount} dari {expectedParticipants} Telah Menyetujui
          </span>
        </div>

        {/* Participant Approval Status Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {match.match_players?.map((mp) => {
            const approval = currentApprovals.find((a) => a.user_id === mp.user_id)
            const isApproved = approval?.status === 'APPROVED'
            const isDisputed = approval?.status === 'DISPUTED'

            return (
              <div
                key={mp.id}
                className="p-4 rounded-xl bg-[#0a0f1d] border border-white/10 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white/10 text-xs font-bold flex items-center justify-center shrink-0">
                    {getInitials(mp.user?.name)}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{mp.user?.name}</div>
                    <div className="text-[10px] text-slate-400">@{mp.user?.username} ({mp.team})</div>
                  </div>
                </div>

                <div>
                  {isApproved ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5" /> Disetujui
                    </span>
                  ) : isDisputed ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                      <AlertTriangle className="w-3.5 h-3.5" /> Sengketa
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                      <Clock3 className="w-3.5 h-3.5" /> Menunggu
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* User Approval Call to Action */}
        {isParticipant && match.status === 'WAITING_APPROVAL' && !hasApprovedCurrentVersion && (
          <div className="p-5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-amber-200">
              <strong>Tindakan Diperlukan:</strong> Harap tinjau skor yang diinputkan untuk versi {match.current_score_version}.
              Anda dapat menyetujui atau mengajukan sengketa bila hasil tidak sesuai.
            </div>
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setIsDisputeModalOpen(true)}
                disabled={actionLoading}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors"
              >
                {t('match.disputeScore')}
              </button>
              <button
                onClick={handleApproveScore}
                disabled={actionLoading}
                className="flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                {t('match.approveScore')}
              </button>
            </div>
          </div>
        )}

        {isParticipant && hasApprovedCurrentVersion && match.status === 'WAITING_APPROVAL' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{t('match.alreadyApproved')}. Menunggu persetujuan pemain lainnya.</span>
          </div>
        )}
      </div>

      {/* Point Transactions Ledger for Completed Matches */}
      {match.point_transactions && match.point_transactions.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <History className="w-5 h-5 text-brand-400" />
              Buku Transaksi Poin Pertandingan
            </h3>
            <span className="text-xs text-slate-400">Ledger ACID Terverifikasi</span>
          </div>

          <div className="space-y-2">
            {match.point_transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-xl bg-[#0a0f1d] border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono text-[11px] text-slate-400">{tx.transaction_code}</div>
                  <div className="text-sm font-bold text-white mt-0.5">{tx.user?.name}</div>
                  <div className="text-[11px] text-slate-400">{tx.description}</div>
                </div>

                <div className="text-right">
                  <span className={`font-display font-black text-sm ${
                    tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} {tx.point_type}
                  </span>
                  <div className="text-[10px] text-slate-400">Saldo Akhir: {tx.new_balance}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Comments Section for Completed Matches */}
      {match.status === 'COMPLETED' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-400" />
                Komentar Pertandingan ({comments.length})
              </h3>
              <p className="text-xs text-slate-400">
                Diskusikan jalannya pertandingan atau berikan apresiasi kepada para pemain.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Terbuka untuk semua anggota terdaftar
            </span>
          </div>

          {/* Polite Language Guideline Alert */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3 text-blue-300 text-xs leading-relaxed">
            <span className="text-base leading-none">💬</span>
            <span>
              <strong>Tata Tertib Komentar:</strong> Mohon selalu berkomentar dengan sopan dan sportif. Sistem akan secara otomatis menyaring serta menolak kata-kata kasar, makian, pornografi, ujaran kebencian, atau rasisme.
            </span>
          </div>

          {/* Comment Form */}
          {user ? (
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              {commentError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{commentError}</span>
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tulis tanggapan atau ucapan selamat kepada para pemain..."
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {newComment.length}/1000 karakter
                  </span>
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingComment ? 'Mengirim...' : 'Kirim Komentar'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-center text-xs text-slate-400">
              Silakan <Link to="/login" className="text-brand-400 font-bold underline">Masuk (Login)</Link> untuk meninggalkan komentar pada pertandingan ini.
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {loadingComments ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                Memuat komentar...
              </div>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-[#0a0f1d] rounded-2xl border border-white/5">
                Belum ada komentar. Jadilah yang pertama memberikan apresiasi atas pertandingan seru ini!
              </div>
            ) : (
              comments.map((c) => {
                const isMatchPlayer = match.match_players?.some((p) => p.user_id === c.user_id)
                const playerRole = match.match_players?.find((p) => p.user_id === c.user_id)
                const canDelete = user && (user.id === c.user_id || user.role === 'admin')

                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-[#0a0f1d] border border-white/10 space-y-2 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/10 text-slate-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                          {c.user?.profile?.avatar_url ? (
                            <img src={c.user.profile.avatar_url} alt={c.user.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(c.user?.name)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{c.user?.name}</span>
                            {isMatchPlayer && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/15 text-brand-300 border border-brand-500/30">
                                Pemain ({playerRole?.team === 'TEAM_A' ? 'Tim A' : 'Tim B'})
                              </span>
                            )}
                            {c.user?.role === 'admin' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            @{c.user?.username} • {formatFullDate(c.created_at)}
                          </div>
                        </div>
                      </div>

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Hapus komentar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed pl-11 whitespace-pre-line">
                      {c.comment}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ScoreSubmissionModal
        match={match}
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        onSuccess={fetchMatchDetails}
      />

      <DisputeModal
        match={match}
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        onSuccess={fetchMatchDetails}
      />

    </div>
  )
}
