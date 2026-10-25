'use client'

import { Crown, X, GraduationCap, Building2, Hash, CalendarDays } from 'lucide-react'
import type { GroupMember } from '@/lib/types'

interface GroupMemberCardProps {
  member: GroupMember
  isCurrentUser?: boolean
  isCurrentUserHead: boolean
  isGroupLocked: boolean
  onRemove?: (studentId: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0] ?? '')
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function cgpaColor(cgpa: number): string {
  if (cgpa >= 9.0) return 'text-emerald-600'
  if (cgpa >= 8.0) return 'text-blue-600'
  if (cgpa >= 7.0) return 'text-slate-700'
  return 'text-orange-500'
}

function cgpaBg(cgpa: number): string {
  if (cgpa >= 9.0) return 'bg-emerald-50 border-emerald-100'
  if (cgpa >= 8.0) return 'bg-blue-50 border-blue-100'
  if (cgpa >= 7.0) return 'bg-slate-50 border-slate-200'
  return 'bg-orange-50 border-orange-100'
}

function formatJoinDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export default function GroupMemberCard({
  member,
  isCurrentUser = false,
  isCurrentUserHead,
  isGroupLocked,
  onRemove,
}: GroupMemberCardProps) {
  // Only the group head can remove non-head members, and only when unlocked
  const canRemove =
    isCurrentUserHead &&
    !isGroupLocked &&
    !member.isHead &&
    typeof onRemove === 'function'

  return (
    <div
      className={`relative flex items-center gap-4 p-4 rounded-xl border transition-colors ${
        member.isHead
          ? 'border-blue-200 bg-blue-50/40'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* ── Avatar ─────────────────────────────────────────── */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold select-none flex-shrink-0 ${
          member.isHead ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
        }`}
        aria-hidden="true"
      >
        {getInitials(member.name)}
      </div>

      {/* ── Identity ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-800 leading-tight">
            {member.name}
          </span>

          {member.isHead && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-white bg-blue-700 rounded-full">
              <Crown size={9} />
              Group Leader
            </span>
          )}

          {isCurrentUser && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full">
              You
            </span>
          )}
        </div>

        {/* Detail pills */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-slate-500 font-mono tracking-tight">
            <Hash size={10} className="text-slate-400 flex-shrink-0" />
            {member.rollNumber}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <GraduationCap size={10} className="text-slate-400 flex-shrink-0" />
            {member.branch}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Building2 size={10} className="text-slate-400 flex-shrink-0" />
            Year {member.year}
          </span>
          {member.joinedAt && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <CalendarDays size={10} className="flex-shrink-0" />
              Joined {formatJoinDate(member.joinedAt)}
            </span>
          )}
        </div>
      </div>

      {/* ── Verified CGPA chip ───────────────────────────────── */}
      <div
        className={`text-right flex-shrink-0 border rounded-xl px-4 py-2 ${cgpaBg(member.verifiedCgpa)}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          CGPA
        </p>
        <p
          className={`text-xl font-bold tabular-nums leading-tight mt-0.5 ${cgpaColor(member.verifiedCgpa)}`}
        >
          {member.verifiedCgpa.toFixed(2)}
        </p>
        <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Verified ✓</p>
      </div>

      {/* ── Remove button (head only, pre-lock) ─────────────── */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove!(member.studentId)}
          className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title={`Remove ${member.name} from group`}
          aria-label={`Remove ${member.name} from group`}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}