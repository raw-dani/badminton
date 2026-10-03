import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Flame, Shield, Activity } from 'lucide-react'
import { GoldShuttlecock } from './GoldShuttlecock'
import { useLanguage } from '../context/LanguageContext'

export const Footer: React.FC = () => {
  const { t } = useLanguage()

  return (
    <footer className="bg-[#080d19] border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Overview */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-yellow-500/10 border border-amber-400/30 flex items-center justify-center shadow-lg shadow-amber-500/10 p-1">
                <GoldShuttlecock className="w-6 h-6" />
              </div>
              <span className="font-display font-black text-lg tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent">
                BADMINTON<span className="text-brand-400">CL</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Platform manajemen pertandingan dan ranking pemain bulu tangkis kompetitif nomor 1.
              Ikuti Battle Match kasual dan Ranked Match bergengsi dengan persetujuan skor 100% unanimous, buku kas poin transparan, dan leaderboard musiman langsung.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity className="w-3 h-3 animate-pulse" />
                Live Season 1 Active
              </span>
              <span>•</span>
              <span>100% Verifiable Point Ledger</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Competitions
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/leaderboards/battle" className="hover:text-battle-400 flex items-center gap-1.5 transition-colors">
                  <Flame className="w-3.5 h-3.5 text-battle-400" />
                  Battle Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/leaderboards/rank" className="hover:text-rank-400 flex items-center gap-1.5 transition-colors">
                  <Trophy className="w-3.5 h-3.5 text-rank-400" />
                  Rank Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/matches" className="hover:text-white transition-colors">
                  Match Schedule
                </Link>
              </li>
              <li>
                <Link to="/matches/create" className="hover:text-brand-400 transition-colors">
                  Create a Match
                </Link>
              </li>
            </ul>
          </div>

          {/* Rules & Ledger */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Point Rules
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center justify-between border-b border-white/5 pb-1">
                <span>Battle Win</span>
                <span className="font-bold text-emerald-400">+3 BP</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-1">
                <span>Battle Loss</span>
                <span className="font-bold text-emerald-400">+1 BP</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-1">
                <span>Ranked Entry</span>
                <span className="font-bold text-rose-400">-3 BP</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-1">
                <span>Ranked Win</span>
                <span className="font-bold text-amber-400">+3 RP</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Ranked Loss</span>
                <span className="font-bold text-rose-400">-1 RP</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Badminton Champion League. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Sanctum Secured API
            </span>
            <span>MySQL 8.0 ACID Transactions</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
