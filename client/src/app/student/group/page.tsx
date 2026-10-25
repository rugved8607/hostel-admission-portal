'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, UserPlus, Lock, LockOpen, ArrowRight,
  Copy, Check, AlertTriangle, CheckCircle2,
  Building2, LogOut, Info, Loader2, Key,
  ClipboardList, ShieldCheck, Hash,
} from 'lucide-react'
import { useMockData } from '@/context/MockDataContext'
import GroupMemberCard from '@/components/group/GroupMemberCard'
import AddMemberModal from '@/components/group/AddMemberModal'
import type { Group } from '@/lib/types'

// ─── Shared nav (inline) ─────────────────────────────────────────────────────

function TopNav({ name, onLogout }: { name: string; onLogout: () => void }) {
  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link
          href="/student/dashboard"
          className="flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-blue-700 transition-colors"
        >
          <Building2 size={17} strokeWidth={1.8} className="text-blue-700" />
          VJTI Hostel Portal
        </Link>
        <div className="flex items-center gap-5">
          {[
            { href: '/student/dashboard', label: 'Dashboard' },
            { href: '/student/apply',     label: 'Application' },
            { href: '/student/group',     label: 'Group' },
            { href: '/student/rooms',     label: 'Rooms' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs font-medium text-slate-500 hover:text-blue-700 transition-colors hidden sm:inline"
            >
              {label}
            </Link>
          ))}
          <span className="text-xs text-slate-400 hidden md:inline">{name}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Average CGPA bar ─────────────────────────────────────────────────────────

function AvgCgpaBlock({ avg, count, max }: { avg: number; count: number; max: number }) {
  const pct = (avg / 10) * 100
  const color =
    avg >= 9.0 ? 'bg-emerald-500' :
    avg >= 8.0 ? 'bg-blue-500' :
    avg >= 7.0 ? 'bg-slate-500' :
    'bg-orange-400'

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Average Group CGPA
          </p>
          <p className="text-4xl font-bold text-slate-800 tabular-nums mt-1">
            {avg.toFixed(2)}
            <span className="text-sm font-medium text-slate-400 ml-1">/ 10.00</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">
            <span className="font-bold text-slate-700 text-lg">{count}</span> / {max} members
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {count < 3 ? `Need ${3 - count} more` :
             count === max ? 'Full — can lock' :
             `Can add ${max - count} more`}
          </p>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        Calculated from admin-verified CGPA of each member. Used for allocation priority.
      </p>
    </div>
  )
}

// ─── Invite code card ─────────────────────────────────────────────────────────

function InviteCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key size={15} className="text-slate-500" />
          <p className="text-xs font-bold text-slate-700">Group Invite Code</p>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          Share with members
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex-1 font-mono text-2xl font-bold tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-5 py-3 rounded-lg select-all text-center">
          {code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors flex-shrink-0 ${
            copied
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Members can enter this code on their Group page to join.
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentGroupPage() {
  const router = useRouter()
  const {
    session, students, groups, currentStudent, isHydrated,
    createGroup, joinGroup, leaveGroup, lockGroup,
    logout, groupsPublished,
  } = useMockData()

  // Auth guard
  useEffect(() => {
    if (isHydrated && session?.role !== 'student') {
      router.replace('/login')
    }
  }, [isHydrated, session, router])

  // ── Check student eligibility ─────────────────────────────────────────────

  const student = students.find((s) => s.id === session?.userId) ?? currentStudent ?? students[0] ?? null
  const currentUserId = session?.userId ?? student?.id ?? null
  const isApproved = student?.status === 'approved'

  // ── Derive current group ───────────────────────────────────────────────────

  const myGroup: Group | null =
    groups.find((g) => g.members.some((m) => m.studentId === currentUserId)) ?? null

  const isGroupHead = myGroup?.headStudentId === currentUserId
  const isLocked = myGroup?.status === 'locked'

  // ── No-group UI state ─────────────────────────────────────────────────────

  const [noGroupTab, setNoGroupTab] = useState<'create' | 'join'>('create')
  const [selectedSize, setSelectedSize] = useState<3 | 4>(3)
  const [creating, setCreating]         = useState(false)
  const [createError, setCreateError]   = useState<string | null>(null)
  const [joinCode, setJoinCode]         = useState('')
  const [joining, setJoining]           = useState(false)
  const [joinError, setJoinError]       = useState<string | null>(null)

  // ── Has-group UI state ────────────────────────────────────────────────────

  const [addModalOpen, setAddModalOpen]   = useState(false)
  const [lockConfirm, setLockConfirm]     = useState(false)
  const [locking, setLocking]             = useState(false)
  const [lockError, setLockError]         = useState<string | null>(null)
  const [removeError, setRemoveError]     = useState<string | null>(null)

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!currentUserId) return
    setCreating(true)
    setCreateError(null)
    await new Promise((r) => setTimeout(r, 700))
    const res = createGroup(currentUserId, selectedSize)
    setCreating(false)
    if (!res.success) setCreateError(res.error ?? 'Could not create group.')
  }, [currentUserId, selectedSize, createGroup])

  const handleJoin = useCallback(async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code || !currentUserId) return
    setJoining(true)
    setJoinError(null)
    await new Promise((r) => setTimeout(r, 700))
    const res = joinGroup(code, currentUserId)
    setJoining(false)
    if (!res.success) setJoinError(res.error ?? 'Could not join group.')
  }, [joinCode, currentUserId, joinGroup])

  const handleRemoveMember = useCallback(
    async (studentId: string) => {
      setRemoveError(null)
      const res = leaveGroup(studentId)
      if (!res.success) setRemoveError(res.error ?? 'Could not remove member.')
    },
    [leaveGroup]
  )

  const handleLeaveGroup = useCallback(async () => {
    if (!currentUserId) return
    const res = leaveGroup(currentUserId)
    if (!res.success) setRemoveError(res.error ?? 'Could not leave group.')
  }, [currentUserId, leaveGroup])

  const handleLock = useCallback(async () => {
    if (!myGroup) return
    setLocking(true)
    setLockError(null)
    await new Promise((r) => setTimeout(r, 700))
    const res = lockGroup(myGroup.id)
    setLocking(false)
    setLockConfirm(false)
    if (!res.success) setLockError(res.error ?? 'Could not lock group.')
  }, [myGroup, lockGroup])

  // ─────────────────────────────────────────────────────────────────────────

  if (!isHydrated || session?.role !== 'student') return null

  const handleLogout = () => { logout(); router.replace('/') }

  // ══ RENDER ════════════════════════════════════════════════════════════════

  return (
    <>
      {/* Add member modal (only when group exists and open) */}
      {myGroup && (
        <AddMemberModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          group={myGroup}
        />
      )}

      <div className="min-h-screen bg-slate-50 flex flex-col">
        <TopNav name={student?.name ?? ''} onLogout={handleLogout} />

        <main className="flex-1 py-8 px-4">
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Page header */}
            <div>
              <h1 className="text-lg font-bold text-slate-800">Group Formation</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Form a group of 3–4 approved students. The group&apos;s average CGPA determines allocation priority.
              </p>
            </div>

            {/* Eligibility gate */}
            {!isApproved && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Application Not Yet Approved</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    You can only form or join a group after an admin approves your Phase 1 hostel
                    application. Current status: <strong>{student?.status.replace(/_/g, ' ') ?? 'unknown'}</strong>.
                  </p>
                  <Link
                    href="/student/status"
                    className="inline-block mt-2 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
                  >
                    Check application status →
                  </Link>
                </div>
              </div>
            )}

            {/* ══ NO GROUP ═══════════════════════════════════════════════════ */}
            {!myGroup && isApproved && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Create Group card */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Create a New Group</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      You become the group leader. Share the generated code with others.
                    </p>
                  </div>
                  <div className="px-5 py-5 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        Maximum group size <span className="text-red-500">*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {([3, 4] as const).map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setSelectedSize(n)}
                            className={`py-3 rounded-lg border text-sm font-bold transition-colors ${
                              selectedSize === n
                                ? 'border-blue-500 bg-blue-700 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300'
                            }`}
                          >
                            {n} Members
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        You can lock the group once it has at least 3 members.
                      </p>
                    </div>

                    {createError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">{createError}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={creating}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {creating ? (
                        <><Loader2 size={14} className="animate-spin" />Creating…</>
                      ) : (
                        <><Users size={14} />Create Group</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Join Group card */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Join an Existing Group</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter the invite code shared by your group leader.
                    </p>
                  </div>
                  <div className="px-5 py-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Invite Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null) }}
                        onKeyDown={(e) => e.key === 'Enter' && !joining && handleJoin()}
                        placeholder="e.g. GRP-7X2K"
                        spellCheck={false}
                        className="w-full px-3 py-2.5 font-mono text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:font-sans placeholder:text-xs placeholder:text-slate-400"
                      />
                    </div>

                    {joinError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">{joinError}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleJoin}
                      disabled={joining || !joinCode.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {joining ? (
                        <><Loader2 size={14} className="animate-spin" />Joining…</>
                      ) : (
                        <><Key size={14} />Join with Code</>
                      )}
                    </button>

                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="flex items-start gap-1.5">
                        <Info size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                          Demo code: <span className="font-mono font-bold">GRP-7X2K</span> — try it to test the join flow.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ HAS GROUP ═══════════════════════════════════════════════════ */}
            {myGroup && (
              <>
                {/* Group header card */}
                <div className={`bg-white border rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap ${
                  isLocked ? 'border-emerald-200 bg-emerald-50/20' : 'border-blue-200 bg-blue-50/20'
                }`}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Group Code</p>
                      <p className="text-xl font-bold font-mono text-blue-700 tracking-widest mt-0.5">
                        {myGroup.inviteCode}
                      </p>
                    </div>
                    <div className="h-10 w-px bg-slate-200 hidden sm:block" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                      <span className={`inline-flex items-center gap-1.5 mt-0.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        isLocked
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : myGroup.status === 'complete'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isLocked ? (
                          <><Lock size={11} />Locked & Final</>
                        ) : myGroup.status === 'complete' ? (
                          <><ShieldCheck size={11} />Ready to Lock</>
                        ) : (
                          <><LockOpen size={11} />Forming ({myGroup.members.length}/{myGroup.maxSize})</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Head actions */}
                  {isGroupHead && !isLocked && (
                    <div className="flex items-center gap-2">
                      {myGroup.members.length < myGroup.maxSize && (
                        <button
                          type="button"
                          onClick={() => setAddModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <UserPlus size={13} />
                          Add Member
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Average CGPA */}
                <AvgCgpaBlock
                  avg={myGroup.averageCgpa}
                  count={myGroup.members.length}
                  max={myGroup.maxSize}
                />

                {/* Members list */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-slate-500" />
                      <p className="text-xs font-bold text-slate-700">
                        Members — {myGroup.members.length} / {myGroup.maxSize}
                      </p>
                    </div>
                    {!isGroupHead && !isLocked && (
                      <button
                        type="button"
                        onClick={handleLeaveGroup}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Leave Group
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {myGroup.members.map((member) => (
                      <GroupMemberCard
                        key={member.studentId}
                        member={member}
                        isCurrentUser={member.studentId === currentUserId}
                        isCurrentUserHead={isGroupHead}
                        isGroupLocked={isLocked}
                        onRemove={isGroupHead && !isLocked ? handleRemoveMember : undefined}
                      />
                    ))}

                    {/* Empty slot indicators */}
                    {!isLocked &&
                      Array.from({ length: myGroup.maxSize - myGroup.members.length }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-slate-200"
                        >
                          <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <UserPlus size={16} className="text-slate-300" />
                          </div>
                          <p className="text-xs text-slate-400 italic">
                            {isGroupHead
                              ? 'Empty slot — click "Add Member" to invite a student.'
                              : 'Waiting for member…'}
                          </p>
                        </div>
                      ))}
                  </div>

                  {removeError && (
                    <div className="mx-4 mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700">{removeError}</p>
                    </div>
                  )}
                </div>

                {/* Invite code (only if not locked and is head) */}
                {!isLocked && isGroupHead && <InviteCodeCard code={myGroup.inviteCode} />}

                {/* ── Lock Group section ─────────────────────────────────── */}
                {!isLocked && isGroupHead && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <Lock size={16} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Lock & Finalise Group</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Locking prevents further changes to membership. The group must have
                          at least 3 members. This action cannot be undone from the student side.
                        </p>
                      </div>
                    </div>

                    {myGroup.members.length < 3 && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                        <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                        <p className="text-xs text-amber-800 font-medium">
                          Minimum 3 members required to lock. Add {3 - myGroup.members.length} more member{3 - myGroup.members.length > 1 ? 's' : ''}.
                        </p>
                      </div>
                    )}

                    {lockError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                        <AlertTriangle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">{lockError}</p>
                      </div>
                    )}

                    {!lockConfirm ? (
                      <button
                        type="button"
                        onClick={() => setLockConfirm(true)}
                        disabled={myGroup.members.length < 3}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Lock size={14} />
                        Lock Group ({myGroup.members.length} members)
                      </button>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-800 font-medium leading-relaxed">
                            Confirm that all {myGroup.members.length} members are finalised. After locking,
                            no member changes are possible. Only an admin can dissolve the group.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleLock}
                            disabled={locking}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
                          >
                            {locking ? <><Loader2 size={13} className="animate-spin" />Locking…</> : 'Confirm Lock'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setLockConfirm(false)}
                            disabled={locking}
                            className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Locked — Phase 3 gateway ───────────────────────────── */}
                {isLocked && (
                  <div className={`border rounded-xl p-5 ${
                    groupsPublished
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        groupsPublished ? 'bg-emerald-100' : 'bg-slate-200'
                      }`}>
                        {groupsPublished
                          ? <CheckCircle2 size={20} className="text-emerald-600" />
                          : <Lock size={20} className="text-slate-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">
                          {groupsPublished ? 'Floor Map Unlocked — Proceed to Room Selection' : 'Group Locked — Awaiting Admin Publish'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          {groupsPublished
                            ? 'The admin has published the approved group list. Your group is eligible for room selection. Proceed to Phase 3.'
                            : 'Your group is finalised. The admin must publish the approved group list before the floor map is unlocked for selection.'}
                        </p>
                      </div>
                    </div>

                    {groupsPublished && (
                      <Link
                        href="/student/rooms"
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                      >
                        Proceed to Room Selection
                        <ArrowRight size={15} />
                      </Link>
                    )}
                  </div>
                )}

                {/* Disclaimer */}
                <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <Info size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Group membership, eligibility, and collision detection shown here are illustrative.
                    All rules will be enforced server-side when the backend is connected.
                  </p>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  )
}