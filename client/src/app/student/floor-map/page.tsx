'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building, Layers, ShieldAlert, CheckCircle2, BedDouble, AlertCircle } from 'lucide-react';
import { useMockData } from '@/context/MockDataContext';
import { Room } from '@/lib/types';
import RoomNode from '@/components/floor-map/RoomNode';
import PrioritySelector from '@/components/floor-map/PrioritySelector';

export default function StudentFloorMapPage() {
  const { currentStudent, rooms, groups, savePreferences } = useMockData();
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedBlock, setSelectedBlock] = useState<string>('A');
  const [preferenceIds, setPreferenceIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  const currentGroup = groups.find((g) => g.id === currentStudent.groupId);
  const isLeader = currentGroup ? currentGroup.leaderId === currentStudent.id : false;

  // Filter floor rooms
  const currentFloorRooms = rooms.filter(
    (r) => r.floor === selectedFloor && r.block === selectedBlock
  );

  const selectedRoomObjects = preferenceIds
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is Room => Boolean(r));

  const handleRoomClick = (room: Room) => {
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

  const handleSubmitPreferences = () => {
    if (!currentGroup) return;
    savePreferences(currentGroup.id, preferenceIds);
    setStatusMessage('Room priorities saved and locked for JoSAA round allocation.');
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
                {[1, 2].map((floor) => (
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {currentFloorRooms.map((room) => {
                  const isSelected = preferenceIds.includes(room.id);
                  const rankIndex = preferenceIds.indexOf(room.id);
                  return (
                    <RoomNode
                      key={room.id}
                      room={room}
                      isSelected={isSelected}
                      priorityRank={rankIndex !== -1 ? rankIndex + 1 : undefined}
                      onClick={handleRoomClick}
                      disabled={!isLeader}
                    />
                  );
                })}
              </div>

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
            />
          </div>

        </div>
      </div>
    </div>
  );
}