"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useMockData } from '@/context/MockDataContext'

const statusStyles = {
  AVAILABLE: 'fill-emerald-500 stroke-emerald-700',
  OCCUPIED: 'fill-slate-500 stroke-slate-700',
  RESERVED: 'fill-amber-400 stroke-amber-600',
}

type InventoryRoom = {
  id: string
  roomNumber: string
  floor: number
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
  allottedGroupId: string | null
  x: number
  y: number
  width: number
  height: number
  block: { name: string; hostel: { name: string } }
}

export default function AdminRoomsPage() {
  const router = useRouter()
  const { session, isHydrated, loading, error, refreshData } = useMockData()
  const [rooms, setRooms] = useState<InventoryRoom[]>([])
  const [selected, setSelected] = useState<InventoryRoom | null>(null)
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  useEffect(() => {
    if (isHydrated && session?.role !== 'admin') router.replace('/admin/login')
  }, [isHydrated, router, session])

  useEffect(() => {
    let active = true
    if (!isHydrated || session?.role !== 'admin') return
    const load = async () => {
      setInventoryError(null)
      try {
        const response = await fetch('/api/admin/rooms', { credentials: 'same-origin' })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          const failure = payload && typeof payload === 'object' && 'error' in payload
            ? payload.error
            : null
          throw new Error(typeof failure === 'string' ? failure : 'Unable to load room inventory.')
        }
        if (active) setRooms(Array.isArray(payload) ? payload as InventoryRoom[] : [])
      } catch (cause) {
        if (active) setInventoryError(cause instanceof Error ? cause.message : 'Unable to load room inventory.')
      }
    }
    void load()
    return () => { active = false }
  }, [isHydrated, session])

  if (!isHydrated || session?.role !== 'admin') return null

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold">Room Inventory</h1>
            <p className="text-xs text-slate-500">Select a room to inspect its allocation state.</p>
          </div>
          <button type="button" onClick={() => refreshData()} className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
        </header>
        {(error || inventoryError) && <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">{inventoryError ?? error}</div>}
        {loading && <p className="text-xs text-slate-500">Loading room inventory...</p>}
        <div className="flex gap-4 text-xs">
          {Object.entries(statusStyles).map(([status, style]) => <span key={status} className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-sm ${style.replaceAll('fill-', 'bg-').replace(/ stroke-.+/, '')}`} />{status[0] + status.slice(1).toLowerCase()}</span>)}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="min-h-[520px] overflow-auto rounded-lg border border-slate-200 bg-white p-3">
            {rooms.length === 0 && !loading ? <p className="p-6 text-center text-xs text-slate-500">No rooms are registered.</p> : (
              <svg viewBox="0 0 420 520" className="h-auto w-full min-w-[420px]" role="img" aria-label="Room layout">
                {rooms.map((room) => (
                  <g key={room.id} role="button" tabIndex={0} onClick={() => setSelected(room)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelected(room) }}>
                    <rect x={room.x} y={room.y} width={room.width} height={room.height} rx={3} className={`${statusStyles[room.status]} cursor-pointer stroke-2 transition-opacity hover:opacity-80`} />
                    <text x={room.x + room.width / 2} y={room.y + room.height / 2 + 4} textAnchor="middle" className="pointer-events-none fill-white text-[11px] font-bold">{room.roomNumber}</text>
                  </g>
                ))}
              </svg>
            )}
          </div>
          <aside className="rounded-lg border border-slate-200 bg-white p-4 text-xs">
            <h2 className="mb-3 text-sm font-bold">Room details</h2>
            {selected ? <dl className="space-y-3"><div><dt className="text-slate-500">Room</dt><dd className="font-mono font-semibold">{selected.roomNumber}</dd></div><div><dt className="text-slate-500">Hostel / block</dt><dd>{selected.block.hostel.name} / {selected.block.name}</dd></div><div><dt className="text-slate-500">Floor / capacity</dt><dd>{selected.floor} / {selected.capacity}</dd></div><div><dt className="text-slate-500">Status</dt><dd className="font-semibold">{selected.status}</dd></div><div><dt className="text-slate-500">Allotted group</dt><dd className="break-all font-mono">{selected.allottedGroupId ?? 'None'}</dd></div></dl> : <p className="text-slate-500">Choose a room on the layout.</p>}
          </aside>
        </div>
      </div>
    </main>
  )
}