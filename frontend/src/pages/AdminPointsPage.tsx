import React, { useEffect, useState } from 'react'
import { Flame, Trophy, AlertCircle, Check, ArrowRight, ShieldAlert } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ApiResponse } from '../types'

interface PlayerItem {
  id: number
  name: string
  username: string
  player_code?: string
  battle_points: number
  rank_points: number
}

export const AdminPointsPage: React.FC = () => {
  const { refreshUser } = useAuth()
  const [players, setPlayers] = useState<PlayerItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [pointType, setPointType] = useState<'BATTLE' | 'RANK'>('BATTLE')
  const [amount, setAmount] = useState<number>(3)
  const [reason, setReason] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    api.get<ApiResponse<PlayerItem[]>>('/players')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setPlayers(res.data.data)
        }
      })
      .catch((err) => console.error(err))
  }, [])

  const selectedPlayer = players.find((p) => p.id.toString() === selectedUserId)

  // Calculate projected new balance
  const currentBalance = selectedPlayer
    ? pointType === 'BATTLE'
      ? selectedPlayer.battle_points
      : selectedPlayer.rank_points
    : 0

  const projectedBalance = currentBalance + amount
  const isInvalidBattleNegative = pointType === 'BATTLE' && projectedBalance < 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) {
      setError('Please select a player to adjust points.')
      return
    }

    if (reason.trim().length < 5) {
      setError('Please provide a mandatory adjustment reason (minimum 5 characters).')
      return
    }

    if (isInvalidBattleNegative) {
      setError('Battle Points cannot become negative per league policy.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await api.post<ApiResponse>('/admin/points/adjust', {
        user_id: parseInt(selectedUserId, 10),
        point_type: pointType,
        amount,
        reason,
      })

      if (res.data.success) {
        setSuccess(`Successfully adjusted ${amount > 0 ? `+${amount}` : amount} ${pointType} points for @${selectedPlayer?.username}. Recorded in immutable audit ledger.`)
        setReason('')
        // Refresh players list and logged in user
        refreshUser()
        api.get<ApiResponse<PlayerItem[]>>('/players').then((r) => setPlayers(r.data.data || []))
      } else {
        setError(res.data.message || 'Point adjustment failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Point adjustment failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Audited Adjustment Engine
        </div>
        <h1 className="font-display font-black text-3xl text-white">
          Manual Point Adjustment Tool
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Make transparent, auditable point compensations, penalty deductions, or tournament bonus grants.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {success}
          </span>
          <button onClick={() => setSuccess(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Form Card */}
      <div className="glass-panel p-8 rounded-3xl border border-amber-500/25 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Player Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Select Player Account
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-[#0a0f1d] border border-white/15 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
              required
            >
              <option value="">Choose a player...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (@{p.username}) • BP: {p.battle_points} | RP: {p.rank_points}
                </option>
              ))}
            </select>
          </div>

          {/* Point Type Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Point Category
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPointType('BATTLE')}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  pointType === 'BATTLE'
                    ? 'bg-battle-500/20 border-battle-500 text-battle-300'
                    : 'bg-[#0a0f1d] border-white/10 text-slate-400'
                }`}
              >
                <Flame className="w-4 h-4 text-battle-400" />
                Battle Points (Non-Negative)
              </button>

              <button
                type="button"
                onClick={() => setPointType('RANK')}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  pointType === 'RANK'
                    ? 'bg-rank-500/20 border-rank-500 text-rank-300'
                    : 'bg-[#0a0f1d] border-white/10 text-slate-400'
                }`}
              >
                <Trophy className="w-4 h-4 text-rank-400" />
                Rank Points (Allows Negative)
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Adjustment Amount (Positive to add, negative to deduct)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#0a0f1d] border border-white/15 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none"
              required
            />
          </div>

          {/* Balance Preview Box */}
          {selectedPlayer && (
            <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Current Balance: </span>
                <span className="font-bold text-white">{currentBalance} {pointType}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Projected Balance: </span>
                <span className={`font-bold font-mono text-sm ${projectedBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {projectedBalance} {pointType}
                </span>
              </div>
            </div>
          )}

          {isInvalidBattleNegative && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              Violation: Battle Points must never become negative. Current: {currentBalance}, Requested: {amount}.
            </div>
          )}

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Adjustment Reason (Mandatory Audit Log) <span className="text-amber-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Tournament fair play compensation, walkover match correction, or penalty deduction..."
              className="w-full bg-[#0a0f1d] border border-white/15 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !selectedUserId || reason.trim().length < 5 || isInvalidBattleNegative}
            className="w-full py-3.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {loading ? 'Committing Adjustment...' : 'Record Audited Point Adjustment'}
          </button>
        </form>
      </div>

    </div>
  )
}
