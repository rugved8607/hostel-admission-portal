'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Building2, LogOut, LayoutDashboard,
  ClipboardList, Users, Home, Target, Filter,
  AlertCircle, ChevronRight,
} from 'lucide-react'
import { useMockData } from '@/context/MockDataContext'
import DocumentReviewDrawer from '@/components/admin/DocumentReviewDrawer'
import type { Application, Student, StudentStatus } from '@/lib/types'

// ─── Filter config ────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected' | 'correction'

const FILTER_TABS: { id: FilterTab; label: string; statuses?: StudentStatus[] }[] = [
  { id: 'all',        label: 'All Applications' },
  { id: 'pending',    label: 'Pending Verification', statuses: ['application_submitted', 'under_review'] },
  { id: 'approved',   label: 'Approved',             statuses: ['approved'] },
  { id: 'correction', label: 'Correction Required',  statuses: ['correction_required'] },
  { id: 'rejected',   label: 'Rejected',             statuses: ['rejected'] },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusStyle(status: StudentStatus): string {
  const map: Partial<Record<StudentStatus, string>> = {
    application_submitted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    under_review:          'bg-blue-50   text-blue-700   border-blue-200',
    approved:              'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:              'bg-red-50    text-red-700    border-red-200',
    correction_required:   'bg-orange-50 text-orange-700 border-orange-200',
    application_draft:     'bg-slate-100 text-slate-500  border-slate-200',
  }
  return map[status] ?? 'bg-slate-100 text-slate-500 border-slate-200'
}

function getStatusLabel(status: StudentStatus): string {
  const map: Record<StudentStatus, string> = {
    draft:                  'Draft',
    submitted:              'Submitted',
    not_applied:            'Not Applied',
    application_draft:      'Draft',
    application_submitted:  'Submitted',
    under_review:           'Under Review',
    approved:               'Approved',
    rejected:               'Rejected',
    correction_required:    'Correction Required',
  }
  return map[status] ?? status
}

function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border rounded-full ${getStatusStyle(status)}`}>
      {getStatusLabel(status)}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-white border rounded-lg px-4 py-3 flex items-center justify-between ${color}`}>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ─── Admin Nav ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/admin/verification', icon: ClipboardList,   label: 'Applications' },
  { href: '/admin/groups',       icon: Users,           label: 'Groups'       },
  { href: '/admin/rooms',        icon: Home,            label: 'Rooms'        },
  { href: '/admin/allocation',   icon: Target,          label: 'Allocation'   },
]

function AdminSidebar({ currentPath, name, onLogout }: {
  currentPath: string; name: string; onLogout: () => void
}) {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-56 bg-white border-r border-slate-200 flex flex-col z-40">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Building2 size={17} className="text-blue-700" strokeWidth={1.8} />
          <span className="text-sm font-bold text-slate-800">VJTI Admin</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">Hostel Management</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = currentPath.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-700 truncate">{name}</p>
        <p className="text-[11px] text-slate-400">Admin</p>
        <button
          onClick={onLogout}
          className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type JoinedRow = Application & { student: Student | undefined }

export default function AdminVerificationPage() {
  const router = useRouter()
  const { session, applications, students, logout, isHydrated, loading, error, refreshData } = useMockData()

  // Auth guard
  useEffect(() => {
    if (isHydrated && session?.role !== 'admin') {
      router.replace('/admin/login')
    }
  }, [isHydrated, session, router])

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Join applications with student records
  const allRows: JoinedRow[] = useMemo(() => {
    return (applications ?? []).map((app) => ({
      ...app,
      student: students.find((s) => s.id === app.studentId),
    }))
  }, [applications, students])

  // Filter and search
  const filteredRows = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.id === activeFilter)
    const byStatus = tab?.statuses
      ? allRows.filter((r) => tab.statuses!.includes(r.status))
      : allRows

    const q = search.trim().toLowerCase()
    if (!q) return byStatus
    return byStatus.filter(
      (r) =>
        r.personal.fullName.toLowerCase().includes(q) ||
        r.personal.rollNumber.toLowerCase().includes(q) ||
        r.personal.branch.toLowerCase().includes(q) ||
        r.student?.rollNo.toLowerCase().includes(q)
    )
  }, [allRows, activeFilter, search])

  // Tab counts
  const counts = useMemo(() => {
    const c: Record<FilterTab, number> = {
      all: allRows.length,
      pending: allRows.filter((r) => r.status === 'application_submitted' || r.status === 'under_review').length,
      approved: allRows.filter((r) => r.status === 'approved').length,
      correction: allRows.filter((r) => r.status === 'correction_required').length,
      rejected: allRows.filter((r) => r.status === 'rejected').length,
    }
    return c
  }, [allRows])

  const openDrawer = (appId: string) => {
    setSelectedAppId(appId)
    setDrawerOpen(true)
  }

  if (!isHydrated || session?.role !== 'admin') return null

  return (
    <>
      {drawerOpen && <DocumentReviewDrawer
        key={selectedAppId ?? 'review'}
        applicationId={selectedAppId}
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedAppId(null) }}
      />}

      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar
          currentPath="/admin/verification"
          name="Admin"
          onLogout={() => { logout(); router.replace('/') }}
        />

        {/* Main content */}
        <div className="ml-56 flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 h-12 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Admin</span>
              <ChevronRight size={12} />
              <span className="font-semibold text-slate-800">Application Verification</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle size={12} className="text-amber-600" />
              <span className="text-[11px] text-amber-700 font-medium">
                Database-backed application review
              </span>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-5">

            {/* Page heading */}
            <div>
              <h1 className="text-lg font-bold text-slate-800">Application Verification</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted applications, verify documents, and approve or reject applicants.
              </p>
            </div>
            {error && (
              <div className="flex items-center justify-between rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <span>{error}</span>
                <button type="button" onClick={() => void refreshData()} className="font-semibold underline">Retry</button>
              </div>
            )}
            {loading && <p className="text-xs text-slate-500">Loading applications…</p>}

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Applications" value={counts.all}        color="border-slate-200" />
              <StatCard label="Pending Review"     value={counts.pending}    color="border-yellow-200" />
              <StatCard label="Approved"           value={counts.approved}   color="border-emerald-200" />
              <StatCard label="Rejected"           value={counts.rejected}   color="border-red-200" />
            </div>

            {/* Filter tabs + search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeFilter === tab.id
                        ? 'bg-blue-700 text-white'
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeFilter === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {counts[tab.id]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, roll no., branch…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-xs text-slate-400">
                  Loading applications…
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <Filter size={28} strokeWidth={1.5} />
                  <p className="text-sm font-medium">No applications match the current filter.</p>
                  <p className="text-xs">Try adjusting the filter or search query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-10">#</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Roll Number</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Yr</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">CGPA</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Submitted</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, idx) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40 transition-colors group"
                        >
                          <td className="px-4 py-3 text-slate-400 tabular-nums">{idx + 1}</td>

                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-semibold text-slate-700 tracking-tight">
                              {row.personal.rollNumber}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800">{row.personal.fullName}</span>
                          </td>

                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {row.personal.branch}
                          </td>

                          <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                            {row.personal.year}
                          </td>

                          <td className="px-4 py-3 hidden md:table-cell">
                            <div>
                              <span className="text-slate-700 font-semibold tabular-nums">
                                {row.academic.selfReportedCgpa}
                              </span>
                              <span className="text-slate-300 mx-1">/</span>
                              {row.verifiedCgpa !== null ? (
                                <span className="text-emerald-600 font-bold tabular-nums text-[11px]">
                                  {row.verifiedCgpa} ✓
                                </span>
                              ) : (
                                <span className="text-slate-300 text-[10px]">unverified</span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>

                          <td className="px-4 py-3 text-slate-400 hidden lg:table-cell tabular-nums whitespace-nowrap">
                            {row.submittedAt
                              ? new Date(row.submittedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                })
                              : '—'}
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openDrawer(row.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 whitespace-nowrap"
                            >
                              Review
                              <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  Showing {filteredRows.length} of {allRows.length} application{allRows.length !== 1 ? 's' : ''}
                  {search && ` matching "${search}"`}
                </p>
                <p className="text-[11px] text-slate-300">
                  Pagination — connect to GET /api/applications?page=&limit= when backend is ready
                </p>
              </div>
            </div>

          </main>
        </div>
      </div>
    </>
  )
}