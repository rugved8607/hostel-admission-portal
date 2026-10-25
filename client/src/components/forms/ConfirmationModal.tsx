'use client'

import { X, AlertTriangle, CheckCircle2, FileText, FileImage } from 'lucide-react'
import type { PersonalDetails, AddressDetails, AcademicDetails } from '@/lib/types'

interface DocFile {
  file: File | null
  label: string
  required: boolean
}

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
  personal: PersonalDetails
  address: AddressDetails
  academic: AcademicDetails
  docFiles: DocFile[]
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-1">
      {title}
    </h3>
  )
}

function DataRow({ label, value }: { label: string; value: string | number }) {
  const display = String(value ?? '').trim()
  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 leading-tight">{label}</span>
      <span className={`text-xs font-semibold leading-tight break-all ${display ? 'text-slate-800' : 'text-slate-300 italic'}`}>
        {display || 'Not provided'}
      </span>
    </div>
  )
}

function DocRow({ label, file, required }: DocFile) {
  const uploaded = Boolean(file)
  const isPdf = file?.type === 'application/pdf'

  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-slate-100 last:border-0">
      {uploaded ? (
        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
      ) : (
        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${required ? 'border-red-300' : 'border-slate-200'}`} />
      )}

      <span className={`text-xs flex-1 ${uploaded ? 'text-slate-700' : required ? 'text-red-600' : 'text-slate-400'}`}>
        {label}
        {required && !uploaded && <span className="ml-1 text-red-400">(missing)</span>}
        {!required && !uploaded && <span className="ml-1 text-slate-300">(optional — skipped)</span>}
      </span>

      {file && (
        <div className="flex items-center gap-1 text-slate-400">
          {isPdf
            ? <FileText size={11} className="text-red-400" />
            : <FileImage size={11} className="text-blue-400" />}
          <span className="text-[10px] font-mono truncate max-w-[130px]">{file.name}</span>
        </div>
      )}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  personal,
  address,
  academic,
  docFiles,
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 id="confirm-modal-title" className="text-sm font-bold text-slate-800">
              Review Before Submission
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify all details carefully. You cannot edit after submitting.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Warning Banner ── */}
        <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>This action is final.</strong> Once submitted, your application is locked and sent to the admin team for verification. Details and documents cannot be changed after this point.
          </p>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Personal */}
          <section>
            <SectionHeader title="Personal Details" />
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-1">
              <DataRow label="Full Name"          value={personal.fullName} />
              <DataRow label="Roll Number"        value={personal.rollNumber} />
              <DataRow label="Branch"             value={personal.branch} />
              <DataRow label="Academic Year"      value={personal.year} />
              <DataRow label="Phone"              value={personal.phone} />
              <DataRow label="Email"              value={personal.email} />
              <DataRow label="Parent / Guardian"  value={personal.parentName} />
              <DataRow label="Parent Phone"       value={personal.parentPhone} />
            </div>
          </section>

          {/* Academic */}
          <section>
            <SectionHeader title="Academic Details" />
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-1">
              <DataRow label="CGPA (Self-Reported)"    value={academic.selfReportedCgpa} />
              <DataRow label="Prev. Semester %"        value={academic.previousSemPercentage} />
              <DataRow label="Active Backlogs"         value={academic.activeBacklogs} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              CGPA and marks are self-reported. The admin team will verify them against submitted documents.
            </p>
          </section>

          {/* Address */}
          <section>
            <SectionHeader title="Permanent Address" />
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-1">
              <DataRow label="Street / Locality"  value={address.permanentAddress} />
              <DataRow label="City"               value={address.city} />
              <DataRow label="State"              value={address.state} />
              <DataRow label="PIN Code"           value={address.pincode} />
            </div>
          </section>

          {/* Documents */}
          <section>
            <SectionHeader title="Uploaded Documents" />
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-1">
              {docFiles.map((d) => (
                <DocRow key={d.label} {...d} />
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Files are not stored in browser storage. Upon submission, they will be sent to the
              server via multipart/form-data (POST&nbsp;/api/applications).
            </p>
          </section>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          >
            ← Go Back &amp; Edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting…
              </>
            ) : (
              'Confirm & Submit Application'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}