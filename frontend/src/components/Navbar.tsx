import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import api from '../lib/api'
import type { ApiResponse } from '../types'
import { GoldShuttlecock } from './GoldShuttlecock'
import {
  Trophy,
  Flame,
  Swords,
  PlusCircle,
  Bell,
  User as UserIcon,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  History,
  LayoutDashboard,
  Settings,
  Languages,
  Users,
} from 'lucide-react'
import { getInitials, getAssetUrl } from '../lib/utils'

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout, refreshUser } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false)

  // Fetch unread notifications counter and refresh user points on route change
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser()
      api.get<ApiResponse<{ unread_count: number }>>('/notifications')
        .then((res) => {
          if (res.data?.data?.unread_count !== undefined) {
            setUnreadCount(res.data.data.unread_count)
          }
        })
        .catch(() => {})
    }
  }, [isAuthenticated, location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const toggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand with Provided PNG Trophy Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-500/10 border border-amber-400/30 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform p-1">
              <img src="/logo.png" alt="Badminton Champion League Logo" className="w-8 h-8 object-contain drop-shadow" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-display font-black text-base tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent leading-none">
                BADMINTON<span className="text-brand-400">CL</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-400/80 mt-0.5">
                Champion League
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links - Compact & Streamlined */}
          <nav className="hidden md:flex items-center gap-1 xl:gap-1.5">
            <Link
              to="/leaderboards/battle"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive('/leaderboards/battle')
                  ? 'bg-battle-500/20 text-battle-300 border border-battle-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-battle-400" />
              <span>{t('nav.battleLadder')}</span>
            </Link>

            <Link
              to="/leaderboards/rank"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive('/leaderboards/rank')
                  ? 'bg-rank-500/20 text-rank-300 border border-rank-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-rank-400" />
              <span>{t('nav.rankLadder')}</span>
            </Link>

            <Link
              to="/matches"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive('/matches')
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('nav.matches')}</span>
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive('/dashboard')
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-brand-400" />
                  <span>{t('nav.dashboard')}</span>
                </Link>

                <Link
                  to="/teams"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive('/teams')
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-brand-400" />
                  <span>{t('nav.teams', 'Team')}</span>
                </Link>

                <Link
                  to="/matches/create"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-brand-500 to-emerald-600 text-slate-950 hover:from-brand-400 hover:to-emerald-500 shadow-md shadow-brand-500/20 transition-all ml-1"
                >
                  <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('nav.createMatch')}</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Section: Language Switcher, Notifications & Profile or Login */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Language Switcher Button - ID for Indonesian, EN for English */}
            <button
              onClick={toggleLanguage}
              title={language === 'id' ? 'Bahasa Indonesia (Klik untuk ganti ke EN)' : 'English (Click to switch to ID)'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black tracking-wider transition-all hover:scale-105 shrink-0"
            >
              <span className="text-xs">{language === 'id' ? '🇮🇩' : '🇬🇧'}</span>
              <span className={language === 'id' ? 'text-amber-400 font-black' : 'text-brand-400 font-black'}>
                {language === 'id' ? 'ID' : 'EN'}
              </span>
            </button>
            {isAuthenticated && user ? (
              <>
                {/* Notification Bell */}
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-[#0a0f1d]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Point Pill Preview - Directly Clickable to Separate Histories */}
                <div className="flex items-center rounded-xl bg-slate-900/90 border border-white/10 p-0.5 text-xs font-bold divide-x divide-white/10 shrink-0">
                  <Link
                    to="/points/ledger?type=BATTLE"
                    title="Lihat riwayat mutasi Battle Points"
                    className="flex items-center gap-1 px-2 py-1 text-battle-300 hover:text-battle-200 hover:bg-battle-500/15 rounded-lg transition-colors"
                  >
                    <Flame className="w-3.5 h-3.5 text-battle-400" />
                    <span>{user.point_balance?.battle_points ?? 0}</span>
                    <span className="text-[10px] text-slate-400 font-normal">BP</span>
                  </Link>
                  <Link
                    to="/points/ledger?type=RANK"
                    title="Lihat riwayat mutasi Rank Points"
                    className="flex items-center gap-1 px-2 py-1 text-rank-300 hover:text-rank-200 hover:bg-rank-500/15 rounded-lg transition-colors"
                  >
                    <Trophy className="w-3.5 h-3.5 text-rank-400" />
                    <span className={(user.point_balance?.rank_points ?? 0) < 0 ? 'text-rose-400' : ''}>
                      {user.point_balance?.rank_points ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">RP</span>
                  </Link>
                </div>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-1.5 p-1 pl-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-300 font-bold flex items-center justify-center text-xs border border-brand-500/30 overflow-hidden">
                      {user.profile?.avatar_url ? (
                        <img src={getAssetUrl(user.profile.avatar_url)} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 pr-1 max-w-[90px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                  </button>

                  {isUserDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-xl bg-[#111a2e] border border-white/15 shadow-2xl py-1.5 z-50 backdrop-blur-xl"
                      onMouseLeave={() => setIsUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-white truncate">@{user.username}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          {user.role}
                        </span>
                      </div>

                      <Link
                        to={`/players/${user.username}`}
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        {t('nav.profile')}
                      </Link>

                      <Link
                        to="/teams"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <Users className="w-4 h-4 text-brand-400" />
                        {t('nav.myTeam', 'Team & Chat')}
                      </Link>

                      <Link
                        to="/profile/edit"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        {t('nav.settings')}
                      </Link>

                      <Link
                        to="/points/ledger?type=BATTLE"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-battle-300 hover:text-battle-200 hover:bg-battle-500/10"
                      >
                        <Flame className="w-4 h-4 text-battle-400" />
                        {t('nav.battleHistory', 'Riwayat Battle Points')}
                      </Link>

                      <Link
                        to="/points/ledger?type=RANK"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-rank-300 hover:text-rank-200 hover:bg-rank-500/10"
                      >
                        <Trophy className="w-4 h-4 text-rank-400" />
                        {t('nav.rankHistory', 'Riwayat Rank Points')}
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 border-t border-white/10"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          {t('nav.admin')}
                        </Link>
                      )}

                      <div className="border-t border-white/10 mt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-md shadow-brand-500/20 transition-all"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleLanguage}
              title={language === 'id' ? 'Bahasa Indonesia (Ganti ke EN)' : 'English (Switch to ID)'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-black text-slate-200"
            >
              <span>{language === 'id' ? '🇮🇩' : '🇬🇧'}</span>
              <span className={language === 'id' ? 'text-amber-400' : 'text-brand-400'}>
                {language === 'id' ? 'ID' : 'EN'}
              </span>
            </button>
            {isAuthenticated && (
              <Link to="/notifications" className="relative p-2 text-slate-300">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#0d1426] border-b border-white/15 px-4 pt-2 pb-6 space-y-2">
          <Link
            to="/leaderboards/battle"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            <Flame className="w-4 h-4 text-battle-400" />
            {t('nav.battleLadder')}
          </Link>
          <Link
            to="/leaderboards/rank"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            <Trophy className="w-4 h-4 text-rank-400" />
            {t('nav.rankLadder')}
          </Link>
          <Link
            to="/matches"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            <Swords className="w-4 h-4 text-slate-400" />
            {t('nav.matches')}
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-300 bg-brand-500/10 border border-brand-500/20"
              >
                <LayoutDashboard className="w-4 h-4 text-brand-400" />
                {t('nav.dashboard')}
              </Link>
              <Link
                to="/teams"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-300 bg-brand-500/10 border border-brand-500/20"
              >
                <Users className="w-4 h-4 text-brand-400" />
                {t('nav.teams', 'Team & Chat')}
              </Link>
              <Link
                to="/matches/create"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-brand-400"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                {t('nav.createMatch')}
              </Link>
              <Link
                to={`/players/${user?.username}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300"
              >
                <UserIcon className="w-4 h-4" />
                {t('nav.profile')}
              </Link>
              <Link
                to="/profile/edit"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300"
              >
                <Settings className="w-4 h-4" />
                {t('nav.settings')}
              </Link>
              <Link
                to="/points/ledger?type=BATTLE"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-battle-300 hover:bg-battle-500/10"
              >
                <Flame className="w-4 h-4 text-battle-400" />
                {t('nav.battleHistory', 'Riwayat Battle Points')}
              </Link>
              <Link
                to="/points/ledger?type=RANK"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rank-300 hover:bg-rank-500/10"
              >
                <Trophy className="w-4 h-4 text-rank-400" />
                {t('nav.rankHistory', 'Riwayat Rank Points')}
              </Link>
              <Link
                to="/points/ledger?type=ALL"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5"
              >
                <History className="w-4 h-4 text-slate-400" />
                {t('ledger.tabAll', 'Semua Mutasi Poin')}
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-300 bg-amber-500/10"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {t('nav.admin')}
                </Link>
              )}
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="w-4 h-4" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg text-sm font-semibold bg-white/5 text-white"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-slate-950"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
