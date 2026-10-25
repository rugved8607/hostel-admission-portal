'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useMockData } from '@/context/MockDataContext' 

type PortalMode = 'student' | 'admin'

export default function LoginPage() {
  const router = useRouter()
  const { loginAsStudent, loginAsAdmin } = useMockData()

  const [mode, setMode]           = useState<PortalMode>('student')
  const [identifier, setIdentifier] = useState('')   // email or roll number
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  function handleModeSwitch(m: PortalMode) {
    setMode(m)
    setError('')
    setIdentifier('')
    setPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!identifier.trim() || !password.trim()) {
      setError('All fields are required.')
      return
    }

    setLoading(true)
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 600))

    const result =
      mode === 'student'
        ? loginAsStudent(identifier.trim(), password)
        : loginAsAdmin(identifier.trim(), password)

    setLoading(false)

    if (result.success) {
      router.push(mode === 'student' ? '/student/apply' : '/admin/verification')
    } else {
      setError(result.error ?? 'Login failed.')
    }
  }

  const isStudent = mode === 'student'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">

      {/* Institution Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Building2 className="text-blue-700" size={28} strokeWidth={1.8} />
          <span className="text-xl font-bold tracking-tight text-slate-800">
            VJTI Hostel Management System
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Veermata Jijabai Technological Institute, Mumbai
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

        {/* Portal toggle tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => handleModeSwitch('student')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              isStudent
                ? 'bg-blue-700 text-white'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Student Portal
          </button>
          <button
            onClick={() => handleModeSwitch('admin')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-l border-slate-200 ${
              !isStudent
                ? 'bg-slate-800 text-white'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} />
              Warden / Admin
            </span>
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <h2 className="text-base font-bold text-slate-800 mb-1">
            {isStudent ? 'Student Sign In' : 'Admin Sign In'}
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            {isStudent
              ? 'Use your institute email address or roll number.'
              : 'Restricted to authorised hostel staff only.'}
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Identifier */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {isStudent ? 'Email Address or Roll Number' : 'Admin Email Address'}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={isStudent ? 'e.g. aarav.sharma@college.edu or 21BCE1042' : 'e.g. admin@vjti.ac.in'}
                autoComplete="username"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Password
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors ${
                isStudent
                  ? 'bg-blue-700 hover:bg-blue-800 text-white'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : isStudent ? (
                'Sign In to Student Portal'
              ) : (
                'Sign In to Admin Panel'
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              Demo Credentials
            </p>
            {isStudent ? (
              <p className="text-xs text-amber-700 font-mono leading-5">
                Email: aarav.sharma@college.edu<br />
                Roll#: 21BCE1042<br />
                Password: student123
              </p>
            ) : (
              <p className="text-xs text-amber-700 font-mono leading-5">
                Email: admin@vjti.ac.in<br />
                Password: admin123
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-slate-400">
            This portal uses mock data for demonstration purposes only.
            <br />No real authentication or data storage is performed.
          </p>
        </div>
      </div>

      {/* Institute footer */}
      <p className="mt-6 text-xs text-slate-400">
        Hostel Admission Portal · VJTI Mumbai · A.Y. 2025–26
      </p>
    </div>
  )
}