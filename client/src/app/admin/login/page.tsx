'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useMockData } from '@/context/MockDataContext'

export default function AdminLoginPage() {
  const router = useRouter()
  const { loginAsAdmin } = useMockData()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const result = await loginAsAdmin(email, password)
    setLoading(false)
    if (result.success) router.replace('/admin/verification')
    else setError(result.error ?? 'Login failed.')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2 text-slate-800">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-base font-bold">Admin Sign In</h1>
        </div>
        <p className="mb-5 text-xs text-slate-500">Restricted to authorised hostel staff only.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Admin Email Address</label>
            <input translate="no" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Password</label>
            <div className="relative">
              <input translate="no" type={showPassword ? 'text' : 'password'} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm" />
              <button translate="no" type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </div>
          {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={15} /><span>{error}</span></div>}
          <button translate="no" type="submit" disabled={loading} className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-bold text-white disabled:opacity-60"><span>{loading ? 'Signing in...' : 'Sign In to Admin Panel'}</span></button>
        </form>
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="mb-1 font-semibold">Demo Credentials</p>
          <p className="font-mono leading-5">Email: admin@hostel-demo.edu<br />Password: HostelDemo2026!</p>
        </div>
      </section>
    </main>
  )
}