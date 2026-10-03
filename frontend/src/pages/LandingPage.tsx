import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  Flame,
  Swords,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Users,
  Activity,
  Award,
  Sparkles,
  Share2,
  Gift,
} from 'lucide-react'
import api from '../lib/api'
import type { LeaderboardPlayer, ApiResponse } from '../types'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { GoldShuttlecock } from '../components/GoldShuttlecock'
import { getInitials } from '../lib/utils'

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { t, language } = useLanguage()
  const [battleTop, setBattleTop] = useState<LeaderboardPlayer[]>([])
  const [rankTop, setRankTop] = useState<LeaderboardPlayer[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<{ data: LeaderboardPlayer[] }>>('/leaderboards/battle?per_page=3'),
      api.get<ApiResponse<{ data: LeaderboardPlayer[] }>>('/leaderboards/rank?per_page=3'),
    ])
      .then(([bRes, rRes]) => {
        if (bRes.data.data?.data) setBattleTop(bRes.data.data.data.slice(0, 3))
        if (rRes.data.data?.data) setRankTop(rRes.data.data.data.slice(0, 3))
      })
      .catch((err) => console.error('Failed to load leaderboard previews:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-24 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-16 overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand-500/15 via-amber-500/10 to-rank-500/10 blur-[130px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center space-y-8">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-widest shadow-sm">
            <GoldShuttlecock className="w-4 h-4" />
            <span>{t('landing.seasonBadge', 'Musim 1: 2026 Badminton Championship Live')}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            {t('landing.heroTitle1', 'TANDING. SKOR.')} <br />
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              {t('landing.heroTitle2', 'KUASAI LAPANGAN.')}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            {t(
              'landing.heroSubtitle',
              'Platform peringkat pemain & turnamen bulu tangkis paling bergengsi. Kumpulkan Battle Points, tanding di Ranked Matches, dan taklukkan leaderboard resmi dengan verifikasi skor unanimous 100%.'
            )}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <span>{t('landing.ctaDashboard', 'Buka Dashboard Pemain')}</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
            ) : (
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <span>{t('landing.ctaRegister', 'Daftar Bergabung di Liga')}</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
            )}

            <Link
              to="/leaderboards/rank"
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center gap-2 transition-all"
            >
              <Trophy className="w-5 h-5 text-rank-400" />
              <span>{t('landing.ctaLeaderboard', 'Lihat Rank Leaderboard')}</span>
            </Link>
          </div>

          {/* Key Stats Strip */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="glass-panel p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <Users className="w-4 h-4 text-emerald-400" />
                {t('landing.statPlayers', 'Pemain Aktif')}
              </div>
              <div className="font-display font-extrabold text-2xl text-white">500+</div>
              <div className="text-[11px] text-emerald-400 mt-1">{t('landing.statPlayersSub', '500+ Atlet Terverifikasi')}</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <Swords className="w-4 h-4 text-battle-400" />
                {t('landing.statMatches', 'Pertandingan Dimainkan')}
              </div>
              <div className="font-display font-extrabold text-2xl text-white">1,240+</div>
              <div className="text-[11px] text-battle-300 mt-1">{t('landing.statMatchesSub', 'Tunggal & Ganda')}</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                {t('landing.statApprovals', 'Persetujuan Skor')}
              </div>
              <div className="font-display font-extrabold text-2xl text-white">100%</div>
              <div className="text-[11px] text-amber-300 mt-1">{t('landing.statApprovalsSub', '100% Verifikasi Unanimous')}</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                {t('landing.statLedger', 'Audit Trail Ledger')}
              </div>
              <div className="font-display font-extrabold text-2xl text-white">Zero Fraud</div>
              <div className="text-[11px] text-purple-300 mt-1">{t('landing.statLedgerSub', 'Bebas Manipulasi & Permanen')}</div>
            </div>
          </div>

        </div>
      </section>

      {/* Two Ladder Systems Comparison */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
            {t('landing.mechanicsBadge', 'Mekanisme Permainan')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-white">
            {t('landing.mechanicsTitle', 'Dua Tangga Liga. Aksi Bulu Tangkis Tanpa Batas.')}
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            {t(
              'landing.mechanicsSubtitle',
              'Baik untuk pemanasan sparring kasual maupun mengejar kejayaan di puncak klasemen musim ini, sistem poin ganda kami mencatat setiap set pertandingan secara presisi.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Battle Match Card */}
          <div className="glass-panel rounded-3xl p-8 border border-battle-500/25 relative overflow-hidden group hover:border-battle-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-battle-500/20 text-battle-400 flex items-center justify-center mb-6 border border-battle-500/30">
              <Flame className="w-6 h-6" />
            </div>

            <h3 className="font-display font-black text-2xl text-white mb-2">
              {t('landing.battleTitle', 'Battle Matches')}
            </h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t(
                'landing.battleDesc',
                'Pertandingan kasual berfokus pada aktivitas bermain. Sangat cocok untuk sesi rutin malam, sparring persahabatan, dan mengumpulkan Battle Points untuk modal masuk ke pertandingan Ranked.'
              )}
            </p>

            <div className="space-y-3 bg-[#0a0f1d]/80 rounded-2xl p-5 border border-white/5 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('landing.battleWin', 'Kemenangan Match')}
                </span>
                <span className="font-bold text-emerald-400 text-base">{t('landing.battleWinPts', '+3 Battle Points')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('landing.battleLoss', 'Partisipasi / Kekalahan')}
                </span>
                <span className="font-bold text-emerald-400 text-base">{t('landing.battleLossPts', '+1 Battle Point')}</span>
              </div>
              <div className="pt-2 border-t border-white/5 text-xs text-battle-300">
                {t('landing.battleNote', '• Battle Points tidak akan pernah bernilai negatif.')}
              </div>
            </div>

            <Link
              to="/leaderboards/battle"
              className="inline-flex items-center gap-2 text-sm font-bold text-battle-400 hover:text-battle-300 transition-colors"
            >
              <span>{t('landing.battleCta', 'Lihat Papan Peringkat Battle →')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Ranked Match Card */}
          <div className="glass-panel rounded-3xl p-8 border border-rank-500/25 relative overflow-hidden group hover:border-rank-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rank-500/20 text-rank-400 flex items-center justify-center mb-6 border border-rank-500/30">
              <Trophy className="w-6 h-6" />
            </div>

            <h3 className="font-display font-black text-2xl text-white mb-2">
              {t('landing.rankedTitle', 'Ranked Matches')}
            </h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t(
                'landing.rankedDesc',
                'Pertandingan kompetitif resmi kejuaraan. Memerlukan stake 3 BP untuk setiap pemain. Raih Rank Points bergengsi, tingkatkan tier musim aktif, dan buktikan diri sebagai pemain nomor 1 liga.'
              )}
            </p>

            <div className="space-y-3 bg-[#0a0f1d]/80 rounded-2xl p-5 border border-white/5 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> {t('landing.rankedStake', 'Biaya Masuk (Stake)')}
                </span>
                <span className="font-bold text-rose-400 text-base">{t('landing.rankedStakePts', '-3 Battle Points')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('landing.rankedWin', 'Kemenangan Ranked')}
                </span>
                <span className="font-bold text-emerald-400 text-base">{t('landing.rankedWinPts', '+3 Rank Points')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-400" /> {t('landing.rankedLoss', 'Kekalahan Ranked')}
                </span>
                <span className="font-bold text-rose-400 text-base">{t('landing.rankedLossPts', '-1 Rank Point')}</span>
              </div>
              <div className="pt-2 border-t border-white/5 text-xs text-amber-300">
                {t('landing.rankedNote', '• Rank Points dapat bernilai negatif. Direset setiap pergantian musim kompetisi.')}
              </div>
            </div>

            <Link
              to="/leaderboards/rank"
              className="inline-flex items-center gap-2 text-sm font-bold text-rank-400 hover:text-rank-300 transition-colors"
            >
              <span>{t('landing.rankedCta', 'Lihat Papan Peringkat Rank →')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* Promotional Affiliate Program Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-brand-500/30 bg-gradient-to-r from-[#0d1e2e] via-[#111a2e] to-[#14122e] relative overflow-hidden shadow-2xl">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold uppercase tracking-wider border border-brand-500/30">
                <Gift className="w-4 h-4 text-brand-400" />
                <span>{t('landing.affiliateBadge', 'Program Afiliasi Pemain Resmi')}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-display font-black text-white">
                {t('landing.affiliateTitle', 'Ajak Teman & Dapatkan 100 Battle Points Gratis!')}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {t(
                  'landing.affiliateDesc',
                  'Bagikan link afiliasi Anda ke sesama pemain. Saat teman Anda mendaftar dan menyelesaikan pertandingan pertamanya, Anda dan teman Anda masing-masing langsung menerima 100 Battle Points gratis!'
                )}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {t('landing.affiliateBenefit1', '+100 BP untuk Anda')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-amber-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  {t('landing.affiliateBenefit2', '+100 BP untuk Teman Anda')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  {t('landing.affiliateBenefit3', 'Otomatis setelah match pertama')}
                </span>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <Link
                to={isAuthenticated ? "/profile/edit#affiliate" : "/register"}
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-brand-500 to-emerald-500 text-slate-950 hover:from-brand-400 hover:to-emerald-400 shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Share2 className="w-5 h-5 stroke-[2.5]" />
                <span>{t('landing.affiliateCta', 'Daftar & Dapatkan Link Afiliasi')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Podium Showcase: Top Players Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">
            {t('landing.leadersBadge', 'Juara Teratas')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-white">
            {t('landing.leadersTitle', 'Pemimpin Klasemen Musim Ini')}
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            {t('landing.leadersSubtitle', 'Pemain-pemain terbaik yang memimpin lapangan kejuaraan saat ini.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Battle Ladder Preview */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-battle-400" />
                {t('landing.battleTop3', 'Peringkat 3 Besar Battle')}
              </h4>
              <Link to="/leaderboards/battle" className="text-xs font-semibold text-battle-400 hover:underline">
                {t('landing.viewAll', 'Lihat Semua →')}
              </Link>
            </div>

            <div className="space-y-3">
              {battleTop.map((p, idx) => (
                <Link
                  key={p.user_id}
                  to={`/players/${p.username}`}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-battle-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center ${
                      idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-battle-500/20 text-battle-300 font-bold flex items-center justify-center text-xs border border-battle-500/30 overflow-hidden">
                      {p.avatar_url ? <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" /> : getInitials(p.name)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white hover:text-battle-400 truncate max-w-[150px]">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-400">{p.city || 'Indonesia'}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-display font-black text-base text-battle-300">
                      {p.battle_points} <span className="text-xs text-slate-400 font-normal">BP</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {p.win_rate}% {t('landing.winRate', 'Rasio Menang')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Rank Ladder Preview */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-rank-400" />
                {t('landing.rankTop3', 'Peringkat 3 Besar Rank')}
              </h4>
              <Link to="/leaderboards/rank" className="text-xs font-semibold text-rank-400 hover:underline">
                {t('landing.viewAll', 'Lihat Semua →')}
              </Link>
            </div>

            <div className="space-y-3">
              {rankTop.map((p, idx) => (
                <Link
                  key={p.user_id}
                  to={`/players/${p.username}`}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-rank-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center ${
                      idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-rank-500/20 text-rank-300 font-bold flex items-center justify-center text-xs border border-rank-500/30 overflow-hidden">
                      {p.avatar_url ? <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" /> : getInitials(p.name)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white hover:text-rank-400 truncate max-w-[150px]">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-400">{p.city || 'Indonesia'}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-display font-black text-base ${p.rank_points < 0 ? 'text-rose-400' : 'text-rank-300'}`}>
                      {p.rank_points} <span className="text-xs text-slate-400 font-normal">RP</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {p.win_rate}% {t('landing.winRate', 'Rasio Menang')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Unanimous Verification & Anti-Fraud Pillar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/10 relative overflow-hidden bg-gradient-to-br from-[#111a2e] to-[#0c1322]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            
            <div className="lg:col-span-2 space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                {t('landing.trustBadge', '100% Terverifikasi & Anti-Kecurangan')}
              </span>
              <h3 className="text-2xl sm:text-3xl font-display font-black text-white">
                {t('landing.trustTitle', 'Persetujuan Skor Mutlak (100% Unanimous) & Audit Ledger')}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t(
                  'landing.trustDesc',
                  'Pertandingan tidak dapat membagikan poin melalui klaim sepihak. Setiap peserta (2 pemain di Tunggal, 4 pemain di Ganda) wajib menyetujui versi skor yang sama. Jika ada skor yang direvisi, seluruh persetujuan otomatis direset. Setiap perselisihan langsung menghentikan alokasi poin hingga diputuskan oleh arbiter liga.'
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">
                  {t('landing.trustPillar1', 'Persetujuan Multi-Set Berversi')}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">
                  {t('landing.trustPillar2', 'Kode Transaksi Ledger Permanen per Alokasi Poin')}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">
                  {t('landing.trustPillar3', 'Pusat Arbitrase Sengketa Resmi & Audit Trail Lengkap')}
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
