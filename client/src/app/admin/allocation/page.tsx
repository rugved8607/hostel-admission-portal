'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, RotateCcw, RefreshCw } from 'lucide-react'
import { useMockData } from '@/context/MockDataContext'

export default function AdminAllocationPage() {
  const { groups, rooms, currentRound, runAllocationRound, resetAllData } = useMockData()
  const [isProcessing, setIsProcessing] = useState(false)
  const [allocationLog, setAllocationLog] = useState<string | null>(null)

  const rankedGroups = [...groups].sort((left, right) => right.averageCgpa - left.averageCgpa)
  const allottedGroups = groups.filter((group) => group.allocationStatus === 'allotted').length
  const availableRooms = rooms.filter((room) => room.status === 'available').length

  const handleExecuteRound = () => {
    setIsProcessing(true)
    setAllocationLog(`Executing allocation for Round ${currentRound}...`)
    window.setTimeout(() => {
      runAllocationRound()
      setIsProcessing(false)
      setAllocationLog(`Round ${currentRound} allocation complete.`)
    }, 600)
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
              onClick={resetAllData}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All Records
            </button>
            <button
              type="button"
              disabled={isProcessing || availableRooms === 0 || groups.length === allottedGroups}
              onClick={handleExecuteRound}
              className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />}
              Execute Round {currentRound}
            </button>
          </div>
        </header>

        {allocationLog && (
          <div className="flex items-center justify-between rounded bg-slate-900 p-3 font-mono text-xs text-white">
            <span>{allocationLog}</span>
            <button type="button" onClick={() => setAllocationLog(null)} className="text-slate-300 hover:text-white">
              Clear
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Active Round', currentRound],
            ['Allotted Groups', `${allottedGroups} / ${groups.length}`],
            ['Pending Groups', groups.length - allottedGroups],
            ['Available Rooms', availableRooms],
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
              </tr>
            </thead>
            <tbody>
              {rankedGroups.map((group, index) => (
                <tr key={group.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-mono">{group.id}</td>
                  <td className="px-4 py-3">{group.averageCgpa.toFixed(2)}</td>
                  <td className="px-4 py-3">{group.preferences.length}</td>
                  <td className="px-4 py-3">
                    {rooms.find((room) => room.id === group.allottedRoomId)?.roomNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 capitalize">{group.allocationStatus}</td>
                </tr>
              ))}
              {rankedGroups.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">No groups to allocate.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
