'use client'

import Link from 'next/link'
import { useMockData } from '@/context/MockDataContext'

export default function AdminGroupsPage() {
  const { groups } = useMockData()

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-800">
      <div className="mx-auto max-w-5xl space-y-5">
        <nav className="flex gap-2 text-xs text-slate-500">
          <Link href="/admin/verification" className="hover:text-slate-800">Verification Desk</Link>
          <span>/</span>
          <span className="font-semibold text-slate-900">Student Groups</span>
        </nav>
        <header>
          <h1 className="text-xl font-bold">Student Groups</h1>
          <p className="mt-1 text-xs text-slate-500">Review membership and room-allocation preferences.</p>
        </header>
        <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Leader</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Average CGPA</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono">{group.id}</td>
                  <td className="px-4 py-3">
                    {group.members.find((member) => member.studentId === group.headStudentId)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">{group.members.length} / {group.maxSize}</td>
                  <td className="px-4 py-3">{group.averageCgpa.toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize">{group.status}</td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">No student groups have been formed.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
