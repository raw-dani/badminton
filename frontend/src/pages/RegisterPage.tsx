import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, AlertCircle, Gift } from 'lucide-react'
import { GoldShuttlecock } from '../components/GoldShuttlecock'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

export const RegisterPage: React.FC = () => {
  const { register } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refParam = searchParams.get('ref') || ''

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    city: '',
    preferred_position: 'all_round',
    bio: '',
    ref: refParam,
  })

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await register(formData)
      navigate('/dashboard')
    } catch (err: any) {
      const errData = err.response?.data
      if (errData?.errors && typeof errData.errors === 'object') {
        const firstErr = Object.values(errData.errors)[0] as string[]
        setError(firstErr[0] || 'Registration validation failed.')
      } else {
        setError(errData?.message || err.message || 'Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Brand Header with Gold Shuttlecock */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/10 border border-amber-400/30 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10 p-2">
            <GoldShuttlecock className="w-9 h-9" />
          </div>
          <h2 className="font-display font-black text-2xl text-white">
            Create Player Account
          </h2>
          <p className="text-xs text-slate-400">
            Join the Badminton Champion League, earn Battle Points, and compete on the ladder.
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {refParam && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-brand-500/15 to-emerald-500/15 border border-amber-500/30 flex items-center gap-3.5 text-amber-200 text-xs">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-bold text-amber-300">
                    Undangan Afiliasi dari @{refParam}! 🏸
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Daftar akun sekarang dan Anda akan menerima bonus sambutan <span className="text-emerald-400 font-bold">+100 Battle Points gratis</span> setelah menyelesaikan pertandingan pertama Anda!
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name <span className="text-brand-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Lee Chong Wei"
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username <span className="text-brand-400">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. leecw"
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address <span className="text-brand-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="player@example.com"
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+62812..."
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  City / Location
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Jakarta, Kuala Lumpur"
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preferred Playing Style
                </label>
                <select
                  name="preferred_position"
                  value={formData.preferred_position}
                  onChange={handleChange}
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="singles">Singles Specialist</option>
                  <option value="doubles_front">Doubles (Front Net)</option>
                  <option value="doubles_back">Doubles (Rear Attacker)</option>
                  <option value="all_round">All-Rounder</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password <span className="text-brand-400">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password <span className="text-brand-400">*</span>
                </label>
                <input
                  type="password"
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Player Bio (Optional)
              </label>
              <textarea
                name="bio"
                rows={2}
                value={formData.bio}
                onChange={handleChange}
                placeholder="Racket model, playstyle, or club affiliation..."
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                'Creating Account...'
              ) : (
                <>
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Account & Start Playing</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-400 hover:text-brand-300">
              Sign In
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
