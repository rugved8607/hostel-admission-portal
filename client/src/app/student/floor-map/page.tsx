'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Building, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useMockData } from '@/context/MockDataContext';
import { Room } from '@/lib/types';
import PrioritySelector from '@/components/floor-map/PrioritySelector';

export default function StudentFloorMapPage() {
  const { currentStudent, rooms, groups, savePreferences, loading, error, refreshData, allocationStatus } = useMockData();
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedBlock, setSelectedBlock] = useState<string>('A');
  const [selectedHostel, setSelectedHostel] = useState<string>('');
  const [preferenceIds, setPreferenceIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initializedGroupId = useRef<string | null>(null);

  const hostels = Array.from(new Map(
    rooms.map((room) => [room.hostelId ?? room.hostelName ?? '', {
      id: room.hostelId ?? room.hostelName ?? '',
      name: room.hostelName ?? 'Hostel',
    }]),
  ).values());

  const activeHostel = selectedHostel || hostels[0]?.id || '';

  useEffect(() => {
    const currentGroup = groups[0];
    if (currentGroup && initializedGroupId.current !== currentGroup.id) {
      initializedGroupId.current = currentGroup.id;
      setPreferenceIds(currentGroup.preferences);
    }
  }, [groups]);

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 border border-slate-200 rounded text-center">
          <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">Student session unverified.</p>
          <Link href="/" className="mt-3 inline-block text-xs text-indigo-600 hover:underline">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  const currentGroup = groups[0];
  const isLeader = currentGroup ? currentGroup.leaderId === currentStudent.id : false;
  const canEditPreferences = Boolean(
    currentGroup && currentGroup.allocationStatus === 'pending' && isLeader,
  );

  // Filter floor rooms
  const currentFloorRooms = rooms.filter(
    (r) => r.floor === selectedFloor && r.block === selectedBlock &&
      (r.hostelId ?? r.hostelName ?? '') === activeHostel
  );

  const selectedRoomObjects = preferenceIds
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is Room => Boolean(r));

  const handleRoomClick = (room: Room) => {
    if (!canEditPreferences || room.status !== 'available') return;
    if (room.capacity < (currentGroup?.members.length ?? 0)) {
      setStatusMessage('This room does not have enough beds for your current group.');
      return;
    }
    if (preferenceIds.includes(room.id)) {
      setPreferenceIds(preferenceIds.filter((id) => id !== room.id));
    } else {
      if (preferenceIds.length >= 4) {
        setStatusMessage('Maximum 4 choices allowed. Remove an existing preference to add another.');
        return;
      }
      setPreferenceIds([...preferenceIds, room.id]);
      setStatusMessage(null);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...preferenceIds];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setPreferenceIds(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === preferenceIds.length - 1) return;
    const updated = [...preferenceIds];
    [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
    setPreferenceIds(updated);
  };

  const handleRemove = (roomId: string) => {
    setPreferenceIds(preferenceIds.filter((id) => id !== roomId));
  };

  const handleSubmitPreferences = async () => {
    if (!currentGroup || !canEditPreferences) return;
    setIsSaving(true);
    try {
      await savePreferences(currentGroup.id, preferenceIds);
      setStatusMessage('Room priorities saved for round allocation.');
    } catch (cause) {
      setStatusMessage(cause instanceof Error ? cause.message : 'Unable to save room priorities.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Phase Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/student/apply" className="hover:text-slate-800">Phase 1: Verification</Link>
              <span>/</span>
              <Link href="/student/group" className="hover:text-slate-800">Phase 2: Group</Link>
              <span>/</span>
              <span className="font-semibold text-slate-900">Phase 3: Aerial Floor Selection</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Hostel Architectural Wing Layout</h1>
          </div>

          {currentGroup?.allocationStatus === 'allotted' ? (
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
              <span>Allotted: Room {rooms.find((r) => r.id === currentGroup.allottedRoomId)?.roomNumber}</span>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-500">
              Group Merit Rank Average: <span className="font-bold text-indigo-600">{currentGroup?.averageCgpa.toFixed(2) || 'N/A'}</span>
            </div>
          )}
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className="p-3 bg-slate-900 text-white rounded text-xs flex items-center justify-between shadow-sm">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs">Dismiss</button>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => void refreshData()} className="underline">Retry</button>
          </div>
        )}
        {(allocationStatus?.status === 'UNALLOTTED' || allocationStatus?.status === 'CANCELLED') && allocationStatus.nextStep && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            {allocationStatus.nextStep}
          </div>
        )}
        {loading && <p className="text-xs text-slate-500">Loading room inventory…</p>}
        {!canEditPreferences && (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600">
            Room preferences can be changed by the group leader before allocation. Form or join a group during an open round to choose preferences.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left/Main: Floor Canvas Schematic */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Floor / Block Switcher */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <Building className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Block:</span>
                {(['A', 'B'] as const).map((block) => (
                  <button
                    key={block}
                    type="button"
                    onClick={() => setSelectedBlock(block)}
                    className={`px-3 py-1 rounded font-mono text-xs font-medium transition-colors ${
                      selectedBlock === block
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Block {block}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <Layers className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Floor:</span>
                {[1, 2, 3, 4, 5].map((floor) => (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => setSelectedFloor(floor)}
                    className={`px-3 py-1 rounded font-mono text-xs font-medium transition-colors ${
                      selectedFloor === floor
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Floor {floor}
                  </button>
                ))}
              </div>
            </div>

            {/* Aerial Architectural Grid (BookMyShow style) */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="text-center pb-4 mb-4 border-b border-slate-100">
                <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">
                  &bull; Main Corridor &bull; Balcony Wing Facing East &bull;
                </span>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                {hostels.map((hostel) => (
                  <button
                    key={hostel.id}
                    type="button"
                    onClick={() => setSelectedHostel(hostel.id)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeHostel === hostel.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {hostel.name}
                  </button>
                ))}
              </div>

              {currentFloorRooms.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  {loading ? 'Loading room layout…' : 'No rooms are registered for this hostel, block, and floor.'}
                </div>
              ) : (
                <svg
                  role="img"
                  aria-label={`${hostels.find((hostel) => hostel.id === activeHostel)?.name ?? 'Hostel'} block ${selectedBlock}, floor ${selectedFloor} room map`}
                  viewBox={`0 0 ${Math.max(...currentFloorRooms.map((room) => (room.x ?? 0) + (room.width ?? 80))) + 24} ${Math.max(...currentFloorRooms.map((room) => (room.y ?? 0) + (room.height ?? 80))) + 24}`}
                  className="w-full h-auto min-h-56"
                >
                  {currentFloorRooms.map((room) => {
                    const isSelected = preferenceIds.includes(room.id) && room.status === 'available';
                    const canSelectRoom = canEditPreferences &&
                      room.status === 'available' &&
                      room.capacity >= (currentGroup?.members.length ?? 0);
                    const rankIndex = preferenceIds.indexOf(room.id);
                    const fill = room.status === 'occupied'
                      ? '#e2e8f0'
                      : room.status === 'reserved'
                        ? '#fef3c7'
                        : isSelected ? '#4f46e5' : '#ffffff';
                    const stroke = room.status === 'reserved'
                      ? '#f59e0b'
                      : room.status === 'occupied'
                        ? '#cbd5e1'
                        : isSelected
                          ? '#4338ca'
                          : '#64748b';
                    return (
                      <g
                        key={room.id}
                        role={canSelectRoom ? 'button' : undefined}
                        tabIndex={canSelectRoom ? 0 : undefined}
                        aria-label={`Room ${room.roomNumber}, capacity ${room.capacity}, ${room.status}`}
                        onClick={() => handleRoomClick(room)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleRoomClick(room);
                          }
                        }}
                        className={canSelectRoom ? 'cursor-pointer' : 'cursor-default'}
                      >
                        <rect
                          x={room.x ?? 0}
                          y={room.y ?? 0}
                          width={room.width ?? 80}
                          height={room.height ?? 80}
                          rx="8"
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={isSelected ? 3 : 1.5}
                          opacity={room.status === 'occupied' ? 0.65 : 1}
                        />
                        <text
                          x={(room.x ?? 0) + (room.width ?? 80) / 2}
                          y={(room.y ?? 0) + (room.height ?? 80) / 2 - 4}
                          textAnchor="middle"
                          className={`font-mono text-[12px] font-bold ${isSelected ? 'fill-white' : 'fill-slate-800'}`}
                        >
                          {room.roomNumber}
                        </text>
                        <text
                          x={(room.x ?? 0) + (room.width ?? 80) / 2}
                          y={(room.y ?? 0) + (room.height ?? 80) / 2 + 14}
                          textAnchor="middle"
                          className={`font-mono text-[10px] ${isSelected ? 'fill-indigo-100' : 'fill-slate-500'}`}
                        >
                          {isSelected ? `Priority ${rankIndex + 1}` : `${room.capacity}-bed · ${room.status}`}
                        </text>
                        <title>{`${room.roomNumber}: ${room.capacity}-bed, ${room.status}`}</title>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 border-t border-slate-100 pt-5 mt-6">
                <div className="flex items-center space-x-1.5">
                  <div className="h-3 w-3 rounded border border-slate-300 bg-white" />
                  <span>Available</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="h-3 w-3 rounded bg-indigo-600 border border-indigo-700" />
                  <span>Selected Priority</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="h-3 w-3 rounded bg-slate-100 border border-slate-200 opacity-60" />
                  <span>Occupied / Full</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="h-3 w-3 rounded bg-amber-50 border border-amber-200" />
                  <span>Reserved / Warden</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Selected Preference Bucket */}
          <div className="space-y-4">
            <PrioritySelector
              selectedRooms={selectedRoomObjects}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRemove={handleRemove}
              onSubmit={handleSubmitPreferences}
              isSubmitting={isSaving}
              isReadOnly={!canEditPreferences}
            />
          </div>

        </div>
      </div>
    </div>
  );
}