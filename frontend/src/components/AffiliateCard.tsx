import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gift,
  Copy,
  Check,
  Users,
  CheckCircle2,
  Clock,
  Flame,
  Share2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import api from '../lib/api'
import type { AffiliateStats, ApiResponse } from '../types'
import { useLanguage } from '../context/LanguageContext'
import { formatDate, getInitials } from '../lib/utils'

export const AffiliateCard: React.FC = () => {
  const { t } = useLanguage()
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [copied, setCopied] = useState<boolean>(false)

  const fetchStats = () => {
    setLoading(true)
    api.get<ApiResponse<AffiliateStats>>('/affiliate/stats')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setStats(res.data.data)
        }
      })
      .catch((err) => console.error('Failed to load affiliate stats:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const affiliateUrl = stats
    ? `${window.location.origin}/register?ref=${stats.referral_code}`
    : ''

  const handleCopy = () => {
    if (!affiliateUrl) return
    navigator.clipboard.writeText(affiliateUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center py-12">
        <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Memuat data afiliasi...</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div id="affiliate" className="glass-panel p-6 sm:p-8 rounded-3xl border border-brand-500/30 bg-gradient-to-br from-[#0c182b] via-[#0d1426] to-[#120f26] shadow-2xl space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-bold uppercase tracking-wider">
            <Gift className="w-3.5 h-3.5 text-brand-400" />
            <span>{t('affiliate.title', 'Program Afiliasi & Referral')}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-display font-black text-white">
            {t('affiliate.title', 'Program Afiliasi & Referral')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            {t('affiliate.subtitle', 'Undang teman bermain bulu tangkis dan kumpulkan ratusan Battle Points gratis bersama!')}
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-center shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Bonus per Undangan
          </div>
          <div className="font-display font-black text-2xl text-amber-400">
            +100 <span className="text-xs font-normal text-amber-200">BP Masing-Masing</span>
          </div>
        </div>
      </div>

      {/* How it works info box */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          {t('affiliate.howItWorks', 'Cara Kerja Bonus Afiliasi:')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
              Bagikan Tautan
            </div>
            <p className="text-[11px] text-slate-400">{t('affiliate.step1', 'Bagikan link afiliasi unik Anda ke teman atau komunitas bulu tangkis.')}</p>
          </div>
          <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
              Teman Mendaftar
            </div>
            <p className="text-[11px] text-slate-400">{t('affiliate.step2', 'Teman Anda mendaftar akun baru melalui link referral tersebut.')}</p>
          </div>
          <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
              Main 1 Match (+100 BP!)
            </div>
            <p className="text-[11px] text-slate-400">{t('affiliate.step3', 'Setelah teman menyelesaikan 1 match apapun, Anda dan teman langsung dapat +100 BP!')}</p>
          </div>
        </div>
      </div>

      {/* Affiliate Link Input & Copy Button */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300">
          {t('affiliate.yourLink', 'Tautan Afiliasi Anda')}
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 bg-[#0a0f1d] border border-white/15 rounded-xl px-4 py-3 text-xs font-mono text-brand-300 select-all truncate">
            {affiliateUrl}
          </div>
          <button
            onClick={handleCopy}
            className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-lg shadow-brand-500/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{t('affiliate.linkCopied', 'Link Tersalin!')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{t('affiliate.copyLink', 'Salin Link Afiliasi')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
            <Users className="w-3.5 h-3.5 text-brand-400" />
            <span>{t('affiliate.totalInvited', 'Total Diundang')}</span>
          </div>
          <div className="font-display font-black text-2xl text-white">
            {stats.total_referred}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('affiliate.completed', 'Match Selesai')}</span>
          </div>
          <div className="font-display font-black text-2xl text-emerald-300">
            {stats.completed_referred}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/20">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('affiliate.pending', 'Menunggu Match')}</span>
          </div>
          <div className="font-display font-black text-2xl text-amber-300">
            {stats.pending_referred}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-battle-500/30">
          <div className="flex items-center gap-1.5 text-battle-300 text-xs font-semibold mb-1">
            <Flame className="w-3.5 h-3.5 text-battle-400" />
            <span>{t('affiliate.totalEarned', 'Total BP Didapat')}</span>
          </div>
          <div className="font-display font-black text-2xl text-battle-300">
            +{stats.total_points_earned} <span className="text-xs font-normal text-slate-400">BP</span>
          </div>
        </div>
      </div>

      {/* Referrals List Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {t('affiliate.referralList', 'Daftar Teman yang Diundang')} ({stats.referrals.length})
        </h4>

        {stats.referrals.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0f1d]/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Pemain</th>
                  <th className="px-4 py-3">Tanggal Daftar</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Bonus Anda</th>
                  <th className="px-4 py-3 text-right">Match Pertama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.referrals.map((ref) => {
                  const isCompleted = ref.status === 'COMPLETED'
                  return (
                    <tr key={ref.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-300 font-bold flex items-center justify-center text-xs border border-brand-500/30 overflow-hidden shrink-0">
                            {ref.referred_user?.avatar_url ? (
                              <img src={ref.referred_user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(ref.referred_user?.name || 'Player')
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white truncate max-w-[140px]">
                              {ref.referred_user?.name || 'Pemain'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              @{ref.referred_user?.username || 'user'} • {ref.referred_user?.city || 'Indonesia'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDate(ref.created_at)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isCompleted ? t('affiliate.statusCompleted', 'Selesai (+100 BP)') : t('affiliate.statusPending', 'Menunggu Match')}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center font-bold">
                        {isCompleted ? (
                          <span className="text-emerald-400 font-black">+100 BP</span>
                        ) : (
                          <span className="text-slate-500">+100 BP (Pending)</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {ref.first_match_id ? (
                          <Link
                            to={`/matches/${ref.first_match_id}`}
                            className="inline-flex items-center gap-1 text-brand-400 hover:underline"
                          >
                            <span>#{ref.first_match_code || ref.first_match_id}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#0a0f1d]/40 border border-white/5 text-center text-xs text-slate-400">
            {t('affiliate.noReferrals', 'Belum ada teman yang mendaftar melalui link afiliasi Anda. Bagikan link sekarang untuk mulai mengumpulkan Battle Points gratis!')}
          </div>
        )}
      </div>

    </div>
  )
}
