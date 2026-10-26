'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Play, RefreshCw, Save } from 'lucide-react'
import { useMockData } from '@/context/MockDataContext'

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function localDateTime(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function defaultDeadline(): string {
  return localDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
}

export default function AdminAllocationPage() {
  const {
    groups, rooms, currentRound, currentRoundId, currentRoundStatus,
    currentRoundDeadline, currentTieBreakRule, loading, error,
    roundHistory,
    unallottedStudents, availableRooms, auditLog, refreshData,
    runAllocationRound, createRound, updateRoundSettings, openRound,
    closeFormation, publishRound, closeRound, cancelAllotment,
  } = useMockData()
  const [isProcessing, setIsProcessing] = useState(false)
  const [allocationLog, setAllocationLog] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deadline, setDeadline] = useState('')
  const [tieBreakRule, setTieBreakRule] = useState(currentTieBreakRule)

  const rankedGroups = [...groups].sort((left, right) =>
    (left.meritRank ?? Number.MAX_SAFE_INTEGER) - (right.meritRank ?? Number.MAX_SAFE_INTEGER) ||
    right.averageCgpa - left.averageCgpa ||
    left.id.localeCompare(right.id),
  )
  const allottedGroups = groups.filter((group) => group.allocationStatus === 'allotted').length
  const availableRoomCount = availableRooms.length

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDeadline(localDateTime(currentRoundDeadline) || defaultDeadline())
      setTieBreakRule(currentTieBreakRule)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [currentRoundDeadline, currentTieBreakRule, currentRoundId])

  const perform = async (label: string, action: () => Promise<void>) => {
    setIsProcessing(true)
    setActionError(null)
    setAllocationLog(`${label}…`)
    try {
      await action()
      setAllocationLog(`${label} complete.`)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : `${label} failed.`
      setActionError(message)
      setAllocationLog(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveSettings = () => perform('Saving round settings', async () => {
    if (!deadline || Number.isNaN(new Date(deadline).getTime())) {
      throw new Error('Choose a valid formation deadline.')
    }
    if (currentRoundId) await updateRoundSettings(deadline, tieBreakRule)
    else await createRound(deadline, tieBreakRule)
  })

  const handleCancelAllotment = (groupId: string) => {
    const reason = window.prompt('Enter the required reason for cancelling this allotment:')?.trim()
    if (!reason) return
    void perform('Cancelling allotment', () => cancelAllotment(groupId, reason))
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center">
          <div>
            <nav className="mb-1 flex items-center gap-2 text-xs text-slate-500">
              <Link href="/admin/verification" className="hover:text-slate-800">Verification Desk</Link>
              <span>/</span>
              <span className="font-semibold text-slate-900">Room Allocation</span>
            </nav>
            <h1 className="text-xl font-bold">Hostel Room Allocation</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={loading || isProcessing}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              translate="no"
              type="button"
              disabled={isProcessing || currentRoundStatus !== 'FORMATION_CLOSED'}
              onClick={() => void perform(`Executing allocation for Round ${currentRound}`, runAllocationRound)}
              className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />}
              <span>Run Allocation</span>
            </button>
          </div>
        </header>

        {(error || actionError) && (
          <div className="flex items-center justify-between rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <span>{actionError ?? error}</span>
            <button type="button" onClick={() => void refreshData()} className="font-semibold underline">Retry</button>
          </div>
        )}
        {loading && <p className="text-xs text-slate-500">Loading round, inventory, and audit data…</p>}

        {allocationLog && (
          <div className="flex items-center justify-between rounded bg-slate-900 p-3 font-mono text-xs text-white">
            <span>{allocationLog}</span>
            <button type="button" onClick={() => setAllocationLog(null)} className="text-slate-300 hover:text-white">
              Clear
            </button>
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Round {currentRound || 'Setup'} Controls</h2>
              <p className="mt-1 text-xs text-slate-500">Current status: {currentRoundStatus ?? 'No round created'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(!currentRoundStatus || currentRoundStatus === 'PUBLISHED' || currentRoundStatus === 'CLOSED') && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void handleSaveSettings()}
                  className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> Create Next Round
                </button>
              )}
              {currentRoundStatus === 'DRAFT' && (
                <>
                  <button type="button" disabled={isProcessing} onClick={() => void handleSaveSettings()}
                    className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Save Settings</button>
                  <button type="button" disabled={isProcessing} onClick={() => void perform('Opening formation', openRound)}
                    className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Open Formation</button>
                </>
              )}
              {currentRoundStatus === 'FORMATION_OPEN' && (
                <>
                  <button type="button" disabled={isProcessing} onClick={() => void handleSaveSettings()}
                    className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Save Settings</button>
                  <button type="button" disabled={isProcessing} onClick={() => void perform('Closing formation', closeFormation)}
                    className="rounded bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Close Formation</button>
                </>
              )}
              {currentRoundStatus === 'ALLOCATED' && (
                <button type="button" disabled={isProcessing} onClick={() => void perform('Publishing results', publishRound)}
                  className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Publish Results</button>
              )}
              {currentRoundStatus === 'PUBLISHED' && (
                <button type="button" disabled={isProcessing} onClick={() => void perform('Closing counselling', closeRound)}
                  className="rounded bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Close Counselling</button>
              )}
            </div>
          </div>
          {(!currentRoundStatus || currentRoundStatus === 'DRAFT' || currentRoundStatus === 'FORMATION_OPEN') && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Formation deadline
                <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)}
                  className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-800" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Tie-break rule
                <select value={tieBreakRule} onChange={(event) => setTieBreakRule(event.target.value as typeof tieBreakRule)}
                  className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800">
                  <option value="MAX_CGPA_THEN_ROLL_NO">Highest individual CGPA, then roll number</option>
                  <option value="ROLL_NO_ASC">Roll number ascending</option>
                  <option value="GROUP_CREATED_ASC">Group creation time</option>
                </select>
              </label>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Active Round', currentRound],
            ['Allotted Groups', `${allottedGroups} / ${groups.length}`],
            ['Pending Groups', groups.length - allottedGroups],
            ['Available Rooms', availableRoomCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 font-mono text-xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Merit Rank</th>
                <th className="px-4 py-3">Group ID</th>
                <th className="px-4 py-3">Average CGPA</th>
                <th className="px-4 py-3">Preferences</th>
                <th className="px-4 py-3">Allotted Room</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rankedGroups.map((group, index) => (
                <tr key={group.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{group.meritRank ?? index + 1}</td>
                  <td className="px-4 py-3 font-mono">{group.id}</td>
                  <td className="px-4 py-3">{group.averageCgpa.toFixed(2)}</td>
                  <td className="px-4 py-3">{group.preferences.length}</td>
                  <td className="px-4 py-3">
                    {group.allottedRoomNumber ?? rooms.find((room) => room.id === group.allottedRoomId)?.roomNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {group.allocationStatus}
                    {group.allocationReason && <p className="mt-1 text-[10px] text-amber-700">{group.allocationReason}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {group.allocationStatus === 'allotted' && currentRoundId && (
                      <button type="button" disabled={isProcessing} onClick={() => handleCancelAllotment(group.id)}
                        className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50">
                        Cancel allotment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rankedGroups.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    {loading ? 'Loading groups…' : 'No groups to allocate.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold">Unallotted Students</h2>
            <p className="mt-1 text-xs text-slate-500">Students remain eligible to reform a group in the next round.</p>
            <div className="mt-3 divide-y divide-slate-100">
              {unallottedStudents.map((record, index) => {
                const group = asObject(record)
                const members = Array.isArray(group.members) ? group.members : []
                const round = asObject(group.round)
                return (
                  <div key={String(group.id ?? index)} className="py-2 text-xs">
                    <p className="font-semibold text-slate-700">Round {String(round.number ?? '—')} · Group {String(group.id ?? '')}</p>
                    <p className="text-slate-500">{members.map((entry) => {
                      const member = asObject(entry)
                      const student = asObject(member.student)
                      return String(student.name ?? student.rollNo ?? '')
                    }).filter(Boolean).join(', ') || 'No member details'}</p>
                    <p className="mt-1 text-amber-700">{String(group.nextStep ?? 'Reform a group of 3 or 4 in the next round.')}</p>
                  </div>
                )
              })}
              {!unallottedStudents.length && <p className="py-4 text-xs text-slate-400">No unallotted students.</p>}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold">Available Rooms</h2>
            <div className="mt-3 max-h-72 divide-y divide-slate-100 overflow-auto">
              {availableRooms.map((record, index) => {
                const room = asObject(record)
                const block = asObject(room.block)
                const hostel = asObject(block.hostel)
                return (
                  <p key={String(room.id ?? index)} className="py-2 text-xs text-slate-600">
                    {String(hostel.name ?? 'Hostel')} · Block {String(block.name ?? '—')} · Room {String(room.roomNumber ?? '—')} · Floor {String(room.floor ?? '—')} · Capacity {String(room.capacity ?? '—')}
                  </p>
                )
              })}
              {!availableRooms.length && <p className="py-4 text-xs text-slate-400">No available rooms in the inventory.</p>}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold">Audit Log</h2>
          <div className="mt-3 max-h-80 divide-y divide-slate-100 overflow-auto">
            {auditLog.map((record, index) => (
              <div key={String(record.id ?? index)} className="py-2 text-xs">
                <p className="font-semibold text-slate-700">{String(record.action ?? 'Activity')} · {String(record.entity ?? '')}</p>
                <p className="text-slate-500">{String(record.createdAt ?? '')} {String(record.entityId ?? '')}</p>
                <p className="break-all text-slate-500">{JSON.stringify(record.details ?? {})}</p>
              </div>
            ))}
            {!auditLog.length && <p className="py-4 text-xs text-slate-400">No audit events yet.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold">Round History</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {roundHistory.map((record, index) => {
              const counts = asObject(record._count)
              return (
                <div key={String(record.id ?? index)} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                  <span className="font-semibold text-slate-700">Round {String(record.number ?? '')} · {String(record.status ?? '')}</span>
                  <span className="text-slate-500">
                    Deadline {String(record.formationDeadline ?? '—')} · Groups {String(counts.groups ?? 0)} · Snapshots {String(counts.snapshots ?? 0)} · Allotments {String(counts.allotments ?? 0)}
                  </span>
                </div>
              )
            })}
            {!roundHistory.length && <p className="py-4 text-xs text-slate-400">No rounds have been created.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
