import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react'
import { GoldShuttlecock } from '../components/GoldShuttlecock'
import { useAuth } from '../context/AuthContext'

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [loginId, setLoginId] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(loginId, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid login credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Quick 1-click Demo credentials
  const fillDemoPlayer = () => {
    setLoginId('demoplayer')
    setPassword('password123')
  }

  const fillAdmin = () => {
    setLoginId('admin')
    setPassword('password123')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header with Gold Shuttlecock */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/10 border border-amber-400/30 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10 p-2">
            <GoldShuttlecock className="w-9 h-9" />
          </div>
          <h2 className="font-display font-black text-2xl text-white">
            Welcome to the League
          </h2>
          <p className="text-xs text-slate-400">
            Sign in with your email or username to access your dashboard.
          </p>
        </div>

        {/* Quick Demo Login Helpers */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quick 1-Click Demo Logins
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillDemoPlayer}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 transition-all text-left truncate"
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              Demo Player
            </button>
            <button
              type="button"
              onClick={fillAdmin}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all text-left truncate"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Admin Arbiter
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. demoplayer or player@bcl.com"
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-brand-400 hover:text-brand-300">
              Register now
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
