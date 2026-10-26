'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Trash2, ListOrdered, CheckCircle2 } from 'lucide-react';
import { Room } from '@/lib/types';

interface PrioritySelectorProps {
  selectedRooms: Room[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (roomId: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
}

export default function PrioritySelector({
  selectedRooms,
  onMoveUp,
  onMoveDown,
  onRemove,
  onSubmit,
  isSubmitting = false,
  isReadOnly = false,
}: PrioritySelectorProps) {
  const canSubmit = selectedRooms.length >= 3 && selectedRooms.length <= 4;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <ListOrdered className="h-4 w-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">Room Priority Preference</h3>
        </div>
        <span className="text-xs font-mono text-slate-500">{selectedRooms.length} / 4 choices</span>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Select 3 to 4 rooms from the aerial map. Arrange them in order of preference (Priority 1 will be evaluated first during JoSAA allocation rounds).
      </p>

      {selectedRooms.length === 0 ? (
        <div className="py-8 border-2 border-dashed border-slate-200 rounded text-center text-xs text-slate-400">
          Click any available room on the floor map to add choices.
        </div>
      ) : (
        <div className="space-y-2">
          {selectedRooms.map((room, index) => (
            <div
              key={room.id}
              className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded text-xs"
            >
              <div className="flex items-center space-x-3">
                <span className="h-5 w-5 rounded bg-slate-800 text-white font-mono text-[11px] font-semibold flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <span className="font-mono font-bold text-slate-900">{room.roomNumber}</span>
                  <span className="text-slate-500 ml-2 text-[11px]">
                    Block {room.block} &bull; Floor {room.floor} ({room.capacity}-Bed)
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  disabled={isReadOnly || index === 0}
                  onClick={() => onMoveUp(index)}
                  className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                  title="Move Up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isReadOnly || index === selectedRooms.length - 1}
                  onClick={() => onMoveDown(index)}
                  className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                  title="Move Down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onRemove(room.id)}
                  className="p-1 text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-30"
                  title="Remove Choice"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          disabled={!canSubmit || isSubmitting || isReadOnly}
          onClick={onSubmit}
          className={`w-full py-2.5 px-4 rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
            canSubmit && !isSubmitting && !isReadOnly
              ? 'bg-slate-900 hover:bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Lock & Submit Preferences ({selectedRooms.length}/4)</span>
        </button>
        {!canSubmit && (
          <p className="text-[11px] text-amber-700 text-center mt-2">
            You must select at least 3 choices before submitting.
          </p>
        )}
      </div>
    </div>
  );
}