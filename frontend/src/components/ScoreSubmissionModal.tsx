import React, { useState } from 'react'
import { X, AlertCircle, CheckCircle2, Trophy, Camera, Upload, Trash2 } from 'lucide-react'
import api from '../lib/api'
import type { GameMatch, ApiResponse } from '../types'

interface ScoreSubmissionModalProps {
  match: GameMatch
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SetScore {
  set_number: number
  team_a_score: number
  team_b_score: number
}

export const ScoreSubmissionModal: React.FC<ScoreSubmissionModalProps> = ({
  match,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [sets, setSets] = useState<SetScore[]>([
    { set_number: 1, team_a_score: 21, team_b_score: 18 },
    { set_number: 2, team_a_score: 21, team_b_score: 16 },
  ])
  const [hasThirdSet, setHasThirdSet] = useState<boolean>(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(match.match_photo_url || null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // Team player labels
  const teamAPlayers = match.match_players?.filter((p) => p.team === 'TEAM_A') ?? []
  const teamBPlayers = match.match_players?.filter((p) => p.team === 'TEAM_B') ?? []

  const teamANames = teamAPlayers.map((p) => p.user?.name ?? 'Player A').join(' & ')
  const teamBNames = teamBPlayers.map((p) => p.user?.name ?? 'Player B').join(' & ')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        setError('Format file harus berupa gambar (JPG, PNG, atau WebP).')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Ukuran file gambar maksimal 10MB.')
        return
      }
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleScoreChange = (
    setIndex: number,
    team: 'team_a_score' | 'team_b_score',
    value: string
  ) => {
    const num = Math.max(0, Math.min(30, parseInt(value, 10) || 0))
    const updated = [...sets]
    updated[setIndex] = {
      ...updated[setIndex],
      [team]: num,
    }
    setSets(updated)
  }

  const toggleThirdSet = () => {
    if (!hasThirdSet) {
      setSets([
        ...sets,
        { set_number: 3, team_a_score: 21, team_b_score: 19 },
      ])
      setHasThirdSet(true)
    } else {
      setSets(sets.slice(0, 2))
      setHasThirdSet(false)
    }
  }

  // Calculate winner preview
  let teamAWins = 0
  let teamBWins = 0
  sets.forEach((s) => {
    if (s.team_a_score > s.team_b_score) teamAWins++
    else if (s.team_b_score > s.team_a_score) teamBWins++
  })

  let projectedWinner = teamAWins > teamBWins ? 'TEAM_A' : teamBWins > teamAWins ? 'TEAM_B' : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Wajib upload foto bersama untuk para pemain
    if (!photoFile && !photoPreview) {
      setError('Wajib mengunggah 1 foto bersama untuk para pemain setelah pertandingan!')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('sets', JSON.stringify(sets))
      if (photoFile) {
        formData.append('match_photo', photoFile)
      } else if (photoPreview) {
        formData.append('match_photo_url', photoPreview)
      }

      const res = await api.post<ApiResponse>(`/matches/${match.id}/score`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      if (res.data.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.data.message || 'Failed to submit score')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit score')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111a2e] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1424]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Submit Match Score
            </h3>
            <p className="text-xs text-slate-400">Match #{match.match_code} • {match.mode}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reset Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-amber-300/90 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
            <span>
              <strong>Unanimous Approval Policy:</strong> Submitting a score creates version {match.current_score_version + 1}.
              All previous approvals will be reset, and all match participants must approve this version before points are awarded.
            </span>
          </div>

          {/* Sets Input */}
          <div className="space-y-4">
            {sets.map((set, idx) => (
              <div key={set.set_number} className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Set {set.set_number}</span>
                  <span className="text-[11px] text-slate-400">Standard 21 pts (max 30)</span>
                </div>

                <div className="grid grid-cols-5 items-center gap-3">
                  <div className="col-span-2 text-right">
                    <label className="block text-xs font-semibold text-slate-300 truncate mb-1">
                      {teamANames}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={set.team_a_score}
                      onChange={(e) => handleScoreChange(idx, 'team_a_score', e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-lg px-3 py-2 text-center text-lg font-bold text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="col-span-1 text-center font-bold text-slate-400 text-lg">
                    :
                  </div>

                  <div className="col-span-2 text-left">
                    <label className="block text-xs font-semibold text-slate-300 truncate mb-1">
                      {teamBNames}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={set.team_b_score}
                      onChange={(e) => handleScoreChange(idx, 'team_b_score', e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-lg px-3 py-2 text-center text-lg font-bold text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Toggle 3rd Set Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleThirdSet}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 underline"
              >
                {hasThirdSet ? 'Remove 3rd Set' : '+ Add Deciding 3rd Set'}
              </button>
            </div>
          </div>

          {/* Mandatory Match Photo Upload */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-400" />
                Foto Bersama Pemain <span className="text-rose-400">*Wajib</span>
              </label>
              <span className="text-[11px] text-slate-400">JPG, PNG, WebP (maks. 10MB)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Wajib mengunggah 1 foto bersama seluruh pemain di lapangan sebagai verifikasi pertandingan.
            </p>

            {photoPreview ? (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-white/15 bg-black/40 group max-h-52 flex items-center justify-center">
                <img
                  src={photoPreview}
                  alt="Foto Bersama Pemain"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Ganti Foto
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ) : (
              <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-white/20 hover:border-brand-500/60 rounded-xl p-5 cursor-pointer bg-[#0a0f1d] hover:bg-brand-500/[0.03] transition-all group">
                <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-brand-400 transition-colors">
                  Klik untuk Unggah Foto Bersama Pemain
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Ambil foto bersama semua pemain di lapangan pertandingan
                </span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            )}
          </div>

          {/* Winner Prediction Banner */}
          {projectedWinner ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
              <span className="text-slate-300">Projected Winning Team:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {projectedWinner === 'TEAM_A' ? teamANames : teamBNames} ({teamAWins} - {teamBWins})
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5 text-xs text-slate-400 text-center">
              Sets are tied or incomplete. Enter scores such that one team wins the match.
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !projectedWinner}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              {loading ? 'Submitting...' : 'Submit Score for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
