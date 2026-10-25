'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, ArrowRight, Upload, FileText, Check } from 'lucide-react';
import { useMockData } from '@/context/MockDataContext';

export default function StudentApplyPage() {
  const router = useRouter();
  const { currentStudent, updateApplicationStatus } = useMockData();
  const [submitted, setSubmitted] = useState(false);

  // Fallback defaults to ensure no undefined property crash
  const student = currentStudent || {
    id: 'std_1',
    name: 'Aarav Sharma',
    rollNo: '21BCE1042',
    branch: 'Computer Science',
    year: 3,
    cgpa: 9.15,
    phone: '9876543210',
    address: {
      street: '12 Sector 4',
      city: 'Bhopal',
      pincode: '462001',
      state: 'MP',
    },
    status: 'approved',
  };

  const [formData, setFormData] = useState({
    name: student.name,
    rollNo: student.rollNo,
    branch: student.branch,
    year: student.year,
    phone: student.phone,
    street: student.address?.street || '12 Sector 4',
    city: student.address?.city || 'Bhopal',
    pincode: student.address?.pincode || '462001',
    state: student.address?.state || 'MP',
  });

  const [uploadedDocs, setUploadedDocs] = useState<{ [key: string]: boolean }>({
    'Govt Photo ID': true,
    'Semester Marksheet': true,
    'Hostel Fee Clearance': true,
    'Student Identity Card': true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student.id) {
      updateApplicationStatus(student.id, 'submitted');
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-900">Phase 1: Verification Form</span>
              <span>/</span>
              <Link href="/student/group" className="hover:text-slate-800">Phase 2: Group Lobby</Link>
              <span>/</span>
              <Link href="/student/floor-map" className="hover:text-slate-800">Phase 3: Floor Map</Link>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Hostel Admission Application</h1>
          </div>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 bg-white px-3 py-1.5 rounded">
            Sign Out
          </Link>
        </div>

        {submitted ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4 shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Application Submitted for Warden Review</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Your academic credentials and verification vouchers are on record. You can now proceed to the Phase 2 Group Lobby.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/student/group')}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
              >
                <span>Proceed to Group Lobby (Phase 2)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Academic & Personal Particulars</h2>
              <p className="text-xs text-slate-500">Official student registration records verified from campus database.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Candidate Full Name</label>
                  <input
                    type="text"
                    disabled
                    value={formData.name}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    disabled
                    value={formData.rollNo}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department / Branch</label>
                  <input
                    type="text"
                    disabled
                    value={formData.branch}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    disabled
                    value={`Year ${formData.year}`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Permanent Residential Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 text-xs">
                <div className="sm:col-span-3">
                  <label className="block font-medium text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Verification Document Repository</h2>
              <p className="text-xs text-slate-500 mb-3">Official scans verified against university student records.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {Object.keys(uploadedDocs).map((docName) => (
                  <div key={docName} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center space-x-2.5">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <div>
                        <span className="font-medium text-slate-800 block">{docName}</span>
                        <span className="text-[10px] text-emerald-600 font-mono flex items-center mt-0.5">
                          <Check className="h-3 w-3 mr-0.5" /> Attached & verified
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-mono">
                      PDF &bull; 1.2MB
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                <span>Verify residential address before final submission.</span>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
              >
                Submit Application
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}