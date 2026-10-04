import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Camera, Check, AlertCircle, Save, Globe } from 'lucide-react'
import { InstagramIcon, FacebookIcon, TikTokIcon, YoutubeIcon } from '../components/SocialIcons'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { AffiliateCard } from '../components/AffiliateCard'
import type { ApiResponse } from '../types'
import { getInitials, getAssetUrl } from '../lib/utils'

export const ProfileSettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    gender: 'male',
    bio: '',
    preferred_position: 'all_round',
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
    visibility: 'public',
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        city: user.profile?.city || '',
        gender: user.profile?.gender || 'male',
        bio: user.profile?.bio || '',
        preferred_position: user.profile?.preferred_position || 'all_round',
        instagram: user.profile?.instagram || '',
        facebook: user.profile?.facebook || '',
        tiktok: user.profile?.tiktok || '',
        youtube: user.profile?.youtube || '',
        visibility: user.profile?.visibility || 'public',
      })
      if (user.profile?.avatar_url) {
        setAvatarPreview(user.profile.avatar_url)
      }
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Ukuran file foto maksimal 2MB.')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleAvatarUploadDirect = async (fileToUpload?: File) => {
    const file = fileToUpload || avatarFile
    if (!file) return null

    setUploadingAvatar(true)
    setErrorMsg(null)

    const data = new FormData()
    data.append('avatar', file)

    try {
      const res = await api.post<ApiResponse<{ avatar_url: string }>>('/players/profile/photo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data.success && res.data.data?.avatar_url) {
        setAvatarPreview(res.data.data.avatar_url)
        setAvatarFile(null)
        await refreshUser()
        return res.data.data.avatar_url
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengunggah foto profil.')
    } finally {
      setUploadingAvatar(false)
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      // If user selected an avatar file, upload it first
      if (avatarFile) {
        await handleAvatarUploadDirect(avatarFile)
      }

      const res = await api.put<ApiResponse>('/players/profile', formData)
      if (res.data.success) {
        setSuccessMsg('Profil dan informasi berhasil diperbarui.')
        await refreshUser()
      } else {
        setErrorMsg(res.data.message || 'Gagal memperbarui profil.')
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui profil.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-3xl text-white">
          {t('profile.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {t('profile.subtitle')}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Avatar Card */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          {t('profile.photo')}
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-brand-500/20 text-brand-300 font-extrabold flex items-center justify-center text-3xl border-2 border-brand-500/30 overflow-hidden shadow-xl">
              {avatarPreview ? (
                <img src={getAssetUrl(avatarPreview)} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.name)
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 cursor-pointer shadow-lg transition-transform hover:scale-110">
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
            </label>
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <div className="text-xs text-slate-300">
              {t('profile.photoHint')}
            </div>
            {avatarFile && (
              <button
                type="button"
                onClick={() => handleAvatarUploadDirect()}
                disabled={uploadingAvatar}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-400 text-slate-950 hover:bg-brand-300 transition-colors shadow-md flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                {uploadingAvatar ? 'Mengunggah...' : t('profile.savePhoto')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details Form Card */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('profile.fullName')}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('profile.phone')}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+62 812..."
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('profile.city')}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Contoh: Surabaya, Jakarta, Medan"
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('profile.gender')}
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="male">Laki-Laki (Male)</option>
                <option value="female">Perempuan (Female)</option>
                <option value="other">Lainnya (Other)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('profile.position')}
              </label>
              <select
                name="preferred_position"
                value={formData.preferred_position}
                onChange={handleInputChange}
                className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="singles">Spesialis Tunggal (Singles)</option>
                <option value="doubles_front">Ganda - Depan / Playmaker</option>
                <option value="doubles_back">Ganda - Belakang / Smasher</option>
                <option value="all_round">All-Rounder (Segala Posisi)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('profile.bio')}
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Ceritakan gaya bermain, raket andalan, atau target Anda di liga..."
              className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
            />
          </div>

          {/* Social Media Links Section (Item #6) */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-400" />
                {t('profile.socialMedia')}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('profile.socialHint')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                  {t('profile.instagram')}
                </label>
                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  placeholder="@username atau https://instagram.com/..."
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FacebookIcon className="w-3.5 h-3.5 text-blue-400" />
                  {t('profile.facebook')}
                </label>
                <input
                  type="text"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleInputChange}
                  placeholder="https://facebook.com/..."
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <TikTokIcon className="w-3.5 h-3.5 text-cyan-400" />
                  {t('profile.tiktok')}
                </label>
                <input
                  type="text"
                  name="tiktok"
                  value={formData.tiktok}
                  onChange={handleInputChange}
                  placeholder="@username atau https://tiktok.com/@..."
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <YoutubeIcon className="w-3.5 h-3.5 text-red-400" />
                  {t('profile.youtube')}
                </label>
                <input
                  type="text"
                  name="youtube"
                  value={formData.youtube}
                  onChange={handleInputChange}
                  placeholder="https://youtube.com/@..."
                  className="w-full bg-[#0a0f1d] border border-white/15 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('profile.visibility')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, visibility: 'public' })}
                className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                  formData.visibility === 'public'
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                    : 'bg-[#0a0f1d] border-white/10 text-slate-400'
                }`}
              >
                {t('profile.public')}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, visibility: 'private' })}
                className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                  formData.visibility === 'private'
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'bg-[#0a0f1d] border-white/10 text-slate-400'
                }`}
              >
                {t('profile.private')}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || uploadingAvatar}
            className="w-full py-3.5 rounded-xl text-sm font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 transition-all shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            {loading || uploadingAvatar ? 'Menyimpan Perubahan...' : t('profile.saveAll')}
          </button>
        </form>
      </div>

      {/* Player Affiliate Program Section */}
      <AffiliateCard />

    </div>
  )
}
