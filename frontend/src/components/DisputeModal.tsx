import React, { useState } from 'react'
import { X, AlertTriangle, ShieldAlert } from 'lucide-react'
import api from '../lib/api'
import type { GameMatch, ApiResponse } from '../types'

interface DisputeModalProps {
  match: GameMatch
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  match,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim().length < 5) {
      setError('Please provide a specific dispute reason (at least 5 characters).')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await api.post<ApiResponse>(`/matches/${match.id}/dispute`, { reason })
      if (res.data.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.data.message || 'Failed to file dispute.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to file dispute.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111a2e] border border-rose-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-500/20 bg-rose-500/10">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-lg font-bold text-white">Dispute Match Result</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-300/90 text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
            <span>
              <strong>Dispute Policy:</strong> Filing a dispute immediately halts point awards for all participants.
              An administrator will inspect the score records and decide whether to confirm, correct, or cancel the match.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason for Dispute <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the score discrepancy, incorrect set score, or reason for disputing..."
              className="w-full bg-[#0a0f1d] border border-white/15 focus:border-rose-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || reason.trim().length < 5}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 transition-all shadow-lg shadow-rose-600/20"
            >
              {loading ? 'Filing Dispute...' : 'Confirm Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
