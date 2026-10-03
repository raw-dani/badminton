import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  History,
  Flame,
  Trophy,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react'
import api from '../lib/api'
import type { PointTransaction, ApiResponse } from '../types'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { formatDate } from '../lib/utils'

interface SummaryStats {
  point_type: string
  total_inflow: number
  total_outflow: number
  battle_balance: number
  rank_balance: number
}

export const PointLedgerPage: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  // Determine active tab: BATTLE, RANK, or ALL (defaults to BATTLE)
  const rawType = searchParams.get('type')?.toUpperCase()
  const activeTab: 'BATTLE' | 'RANK' | 'ALL' =
    rawType === 'RANK' ? 'RANK' : rawType === 'ALL' ? 'ALL' : 'BATTLE'

  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [category, setCategory] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [meta, setMeta] = useState<any>(null)
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const handleTabChange = (newTab: 'BATTLE' | 'RANK' | 'ALL') => {
    setSearchParams({ type: newTab })
    setCategory('')
    setPage(1)
  }

  const fetchTransactions = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeTab !== 'ALL') {
      params.append('point_type', activeTab)
    }
    if (category) {
      params.append('category', category)
    }
    params.append('page', page.toString())
    params.append('per_page', '20')

    api.get<ApiResponse<any>>(`/points/transactions?${params.toString()}`)
      .then((res) => {
        if (res.data.success && res.data.data) {
          const raw = res.data.data
          const items = Array.isArray(raw) ? raw : raw.data || raw.transactions || []
          setTransactions(items)
          setMeta(raw)
          if (raw.summary) {
            setSummary(raw.summary)
          }
        }
      })
      .catch((err) => console.error('Failed to load transactions:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTransactions()
  }, [activeTab, category, page])

  const battleBalance = user?.point_balance?.battle_points ?? summary?.battle_balance ?? 0
  const rankBalance = user?.point_balance?.rank_points ?? summary?.rank_balance ?? 0

  // Category labels helper
  const getCategoryLabel = (cat: string, pType: string) => {
    switch (cat) {
      case 'BATTLE_MATCH_WIN':
        return t('cat.battleWin', 'Menang Battle Match (+3 BP)')
      case 'BATTLE_MATCH_LOSS':
        return t('cat.battleLoss', 'Partisipasi/Kalah Battle Match (+1 BP)')
      case 'RANKED_MATCH_ENTRY_DEDUCTION':
        return t('cat.rankedEntry', 'Biaya Masuk Ranked Match (-3 BP)')
      case 'RANKED_MATCH_REFUND':
        return t('cat.rankedRefund', 'Pengembalian Pembatalan Admin (+3 BP)')
      case 'AFFILIATE_REWARD':
        return t('cat.affiliateReward', 'Bonus Afiliasi (+100 BP)')
      case 'RANKED_MATCH_WIN':
        return t('cat.rankedWin', 'Kemenangan Ranked (+3 RP)')
      case 'RANKED_MATCH_LOSS':
        return t('cat.rankedLoss', 'Kekalahan Ranked (-1 RP)')
      case 'ADMIN_ADJUSTMENT':
        return t('cat.adminAdjust', 'Penyesuaian Manual Admin')
      default:
        return cat.replace(/_/g, ' ')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 bg-gradient-to-r from-[#111a2e] to-[#0a0f1d] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
            <History className="w-4 h-4 text-brand-400" />
            <span>{t('ledger.title', 'Buku Audit Transaksi Poin')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-black text-white">
            {activeTab === 'BATTLE' && (
              <span className="flex items-center gap-2">
                <Flame className="w-8 h-8 text-battle-400 inline" />
                {t('nav.battleHistory', 'Riwayat Mutasi Battle Points')}
              </span>
            )}
            {activeTab === 'RANK' && (
              <span className="flex items-center gap-2">
                <Trophy className="w-8 h-8 text-rank-400 inline" />
                {t('nav.rankHistory', 'Riwayat Mutasi Rank Points')}
              </span>
            )}
            {activeTab === 'ALL' && (
              <span className="flex items-center gap-2">
                <Layers className="w-8 h-8 text-brand-400 inline" />
                {t('ledger.tabAll', 'Semua Mutasi Poin')}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-2 leading-relaxed">
            {activeTab === 'BATTLE' && t('ledger.battleSub', 'Mata uang aktivitas & partisipasi (+3 Win, +1 Loss, -3 Stake Masuk Ranked, +3 Refund Pembatalan Match).')}
            {activeTab === 'RANK' && t('ledger.rankSub', 'Poin tangga liga kompetitif resmi (+3 Win, -1 Loss, Koreksi Sengketa Admin).')}
            {activeTab === 'ALL' && t('ledger.allSub', 'Log audit gabungan seluruh mutasi saldo poin akun Anda dengan verifikasi ledger transparan.')}
          </p>
        </div>

        {/* Current Balances Pill */}
        <div className="flex items-center gap-3 shrink-0 relative z-10 w-full sm:w-auto">
          <button
            onClick={() => handleTabChange('BATTLE')}
            className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl border text-center transition-all ${
              activeTab === 'BATTLE'
                ? 'bg-battle-500/25 border-battle-500/50 shadow-lg shadow-battle-500/20 ring-2 ring-battle-400/40'
                : 'bg-battle-500/10 border-battle-500/25 hover:bg-battle-500/20'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-battle-300">
              <Flame className="w-3 h-3 text-battle-400" />
              Battle Points
            </div>
            <div className="font-display font-black text-2xl text-white mt-0.5">
              {battleBalance} <span className="text-xs font-normal text-slate-400">BP</span>
            </div>
          </button>

          <button
            onClick={() => handleTabChange('RANK')}
            className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl border text-center transition-all ${
              activeTab === 'RANK'
                ? 'bg-rank-500/25 border-rank-500/50 shadow-lg shadow-rank-500/20 ring-2 ring-rank-400/40'
                : 'bg-rank-500/10 border-rank-500/25 hover:bg-rank-500/20'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rank-300">
              <Trophy className="w-3 h-3 text-rank-400" />
              Rank Points
            </div>
            <div className={`font-display font-black text-2xl mt-0.5 ${rankBalance < 0 ? 'text-rose-400' : 'text-white'}`}>
              {rankBalance} <span className="text-xs font-normal text-slate-400">RP</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation: Separated Battle Points vs Rank Points */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          
          {/* Tab 1: Battle Points */}
          <button
            onClick={() => handleTabChange('BATTLE')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'BATTLE'
                ? 'bg-gradient-to-r from-battle-500 to-amber-600 text-slate-950 shadow-lg shadow-battle-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame className={`w-4 h-4 ${activeTab === 'BATTLE' ? 'text-slate-950' : 'text-battle-400'}`} />
            <span>{t('ledger.tabBattle', 'Battle Points')}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'BATTLE' ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-battle-300'
            }`}>
              {battleBalance} BP
            </span>
          </button>

          {/* Tab 2: Rank Points */}
          <button
            onClick={() => handleTabChange('RANK')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'RANK'
                ? 'bg-gradient-to-r from-rank-500 to-purple-600 text-white shadow-lg shadow-rank-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className={`w-4 h-4 ${activeTab === 'RANK' ? 'text-white' : 'text-rank-400'}`} />
            <span>{t('ledger.tabRank', 'Rank Points')}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'RANK' ? 'bg-white/20 text-white' : 'bg-white/10 text-rank-300'
            }`}>
              {rankBalance} RP
            </span>
          </button>

          {/* Tab 3: All Point Logs */}
          <button
            onClick={() => handleTabChange('ALL')}
            className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'ALL'
                ? 'bg-white/15 text-white border border-white/20 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>{t('ledger.tabAll', 'Semua Mutasi')}</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          {meta?.total !== undefined ? `${meta.total} ${t('common.records', 'transaksi tercatat')}` : ''}
        </div>
      </div>

      {/* Tailored Statistics Cards (Separate per Point Type) */}
      {activeTab === 'BATTLE' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-battle-500/30 relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-wider text-battle-300 flex items-center justify-between mb-1">
              <span>{t('ledger.currentBalance', 'Saldo Battle Points')}</span>
              <Flame className="w-4 h-4 text-battle-400" />
            </div>
            <div className="font-display font-black text-3xl text-white">
              {battleBalance} <span className="text-sm font-normal text-slate-400">BP</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {battleBalance >= 3 ? (
                <span className="text-emerald-400 font-semibold">✓ Siap Main Ranked Match (Min 3 BP)</span>
              ) : (
                <span className="text-amber-400 font-semibold">⚠ Butuh minimal 3 BP untuk Ranked</span>
              )}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between mb-1">
              <span>{t('ledger.totalGained', 'Total BP Masuk')}</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-display font-black text-3xl text-emerald-300">
              +{summary?.total_inflow ?? 0} <span className="text-sm font-normal text-emerald-400/70">BP</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Kemenangan (+3), kalah (+1), dan pengembalian refund (+3)
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between mb-1">
              <span>{t('ledger.totalDeducted', 'Total BP Keluar')}</span>
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            </div>
            <div className="font-display font-black text-3xl text-rose-300">
              -{summary?.total_outflow ?? 0} <span className="text-sm font-normal text-rose-400/70">BP</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Stake biaya masuk pertandingan Ranked (-3 BP)
            </div>
          </div>
        </div>
      )}

      {activeTab === 'RANK' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-rank-500/30 relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-wider text-rank-300 flex items-center justify-between mb-1">
              <span>{t('ledger.currentBalance', 'Saldo Rank Points')}</span>
              <Trophy className="w-4 h-4 text-rank-400" />
            </div>
            <div className={`font-display font-black text-3xl ${rankBalance < 0 ? 'text-rose-400' : 'text-white'}`}>
              {rankBalance} <span className="text-sm font-normal text-slate-400">RP</span>
            </div>
            <div className="text-xs text-purple-300/80 mt-1">
              Peringkat Kompetitif Musim 1 (+3 Win, -1 Loss)
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between mb-1">
              <span>{t('ledger.totalGained', 'Total RP Kemenangan')}</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-display font-black text-3xl text-emerald-300">
              +{summary?.total_inflow ?? 0} <span className="text-sm font-normal text-emerald-400/70">RP</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Perolehan poin dari kemenangan pertandingan ranked (+3 RP)
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between mb-1">
              <span>{t('ledger.totalDeducted', 'Total RP Pengurangan')}</span>
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            </div>
            <div className="font-display font-black text-3xl text-rose-300">
              -{summary?.total_outflow ?? 0} <span className="text-sm font-normal text-rose-400/70">RP</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Pengurangan poin dari kekalahan pertandingan ranked (-1 RP)
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ALL' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-battle-500/30">
            <div className="text-xs font-bold uppercase tracking-wider text-battle-300 flex items-center justify-between mb-1">
              <span>Battle Points</span>
              <Flame className="w-4 h-4 text-battle-400" />
            </div>
            <div className="font-display font-black text-3xl text-white">
              {battleBalance} <span className="text-sm font-normal text-slate-400">BP</span>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-rank-500/30">
            <div className="text-xs font-bold uppercase tracking-wider text-rank-300 flex items-center justify-between mb-1">
              <span>Rank Points</span>
              <Trophy className="w-4 h-4 text-rank-400" />
            </div>
            <div className={`font-display font-black text-3xl ${rankBalance < 0 ? 'text-rose-400' : 'text-white'}`}>
              {rankBalance} <span className="text-sm font-normal text-slate-400">RP</span>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between mb-1">
              <span>Total Log Mutasi</span>
              <History className="w-4 h-4 text-brand-400" />
            </div>
            <div className="font-display font-black text-3xl text-white">
              {meta?.total ?? transactions.length}
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {t('common.filter', 'Filter Kategori')}:
          </span>

          {/* Contextual Category Dropdown based on active tab */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            className="bg-[#0a0f1d] text-white border border-white/15 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-brand-500"
          >
            <option value="">{t('common.allCategories', 'Semua Kategori Transaksi')}</option>
            
            {activeTab === 'BATTLE' && (
              <>
                <option value="BATTLE_MATCH_WIN">🏆 {t('cat.battleWin', 'Menang Battle Match (+3 BP)')}</option>
                <option value="BATTLE_MATCH_LOSS">⚡ {t('cat.battleLoss', 'Partisipasi/Kalah Battle Match (+1 BP)')}</option>
                <option value="RANKED_MATCH_ENTRY_DEDUCTION">🔻 {t('cat.rankedEntry', 'Biaya Stake Ranked Match (-3 BP)')}</option>
                <option value="RANKED_MATCH_REFUND">↩️ {t('cat.rankedRefund', 'Pengembalian Pembatalan Admin (+3 BP)')}</option>
                <option value="AFFILIATE_REWARD">🎁 {t('cat.affiliateReward', 'Bonus Afiliasi (+100 BP)')}</option>
                <option value="ADMIN_ADJUSTMENT">⚙️ {t('cat.adminAdjust', 'Penyesuaian Manual Admin')}</option>
              </>
            )}

            {activeTab === 'RANK' && (
              <>
                <option value="RANKED_MATCH_WIN">🏆 {t('cat.rankedWin', 'Kemenangan Ranked Match (+3 RP)')}</option>
                <option value="RANKED_MATCH_LOSS">🔻 {t('cat.rankedLoss', 'Kekalahan Ranked Match (-1 RP)')}</option>
                <option value="ADMIN_ADJUSTMENT">⚙️ {t('cat.adminAdjust', 'Penyesuaian Manual Admin')}</option>
              </>
            )}

            {activeTab === 'ALL' && (
              <>
                <option value="BATTLE_MATCH_WIN">Menang Battle Match (+3 BP)</option>
                <option value="BATTLE_MATCH_LOSS">Partisipasi/Kalah Battle Match (+1 BP)</option>
                <option value="RANKED_MATCH_ENTRY_DEDUCTION">Biaya Stake Ranked Match (-3 BP)</option>
                <option value="RANKED_MATCH_REFUND">Pengembalian Pembatalan Admin (+3 BP)</option>
                <option value="AFFILIATE_REWARD">Bonus Afiliasi (+100 BP)</option>
                <option value="RANKED_MATCH_WIN">Kemenangan Ranked Match (+3 RP)</option>
                <option value="RANKED_MATCH_LOSS">Kekalahan Ranked Match (-1 RP)</option>
                <option value="ADMIN_ADJUSTMENT">Penyesuaian Manual Admin</option>
              </>
            )}
          </select>

          {category && (
            <button
              onClick={() => {
                setCategory('')
                setPage(1)
              }}
              className="text-xs text-rose-400 hover:text-rose-300 underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400">
          {t('common.showing', 'Menampilkan')} <span className="font-bold text-white">{transactions.length}</span> {t('common.transactions', 'transaksi')}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0b1222] border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">{t('ledger.txCode', 'Kode Transaksi')}</th>
                <th className="px-6 py-4">{t('ledger.date', 'Tanggal & Waktu')}</th>
                <th className="px-6 py-4">{t('ledger.category', 'Kategori')}</th>
                <th className="px-6 py-4">{t('ledger.description', 'Deskripsi')}</th>
                <th className="px-6 py-4 text-center">{t('ledger.previous', 'Saldo Awal')}</th>
                <th className="px-6 py-4 text-center">{t('ledger.change', 'Perubahan')}</th>
                <th className="px-6 py-4 text-center">{t('ledger.newBalance', 'Saldo Akhir')}</th>
                <th className="px-6 py-4 text-right">{t('ledger.match', 'Pertandingan')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-xs">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                      <span>{t('common.loading', 'Memuat data transaksi ledger...')}</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => {
                  const isPositive = tx.amount > 0
                  const isRefund = tx.category === 'RANKED_MATCH_REFUND'
                  const isEntry = tx.category === 'RANKED_MATCH_ENTRY_DEDUCTION'
                  const pointUnit = tx.point_type === 'BATTLE' ? 'BP' : 'RP'

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Transaction Code */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="hover:text-white cursor-pointer select-all">{tx.transaction_code}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </td>

                      {/* Category Badge */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {tx.point_type === 'BATTLE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-battle-500/15 text-battle-300 border border-battle-500/25">
                              <Flame className="w-3 h-3 text-battle-400" />
                              {getCategoryLabel(tx.category, tx.point_type)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rank-500/15 text-rank-300 border border-rank-500/25">
                              <Trophy className="w-3 h-3 text-rank-400" />
                              {getCategoryLabel(tx.category, tx.point_type)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 text-xs text-slate-200 font-medium max-w-xs truncate" title={tx.description}>
                        {tx.description}
                      </td>

                      {/* Previous Balance */}
                      <td className="px-6 py-4 text-center text-xs font-mono text-slate-400">
                        {tx.previous_balance} {pointUnit}
                      </td>

                      {/* Change Amount */}
                      <td className="px-6 py-4 text-center font-display font-black text-sm whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                          isPositive
                            ? isRefund
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {isPositive ? (
                            isRefund ? <RotateCcw className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${tx.amount} ${pointUnit}` : `${tx.amount} ${pointUnit}`}
                        </span>
                      </td>

                      {/* New Balance */}
                      <td className="px-6 py-4 text-center text-xs font-mono font-bold text-white whitespace-nowrap">
                        {tx.new_balance} {pointUnit}
                      </td>

                      {/* Match Link */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {tx.match_id ? (
                          <Link
                            to={`/matches/${tx.match_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline"
                          >
                            <span>Match #{tx.match?.match_code || tx.match_id}</span>
                            <span>→</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-xs">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="text-sm font-semibold text-slate-300">
                        {t('ledger.noTx', 'Belum ada transaksi poin yang tercatat pada kategori ini.')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activeTab === 'BATTLE'
                          ? 'Mainkan pertandingan Battle atau Ranked untuk mengumpulkan mutasi Battle Points.'
                          : activeTab === 'RANK'
                          ? 'Mainkan pertandingan Ranked (butuh minimal 3 BP) untuk mengumpulkan mutasi Rank Points.'
                          : 'Setiap hasil pertandingan yang terkonfirmasi akan otomatis tercatat di sini.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 bg-[#0b1222]">
            <span>
              {t('common.page', 'Halaman')} {meta.current_page} {t('common.of', 'dari')} {meta.last_page} ({meta.total} {t('common.total', 'total')})
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
                title="Halaman Selanjutnya"
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
