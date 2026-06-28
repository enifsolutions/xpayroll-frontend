#!/usr/bin/env python3
"""
Run on Mac from anywhere:
  python3 deploy_profile_frontend.py
Creates: app/(dashboard)/my-profile/page.tsx
"""

import os

BASE = os.path.expanduser(
    "/Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend"
)
PAGE_DIR = os.path.join(BASE, "app", "(dashboard)", "my-profile")
os.makedirs(PAGE_DIR, exist_ok=True)

PAGE = r"""'use client'

import { useState, useEffect, useRef } from 'react'
import {
  User, Lock, Eye, EyeOff, Camera, Shield,
  Building2, Briefcase, Calendar, MapPin, Phone, Mail, BadgeCheck,
} from 'lucide-react'
import api from '@/lib/axios'
import { showSuccess, showError } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'

interface ProfileData {
  userId: string
  fullName: string
  email: string
  phone?: string
  roleName: string
  systemRole: string
  branchName?: string
  departmentName?: string
  designationName?: string
  joinDate?: string
  profilePicture?: string
  twoFactorEnabled: boolean
}

const TABS = [
  { id: 'personal',  label: 'Personal Information', icon: User },
  { id: 'security',  label: 'Security & Privacy',   icon: Lock },
]

const AVATAR_COLORS = [
  'bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500',
  'bg-purple-500','bg-cyan-500','bg-indigo-500','bg-pink-500',
]

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function MyProfilePage() {
  const user        = useAuthStore((s) => s.user)
  const initialized = useRef(false)

  const [activeTab,   setActiveTab]   = useState('personal')
  const [profile,     setProfile]     = useState<ProfileData | null>(null)
  const [loading,     setLoading]     = useState(true)

  // security tab
  const [currentPwd,  setCurrentPwd]  = useState('')
  const [newPwd,      setNewPwd]      = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdLoading,  setPwdLoading]  = useState(false)
  const [twoFa,       setTwoFa]       = useState(false)

  // avatar upload
  const fileRef   = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      const res = await api.get('/users/profile')
      setProfile(res.data)
      setTwoFa(res.data.twoFactorEnabled ?? false)
    } catch {
      // fallback to JWT store while API is being wired
      if (user) {
        setProfile({
          userId:           user.userId,
          fullName:         user.fullName,
          email:            user.email,
          roleName:         user.roleName  ?? 'User',
          systemRole:       user.systemRole ?? 'User',
          twoFactorEnabled: false,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword() {
    if (!currentPwd)              return showError('Current password is required.')
    if (!newPwd || newPwd.length < 8) return showError('New password must be at least 8 characters.')
    if (newPwd !== confirmPwd)    return showError('Passwords do not match.')
    try {
      setPwdLoading(true)
      await api.post('/users/change-password', {
        currentPassword: currentPwd,
        newPassword:     newPwd,
      })
      showSuccess('Password updated successfully.')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e: any) {
      showError(e?.response?.data?.message ?? 'Failed to update password.')
    } finally {
      setPwdLoading(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return showError('Image must be under 2MB.')
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/users/profile-picture', fd)
      setProfile((p) => p ? { ...p, profilePicture: res.data.url } : p)
      showSuccess('Profile picture updated.')
    } catch {
      showError('Failed to upload picture.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!profile) return null

  const initials = getInitials(profile.fullName)
  const bgColor  = avatarColor(profile.fullName)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your personal details and account security
          </p>
        </div>
      </div>

      {/* Banner card */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-5">

            {/* Avatar */}
            <div className="relative shrink-0">
              {profile.profilePicture ? (
                <img
                  src={`/api/proxy/images/profile/${profile.profilePicture}`}
                  alt={profile.fullName}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow"
                />
              ) : (
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow ring-4 ring-white ${bgColor}`}>
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow hover:bg-primary/90 transition"
                title="Change photo"
              >
                {uploading
                  ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={14} />}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name / role */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{profile.fullName}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="xp-badge xp-badge-info flex items-center gap-1">
                  <BadgeCheck size={11} /> {profile.roleName}
                </span>
                {profile.systemRole === 'SuperAdmin' && (
                  <span className="xp-badge xp-badge-warning">SuperAdmin</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{profile.email}</p>
            </div>

            {/* Quick stats */}
            <div className="hidden md:flex gap-6 text-center">
              {profile.departmentName && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Department</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{profile.departmentName}</p>
                </div>
              )}
              {profile.designationName && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Designation</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{profile.designationName}</p>
                </div>
              )}
              {profile.joinDate && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Joined</p>
                  <p className="font-semibold text-gray-700 mt-0.5">
                    {new Date(profile.joinDate).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ── Personal Information ── */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-body">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <User size={16} className="text-primary" /> Personal Details
              </h4>
              <dl className="space-y-4">
                <InfoRow icon={<User size={14} />}  label="Full Name"     value={profile.fullName} />
                <InfoRow icon={<Mail size={14} />}  label="Email Address" value={profile.email} />
                {profile.phone && (
                  <InfoRow icon={<Phone size={14} />} label="Phone" value={profile.phone} />
                )}
              </dl>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <Briefcase size={16} className="text-primary" /> Employment Details
              </h4>
              <dl className="space-y-4">
                {profile.departmentName && (
                  <InfoRow icon={<Building2 size={14} />} label="Department"  value={profile.departmentName} />
                )}
                {profile.designationName && (
                  <InfoRow icon={<Briefcase size={14} />} label="Designation" value={profile.designationName} />
                )}
                {profile.branchName && (
                  <InfoRow icon={<MapPin size={14} />}    label="Branch"      value={profile.branchName} />
                )}
                {profile.joinDate && (
                  <InfoRow icon={<Calendar size={14} />}  label="Join Date"
                    value={new Date(profile.joinDate).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  />
                )}
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* ── Security & Privacy ── */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Change password */}
          <div className="card">
            <div className="card-body">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
                <Lock size={16} className="text-primary" /> Update Password
              </h4>
              <p className="text-sm text-gray-500 mb-5">
                Use a strong, unique password to keep your account secure.
              </p>
              <div className="space-y-4">
                <PasswordField label="Current Password" value={currentPwd} onChange={setCurrentPwd}
                  show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
                <PasswordField label="New Password"     value={newPwd}     onChange={setNewPwd}
                  show={showNew}     onToggle={() => setShowNew((v) => !v)} />
                <PasswordField label="Confirm New Password" value={confirmPwd} onChange={setConfirmPwd}
                  show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />

                {newPwd && <PasswordStrength password={newPwd} />}

                <button onClick={handleChangePassword} disabled={pwdLoading}
                  className="btn bg-primary text-white hover:bg-primary/90 w-full flex items-center justify-center gap-2 mt-2">
                  {pwdLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Update Password
                </button>
              </div>
            </div>
          </div>

          {/* 2FA */}
          <div className="card">
            <div className="card-body">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
                <Shield size={16} className="text-primary" /> Two-Factor Authentication
              </h4>
              <p className="text-sm text-gray-500 mb-5">
                Add an extra layer of protection beyond just a password.
              </p>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="font-medium text-gray-700 text-sm">Enable 2FA</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {twoFa ? 'Currently active — your account is protected.' : 'Not enabled — your account is less secure.'}
                  </p>
                </div>
                <button onClick={() => setTwoFa((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFa ? 'bg-primary' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${twoFa ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {twoFa ? (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                  <Shield size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700">2FA is active</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Your account requires a second step to sign in.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                  <Shield size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700">2FA not enabled</p>
                    <p className="text-xs text-amber-600 mt-0.5">We recommend enabling 2FA for better account security.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  )
}

/* ─── Shared sub-components ─── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-10 w-full" placeholder="••••••••" />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter',       ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',       ok: /[a-z]/.test(password) },
    { label: 'Number',                 ok: /\d/.test(password) },
    { label: 'Special character',      ok: /[^a-zA-Z0-9]/.test(password) },
  ]
  const score  = checks.filter((c) => c.ok).length
  const colors = ['bg-red-400','bg-red-400','bg-amber-400','bg-amber-400','bg-emerald-500','bg-emerald-600']
  const labels = ['','Weak','Weak','Fair','Good','Strong']

  return (
    <div>
      <div className="flex gap-1 mb-1">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${score >= 4 ? 'text-emerald-600' : score >= 3 ? 'text-amber-500' : 'text-red-500'}`}>
        {labels[score]}
      </p>
      <ul className="mt-2 space-y-1">
        {checks.map((c) => (
          <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.ok ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span>{c.ok ? '✓' : '○'}</span> {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
"""

page_path = os.path.join(PAGE_DIR, "page.tsx")
with open(page_path, "w", encoding="utf-8") as f:
    f.write(PAGE)

print(f"✅ Created: {page_path}")
print()
print("Next steps:")
print("  1. Add 'My Profile' to your sidebar nav items (path: /my-profile, icon: UserCircle)")
print("  2. Add a 'My Profile' link in your header user dropdown")
print("  3. Run the backend deploy_backend.ps1 on Windows")
