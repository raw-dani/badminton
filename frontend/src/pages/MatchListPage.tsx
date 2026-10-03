import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Swords, PlusCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import type { GameMatch, ApiResponse } from '../types'
import { useAuth } from '../context/AuthContext'
import { MatchCard } from '../components/MatchCard'

export const MatchListPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth()
  const [matches, setMatches] = useState<GameMatch[]>([])
  const [status, setStatus] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [mode, setMode] = useState<string>('')
  const [myMatches, setMyMatches] = useState<boolean>(false)
  const [page, setPage] = useState<number>(1)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchMatches = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (type) params.append('type', type)
    if (mode) params.append('mode', mode)
    if (myMatches) params.append('my_matches', 'true')
    params.append('page', page.toString())
    params.append('per_page', '12')

    api.get<ApiResponse<{ data: GameMatch[]; current_page: number; last_page: number; total: number }>>(
      `/matches?${params.toString()}`
    )
      .then((res) => {
        if (res.data.success && res.data.data) {
          // Laravel pagination returns data directly in data array or data.data
          const items = Array.isArray(res.data.data) ? res.data.data : (res.data.data as any).data || []
          setMatches(items)
          setMeta(res.data.data)
        }
      })
      .catch((err) => console.error('Failed to load matches:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMatches()
  }, [status, type, mode, myMatches, page])

  const handleAccept = async (matchId: number) => {
    try {
      await api.post(`/matches/${matchId}/accept`)
      fetchMatches()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept invitation.')
    }
  }

  const handleReject = async (matchId: number) => {
    try {
      await api.post(`/matches/${matchId}/reject`)
      fetchMatches()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to decline invitation.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-3xl text-white flex items-center gap-3">
            <Swords className="w-8 h-8 text-brand-400" />
            Badminton Match Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse live matches, pending score approvals, and completed court encounters.
          </p>
        </div>

        {isAuthenticated && (
          <Link
            to="/matches/create"
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Create Match</span>
          </Link>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="bg-[#0a0f1d] text-white border border-white/15 rounded-xl px-3 py-2 text-xs focus:outline-none"
          >
            <option value="">All Match Statuses</option>
            <option value="READY">Ready to Play</option>
            <option value="WAITING_APPROVAL">Waiting Score Approval</option>
            <option value="COMPLETED">Completed</option>
            <option value="DISPUTED">Disputed</option>
            <option value="PENDING_ACCEPTANCE">Pending Invitation</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Type Filter */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(1)
            }}
            className="bg-[#0a0f1d] text-white border border-white/15 rounded-xl px-3 py-2 text-xs focus:outline-none"
          >
            <option value="">All Types (Battle & Ranked)</option>
            <option value="BATTLE">Battle Matches Only</option>
            <option value="RANKED">Ranked Matches Only</option>
          </select>

          {/* Mode Filter */}
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value)
              setPage(1)
            }}
            className="bg-[#0a0f1d] text-white border border-white/15 rounded-xl px-3 py-2 text-xs focus:outline-none"
          >
            <option value="">All Modes</option>
            <option value="SINGLES">Singles (1v1)</option>
            <option value="DOUBLES">Doubles (2v2)</option>
          </select>

          {/* My Matches Toggle */}
          {isAuthenticated && (
            <button
              onClick={() => {
                setMyMatches(!myMatches)
                setPage(1)
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                myMatches
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'bg-[#0a0f1d] text-slate-400 border-white/15 hover:text-white'
              }`}
            >
              My Matches Only
            </button>
          )}

        </div>

        <div className="text-xs text-slate-400">
          Showing {matches.length} matches
        </div>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading matches...</p>
        </div>
      ) : matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              currentUserId={user?.id}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-300">No matches found for your filter criteria.</p>
          <p className="text-xs text-slate-400">Try adjusting your filters or create a new match challenge!</p>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-4">
          <span>Page {meta.current_page} of {meta.last_page}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= meta.last_page}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
