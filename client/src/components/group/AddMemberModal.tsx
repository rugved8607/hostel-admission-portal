'use client'

import { useState, useCallback } from 'react'
import {
  X, Search, AlertCircle, CheckCircle2,
  UserPlus, Loader2, ShieldCheck, Users,
  GraduationCap, Hash, Building2,
} from 'lucide-react'
import { useMockData } from '@/context/MockDataContext'
import type { Group, Student } from '@/lib/types'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
}

type SearchPhase = 'idle' | 'searching' | 'found' | 'error'

interface SearchResult {
  student: Student | null
  errorTitle: string | null
  errorDetail: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase()
}

function rolNorm(r: string): string {
  return r.trim().toUpperCase()
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AddMemberModal({ isOpen, onClose, group }: AddMemberModalProps) {
  const { students, groups, joinGroup } = useMockData()

  const [rollInput, setRollInput]   = useState('')
  const [phase, setPhase]           = useState<SearchPhase>('idle')
  const [result, setResult]         = useState<SearchResult>({ student: null, errorTitle: null, errorDetail: null })
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [adding, setAdding]         = useState(false)

  // ── Eligibility check ─────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const roll = rolNorm(rollInput)
    if (!roll) return

    setPhase('searching')
    setResult({ student: null, errorTitle: null, errorDetail: null })
    setAddSuccess(null)

    // Simulate lookup latency
    await new Promise((r) => setTimeout(r, 450))

    // 1. Student must exist
    const student = students.find((s) => rolNorm(s.rollNo) === roll)
    if (!student) {
      setResult({
        student: null,
        errorTitle: 'Student Not Found',
        errorDetail: `No student with Roll Number "${roll}" exists in the system. Verify the number and try again.`,
      })
      setPhase('error')
      return
    }

    // 2. Must not be the current user's own roll (can't add yourself)
    // (This won't normally happen if the head is already in the group,
    //  but check anyway)
    if (group.members.some((m) => m.studentId === student.id)) {
      setResult({
        student,
        errorTitle: 'Already a Member',
        errorDetail: `${student.name} is already a member of this group.`,
      })
      setPhase('error')
      return
    }

    // 3. Phase 1 application must be admin-approved
    if (student.status !== 'approved') {
      const statusDisplay = student.status.replace(/_/g, ' ')
      setResult({
        student,
        errorTitle: 'Application Not Approved',
        errorDetail: `${student.name}'s hostel application is currently "${statusDisplay}". Only students whose Phase 1 application has been approved by an admin are eligible to form or join groups.`,
      })
      setPhase('error')
      return
    }

    // 4. Must not already be in another group
    const otherGroup = groups.find(
      (g) => g.id !== group.id && g.members.some((m) => m.studentId === student.id)
    )
    if (otherGroup) {
      setResult({
        student,
        errorTitle: 'Already in Another Group',
        errorDetail: `${student.name} is currently a member of Group ${otherGroup.inviteCode}. A student cannot belong to two groups simultaneously. They must leave their current group first.`,
      })
      setPhase('error')
      return
    }

    // 5. Group must not be full
    if (group.members.length >= group.maxSize) {
      setResult({
        student,
        errorTitle: 'Group is Full',
        errorDetail: `This group already has ${group.maxSize} members (the maximum). No additional members can be added.`,
      })
      setPhase('error')
      return
    }

    // All checks passed
    setResult({ student, errorTitle: null, errorDetail: null })
    setPhase('found')
  }, [rollInput, students, groups, group])

  // ── Add action ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!result.student) return
    setAdding(true)
    await new Promise((r) => setTimeout(r, 600))

    const res = joinGroup(group.inviteCode, result.student.id)
    setAdding(false)

    if (res.success) {
      setAddSuccess(`${result.student.name} has been added to the group.`)
      setPhase('idle')
      setResult({ student: null, errorTitle: null, errorDetail: null })
      setRollInput('')
    } else {
      setResult((prev) => ({
        ...prev,
        errorTitle: 'Add Failed',
        errorDetail: res.error ?? 'Could not add the member. Please try again.',
      }))
      setPhase('error')
    }
  }

  // ── Reset and close ───────────────────────────────────────────────────────

  const handleClose = () => {
    setRollInput('')
    setPhase('idle')
    setResult({ student: null, errorTitle: null, errorDetail: null })
    setAddSuccess(null)
    setAdding(false)
    onClose()
  }

  if (!isOpen) return null

  const spotsLeft = group.maxSize - group.members.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 id="add-member-title" className="text-sm font-bold text-slate-800">
              Add Group Member
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search by Roll Number &middot;&nbsp;
              <span className={spotsLeft === 0 ? 'text-red-500 font-semibold' : 'text-slate-500'}>
                {group.members.length}/{group.maxSize} members &middot; {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="p-5 space-y-4">

          {/* Success strip */}
          {addSuccess && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
              <p className="text-xs font-medium text-emerald-800">{addSuccess}</p>
            </div>
          )}

          {/* Roll number search row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={rollInput}
                onChange={(e) => {
                  setRollInput(e.target.value.toUpperCase())
                  if (phase !== 'idle') setPhase('idle')
                  setAddSuccess(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !adding && phase !== 'searching') handleSearch()
                }}
                placeholder="Roll Number — e.g. 22103A0001"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:text-slate-400 placeholder:font-sans placeholder:text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={phase === 'searching' || !rollInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {phase === 'searching' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              {phase === 'searching' ? 'Searching' : 'Search'}
            </button>
          </div>

          {/* ── Error state ──────────────────────────────────────────────── */}
          {phase === 'error' && result.errorTitle && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs font-bold text-red-700">{result.errorTitle}</p>
              </div>
              <p className="text-xs text-red-600 leading-relaxed pl-5">{result.errorDetail}</p>

              {/* Show partial student info if found but ineligible */}
              {result.student && (
                <div className="mt-2 pl-5 flex items-center gap-3 pt-2 border-t border-red-100">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-500 flex-shrink-0">
                    {getInitials(result.student.name)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-700">{result.student.name}</p>
                    <p className="text-[10px] font-mono text-red-400">{result.student.rollNo}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Found & eligible student preview ─────────────────────────── */}
          {phase === 'found' && result.student && (
            <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl overflow-hidden">
              {/* Eligibility banner */}
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 border-b border-emerald-200">
                <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-emerald-800">
                  Eligible — Application approved, not in any other group.
                </p>
              </div>

              {/* Student card */}
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {getInitials(result.student.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{result.student.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                      <Hash size={10} className="text-slate-400" />
                      {result.student.rollNo}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <GraduationCap size={10} className="text-slate-400" />
                      {result.student.branch}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Building2 size={10} className="text-slate-400" />
                      Year {result.student.year}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CGPA</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums leading-tight">
                    {result.student.cgpa.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Add button */}
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60"
                >
                  {adding ? (
                    <><Loader2 size={14} className="animate-spin" />Adding to Group…</>
                  ) : (
                    <><UserPlus size={14} />Add {result.student.name.split(' ')[0]} to Group</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Idle — eligibility rules ──────────────────────────────────── */}
          {phase === 'idle' && !addSuccess && (
            <div className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Member Eligibility Criteria
              </p>
              {[
                {
                  icon: ShieldCheck,
                  text: 'Phase 1 application must be reviewed and approved by an admin.',
                },
                {
                  icon: Users,
                  text: 'Student must not be a member of any other active group.',
                },
                {
                  icon: GraduationCap,
                  text: 'CGPA shown is the admin-verified figure from submitted documents.',
                },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Icon size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}