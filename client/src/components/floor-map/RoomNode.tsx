'use client';

import React from 'react';
import { BedDouble, Check } from 'lucide-react';
import { Room } from '@/lib/types';

interface RoomNodeProps {
  room: Room;
  isSelected: boolean;
  priorityRank?: number; // 1, 2, 3, or 4 if selected
  onClick: (room: Room) => void;
  disabled?: boolean;
}

export default function RoomNode({
  room,
  isSelected,
  priorityRank,
  onClick,
  disabled = false,
}: RoomNodeProps) {
  const isAvailable = room.status === 'available';
  const isOccupied = room.status === 'occupied';
  const isReserved = room.status === 'reserved';

  // Base styling mirroring cinema seat layout
  const getCardStyle = () => {
    if (isSelected) {
      return 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/50 scale-[1.02]';
    }
    if (isOccupied) {
      return 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60';
    }
    if (isReserved) {
      return 'bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed';
    }
    // Available
    return 'bg-white text-slate-800 border-slate-300 hover:border-slate-800 hover:shadow-sm cursor-pointer';
  };

  return (
    <button
      type="button"
      disabled={disabled || !isAvailable}
      onClick={() => onClick(room)}
      className={`relative flex flex-col items-center justify-between p-3 rounded-lg border text-xs transition-all duration-150 select-none ${getCardStyle()}`}
    >
      {/* Priority Rank Indicator Badge */}
      {priorityRank !== undefined && (
        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold flex items-center justify-center border-2 border-white shadow-sm">
          #{priorityRank}
        </span>
      )}

      <div className="flex items-center space-x-1.5 mb-1.5">
        <BedDouble className={`h-4 w-4 ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`} />
        <span className="font-mono font-bold text-xs tracking-tight">{room.roomNumber}</span>
      </div>

      <div className="flex items-center justify-between w-full text-[10px] font-mono mt-1 pt-1.5 border-t border-slate-200/40">
        <span className={isSelected ? 'text-indigo-100' : 'text-slate-500'}>
          {room.capacity}-Seater
        </span>
        <span
          className={`font-medium capitalize ${
            isSelected
              ? 'text-white font-semibold'
              : isOccupied
              ? 'text-slate-400'
              : isReserved
              ? 'text-amber-700'
              : 'text-emerald-700'
          }`}
        >
          {isSelected ? 'Selected' : room.status}
        </span>
      </div>
    </button>
  );
}