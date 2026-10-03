import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  FileEdit,
  Clock,
  MapPin,
  Calendar,
  History,
  Eye,
  Check,
  X,
  User,
} from 'lucide-react'
import api from '../lib/api'
import { useLanguage } from '../context/LanguageContext'
import type { GameMatch, ApiResponse } from '../types'
import { formatFullDate, formatShortDate, getStatusBadgeClass } from '../lib/utils'

export const AdminDisputesPage: React.FC = () => {
  const { t } = useLanguage()

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE')
  const [activeDisputes, setActiveDisputes] = useState<GameMatch[]>([])
  const [historyDisputes, setHistoryDisputes] = useState<GameMatch[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Inspection modal state
  const [inspectingMatch, setInspectingMatch] = useState<GameMatch | null>(null)

  // Resolution form modal state
  const [resolvingMatch, setResolvingMatch] = useState<GameMatch | null>(null)
  const [action, setAction] = useState<'CONFIRM_RESULT' | 'CORRECT_SCORE' | 'CANCEL_MATCH'>('CONFIRM_RESULT')
  const [reason, setReason] = useState<string>('')
  const [correctedSets, setCorrectedSets] = useState([
    { set_number: 1, team_a_score: 21, team_b_score: 18 },
    { set_number: 2, team_a_score: 21, team_b_score: 19 },
  ])
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchActiveDisputes = () => {
    setLoading(true)
    api.get<ApiResponse<GameMatch[]>>('/admin/disputes?status=active')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setActiveDisputes(res.data.data)
        }
      })
      .catch((err) => console.error('Failed to load active disputes:', err))
      .finally(() => setLoading(false))
  }

  const fetchHistoryDisputes = () => {
    setLoading(true)
    api.get<ApiResponse<GameMatch[]>>('/admin/disputes?status=history')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setHistoryDisputes(res.data.data)
        }
      })
      .catch((err) => console.error('Failed to load dispute history:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'ACTIVE') {
      fetchActiveDisputes()
    } else {
      fetchHistoryDisputes()
    }
  }, [activeTab])

  const openResolutionModal = (match: GameMatch) => {
    setResolvingMatch(match)
    setAction('CONFIRM_RESULT')
    setReason('')
    setError(null)
    if (match.current_scores && match.current_scores.length > 0) {
      setCorrectedSets(
        match.current_scores.map((s) => ({
          set_number: s.set_number,
          team_a_score: s.team_a_score,
          team_b_score: s.team_b_score,
        }))
      )
    }
  }

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvingMatch) return
    if (reason.trim().length < 5) {
      setError('Harap masukkan alasan dan catatan keputusan tertulis (minimal 5 karakter).')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload: any = {
      resolution_action: action,
      resolution_reason: reason,
    }

    if (action === 'CORRECT_SCORE') {
      payload.corrected_sets = correctedSets
    }

    try {
      const res = await api.post<ApiResponse>(`/admin/disputes/${resolvingMatch.id}/resolve`, payload)
      if (res.data.success) {
        setSuccessMsg(`Sengketa match #${resolvingMatch.match_code} berhasil diselesaikan melalui ${action}.`)
        setResolvingMatch(null)
        fetchActiveDisputes()
        fetchHistoryDisputes()
      } else {
        setError(res.data.message || 'Gagal menyelesaikan sengketa.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Gagal menyelesaikan sengketa.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentList = activeTab === 'ACTIVE' ? activeDisputes : historyDisputes

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          {t('admin.disputesTitle')}
        </div>
        <h1 className="font-display font-black text-3xl text-white">
          Penyelesaian Sengketa Pertandingan
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {t('admin.disputesSubtitle')}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-xs underline">Tutup</button>
        </div>
      )}

      {/* Tabs Switcher: Active Disputes vs History (Item #9) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ACTIVE'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          {t('admin.activeDisputes')} ({activeDisputes.length})
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'HISTORY'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-3.5 h-3.5 text-purple-400" />
          {t('admin.resolvedDisputes')} ({historyDisputes.length})
        </button>
      </div>

      {/* Disputes Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Memuat data sengketa...</p>
          </div>
        ) : currentList.length > 0 ? (
          currentList.map((match) => (
            <div
              key={match.id}
              className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-display font-black text-lg text-white">
                    Match #{match.match_code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-slate-300">
                    {match.type} {match.mode}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${getStatusBadgeClass(match.status)}`}>
                    {match.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatShortDate(match.scheduled_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {match.venue}
                  </span>
                </div>
              </div>

              {/* Dispute Claim Banner */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  {t('admin.filedBy')} {match.disputer?.name || 'Peserta'}
                </div>
                <p className="text-sm text-white italic">
                  "{match.dispute_reason || 'Tidak ada alasan tertulis'}"
                </p>
              </div>

              {/* Decision Note (if in History tab) */}
              {match.admin_resolution_note && (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('admin.decisionNotes')}
                  </div>
                  <p className="text-xs text-purple-200">
                    {match.admin_resolution_note}
                  </p>
                </div>
              )}

              {/* Action Buttons & Quick Score Preview */}
              <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Skor Terakhir: </span>
                  <span className="font-bold text-white">
                    {match.current_scores?.map((s) => `Set ${s.set_number}: ${s.team_a_score}-${s.team_b_score}`).join(' | ') || 'N/A'}
                  </span>
                  <span className="text-slate-400 ml-2">
                    (Versi {match.current_score_version})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Inspect Score History Button (Item #8) */}
                  <button
                    onClick={() => setInspectingMatch(match)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-brand-400" />
                    {t('admin.inspectHistory')}
                  </button>

                  <Link
                    to={`/matches/${match.id}`}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  >
                    {t('common.details')}
                  </Link>

                  {match.status === 'DISPUTED' && (
                    <button
                      onClick={() => openResolutionModal(match)}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {t('admin.arbitrate')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400/40 mx-auto" />
            <h3 className="text-sm font-bold text-white">
              {activeTab === 'ACTIVE' ? 'Tidak Ada Sengketa Aktif' : 'Belum Ada Riwayat Sengketa'}
            </h3>
            <p className="text-xs text-slate-400">
              {activeTab === 'ACTIVE'
                ? 'Semua pertandingan telah berjalan damai dengan persetujuan unanimous 100%.'
                : 'Belum ada pertandingan yang diselesaikan melalui intervensi arbitrase admin.'}
            </p>
          </div>
        )}
      </div>

      {/* Inspect Score History Modal (Item #8) */}
      {inspectingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111a2e] border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4">
            <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-brand-400" />
                Linimasa Riwayat Skor: Match #{inspectingMatch.match_code}
              </h3>
              <button
                onClick={() => setInspectingMatch(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="text-xs text-slate-400">
                Berikut adalah rekam jejak setiap versi skor yang diinputkan oleh para pemain beserta status persetujuan atau sanggahannya.
              </div>

              {inspectingMatch.score_versions && inspectingMatch.score_versions.length > 0 ? (
                inspectingMatch.score_versions.map((ver) => {
                  const verApprovals = inspectingMatch.approvals?.filter((a) => a.version === ver.version) ?? []
                  const isCurrent = ver.version === inspectingMatch.current_score_version

                  return (
                    <div
                      key={ver.id}
                      className={`p-5 rounded-2xl border space-y-3 ${
                        isCurrent
                          ? 'bg-brand-500/[0.05] border-brand-500/40 ring-1 ring-brand-500/30'
                          : 'bg-[#0a0f1d] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            Versi {ver.version}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30">
                              Versi Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatFullDate(ver.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Diinput oleh: <strong>{ver.submitter?.name || 'Pemain'}</strong> (@{ver.submitter?.username})</span>
                      </div>

                      {/* Sets Breakdown */}
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Skor Set yang Diinputkan:
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {Array.isArray(ver.sets_data) ? (
                            ver.sets_data.map((s: any) => (
                              <span key={s.set_number} className="font-semibold text-white">
                                Set {s.set_number}: <span className="text-brand-300 font-bold">{s.team_a_score} - {s.team_b_score}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">{ver.summary || 'Detail skor tercatat'}</span>
                          )}
                        </div>
                      </div>

                      {/* Approvals / Disputes on this version */}
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Voting Persetujuan pada Versi Ini:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {verApprovals.map((app) => (
                            <div
                              key={app.id}
                              className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
                            >
                              <span className="text-white truncate max-w-[120px]">{app.user?.name}</span>
                              {app.status === 'APPROVED' ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                                  <Check className="w-3 h-3" /> Disetujui
                                </span>
                              ) : (
                                <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                                  <AlertTriangle className="w-3 h-3" /> Sengketa
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Tidak ada rekaman versi skor tambahan untuk pertandingan ini.
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setInspectingMatch(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Resolution Arbiter Modal */}
      {resolvingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111a2e] border border-rose-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-rose-500/20 bg-rose-500/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                Arbitrase Sengketa: Match #{resolvingMatch.match_code}
              </h3>
              <button
                onClick={() => setResolvingMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolve} className="p-6 space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Action Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {t('admin.resolutionAction')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAction('CONFIRM_RESULT')}
                    className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      action === 'CONFIRM_RESULT'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-[#0a0f1d] border-white/10 text-slate-400'
                    }`}
                  >
                    Konfirmasi Skor
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('CORRECT_SCORE')}
                    className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      action === 'CORRECT_SCORE'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#0a0f1d] border-white/10 text-slate-400'
                    }`}
                  >
                    Koreksi Skor
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('CANCEL_MATCH')}
                    className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      action === 'CANCEL_MATCH'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-[#0a0f1d] border-white/10 text-slate-400'
                    }`}
                  >
                    Batalkan Match
                  </button>
                </div>
              </div>

              {/* Correct Score Inputs */}
              {action === 'CORRECT_SCORE' && (
                <div className="space-y-3 p-4 rounded-2xl bg-[#0a0f1d] border border-amber-500/30">
                  <div className="text-xs font-bold text-amber-300">
                    Inputkan Skor Koreksi Resmi:
                  </div>
                  {correctedSets.map((s, idx) => (
                    <div key={s.set_number} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-bold text-slate-400">Set {s.set_number}:</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={s.team_a_score}
                        onChange={(e) => {
                          const updated = [...correctedSets]
                          updated[idx].team_a_score = parseInt(e.target.value, 10) || 0
                          setCorrectedSets(updated)
                        }}
                        className="w-16 bg-[#111a2e] border border-white/15 rounded-lg px-2 py-1 text-center font-bold text-white focus:outline-none"
                      />
                      <span className="text-slate-400">-</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={s.team_b_score}
                        onChange={(e) => {
                          const updated = [...correctedSets]
                          updated[idx].team_b_score = parseInt(e.target.value, 10) || 0
                          setCorrectedSets(updated)
                        }}
                        className="w-16 bg-[#111a2e] border border-white/15 rounded-lg px-2 py-1 text-center font-bold text-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Action Explanations */}
              <div className="text-[11px] text-slate-400 p-3 rounded-xl bg-white/5">
                {action === 'CONFIRM_RESULT' && (
                  <span>Mengonfirmasi skor versi {resolvingMatch.current_score_version} sebagai skor final resmi dan mengalokasikan poin kepada kedua pemain.</span>
                )}
                {action === 'CORRECT_SCORE' && (
                  <span>Menyimpan skor koreksi resmi baru oleh admin dan menyelesaikan pertandingan langsung.</span>
                )}
                {action === 'CANCEL_MATCH' && (
                  <span>Membatalkan pertandingan secara permanen. Bila merupakan Ranked Match, 3 BP yang telah dipotong akan otomatis dikembalikan ke seluruh pemain.</span>
                )}
              </div>

              {/* Reason input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {t('admin.resolutionReason')}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Meninjau bukti skor fisik dari wasit lapangan, skor set 2 sah 21-17..."
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-rose-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingMatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/25"
                >
                  {submitting ? 'Memproses...' : 'Eksekusi Putusan Arbitrase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
