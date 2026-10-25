'use client';

import React from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Users, 
  Grid, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Building2, 
  AlertCircle 
} from 'lucide-react';
import { useMockData } from '@/context/MockDataContext';

export default function StudentDashboardPage() {
  const { currentStudent, groups, rooms } = useMockData();

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 border border-slate-200 rounded text-center max-w-sm">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">No active student session detected.</p>
          <Link href="/" className="mt-3 inline-block text-xs text-indigo-600 hover:underline">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  const currentGroup = groups?.find((g) => g.id === currentStudent.groupId);
  const allottedRoom = rooms?.find((r) => r.id === currentGroup?.allottedRoomId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Candidate Portal</span>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">Welcome, {currentStudent.name}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Roll No: {currentStudent.rollNo} &bull; {currentStudent.branch} (Year {currentStudent.year})
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 bg-white px-3 py-1.5 rounded transition-colors"
            >
              Sign Out
            </Link>
          </div>
        </div>

        {/* Top Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
            <span className="text-xs text-slate-500 block">Application Status</span>
            <div className="mt-1 flex items-center space-x-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                currentStudent.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {currentStudent.status}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
            <span className="text-xs text-slate-500 block">Registered Group</span>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900">
              {currentGroup ? currentGroup.id : 'No Group Formed'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
            <span className="text-xs text-slate-500 block">Merit Performance</span>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-lg font-bold font-mono text-indigo-600">{currentStudent.cgpa?.toFixed(2) || '0.00'}</span>
              <span className="text-[11px] text-slate-400">
                {currentGroup ? `(Group Avg: ${currentGroup.averageCgpa.toFixed(2)})` : 'Individual CGPA'}
              </span>
            </div>
          </div>
        </div>

        {/* Phase Links */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Allotment Workflow Steps</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Step 1: Verification */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  {currentStudent.status === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Phase 1: Application</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Submit academic credentials, verification document uploads, and residential details.
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100">
                <Link
                  href="/student/apply"
                  className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors"
                >
                  <span>Open Application Form</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Step 2: Group Lobby */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                    <Users className="h-4 w-4" />
                  </div>
                  {currentGroup?.isLocked ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Phase 2: Group Formation</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Form teams of 3 to 4 members. Roll numbers are verified and group average CGPA is computed.
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100">
                <Link
                  href="/student/group"
                  className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors"
                >
                  <span>Enter Group Lobby</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Step 3: Floor Selection */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                    <Grid className="h-4 w-4" />
                  </div>
                  {allottedRoom ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Phase 3: Floor Selection</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Interactive aerial layout to browse wings and pick your group choices 1 to 4.
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100">
                <Link
                  href="/student/floor-map"
                  className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
                >
                  <span>View Floor Map</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Allotment Status Banner */}
        {allottedRoom && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-5 w-5 text-emerald-600" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">Room Allotment Confirmed</h4>
                <p className="text-xs text-emerald-700">
                  Assigned to <span className="font-mono font-semibold">Room {allottedRoom.roomNumber}</span> (Block {allottedRoom.block}, Floor {allottedRoom.floor}).
                </p>
              </div>
            </div>
            <Link
              href="/student/floor-map"
              className="text-xs text-emerald-800 font-semibold hover:underline"
            >
              View Floor Location
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
