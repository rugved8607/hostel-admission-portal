'use client'

import { useEffect, useState } from 'react'
import {
  X, FileText, FileImage, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, User,
  ClipboardList, MapPin, Paperclip, Loader2,
} from 'lucide-react'
import { useMockData } from '@/context/MockDataContext'
import type { StudentStatus, DocumentMeta } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocumentReviewDrawerProps {
  applicationId: string | null
  isOpen: boolean
  onClose: () => void
}

type AdminAction = 'approve' | 'reject' | 'correction'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getStatusLabel(status: StudentStatus): string {
  const map: Record<StudentStatus, string> = {
    draft:                  'Draft',
    submitted:              'Submitted',
    not_applied:            'Not Applied',
    application_draft:      'Draft',
    application_submitted:  'Submitted',
    under_review:           'Under Review',
    approved:               'Approved',
    rejected:               'Rejected',
    correction_required:    'Correction Required',
  }
  return map[status] ?? status
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const styles: Partial<Record<StudentStatus, string>> = {
    application_submitted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    under_review:          'bg-blue-50   text-blue-700   border-blue-200',
    approved:              'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:              'bg-red-50    text-red-700    border-red-200',
    correction_required:   'bg-orange-50 text-orange-700 border-orange-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border rounded-full ${styles[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {getStatusLabel(status)}
    </span>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DataBlock({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium break-words">{value ?? '—'}</p>
    </div>
  )
}

function SectionAccordion({
  icon: Icon, title, children, defaultOpen = false,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Icon size={14} className="text-slate-500" />
          {title}
        </span>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="px-4 py-4 bg-white">{children}</div>}
    </div>
  )
}

function DocFileRow({ label, doc, required, documentKey, studentId }: { label: string; doc: DocumentMeta | null; required: boolean; documentKey: string; studentId: string }) {
  const isPdf = doc?.mimeType === 'application/pdf'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0">
        {doc
          ? isPdf
            ? <FileText size={16} className="text-red-400" />
            : <FileImage size={16} className="text-blue-400" />
          : <div className={`w-4 h-4 rounded-full border-2 ${required ? 'border-red-300' : 'border-slate-200'}`} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${doc ? 'text-slate-800' : required ? 'text-red-600' : 'text-slate-400'}`}>
          {label}
          {!doc && required && <span className="ml-1.5 text-red-400 font-normal">Missing</span>}
          {!doc && !required && <span className="ml-1.5 text-slate-300 font-normal">Not uploaded</span>}
        </p>
        {doc && (
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            {doc.name} &middot; {formatBytes(doc.sizeBytes)}
          </p>
        )}
      </div>

      {doc
        ? <button translate="no" type="button" onClick={async () => {
            const response = await fetch(`/api/admin/applications/${studentId}/documents?documentKey=${encodeURIComponent(documentKey)}`)
            const payload = await response.json().catch(() => null) as { signedUrl?: string; error?: string } | null
            if (!response.ok) throw new Error(payload?.error ?? 'Unable to open document.')
            if (payload?.signedUrl) window.open(payload.signedUrl, '_blank', 'noopener,noreferrer')
          }} className="text-[10px] font-semibold text-blue-700 hover:underline"><span>View</span></button>
        : required
          ? <XCircle size={14} className="text-red-400 flex-shrink-0" />
          : null}
    </div>
  )
}

// ─── Main Drawer ─────────────────────────────────────────────────────────────

export default function DocumentReviewDrawer({
  applicationId,
  isOpen,
  onClose,
}: DocumentReviewDrawerProps) {
  const { applications, students, updateApplicationStatus } = useMockData()

  const app    = applications.find((a) => a.id === applicationId) ?? null
  const student = students.find((s) => s.id === app?.studentId) ?? null

  // Form state for admin actions
  const [action, setAction]               = useState<AdminAction | null>(null)
  const [verifiedCgpa, setVerifiedCgpa]   = useState(app?.academic?.selfReportedCgpa ?? '')
  const [adminRemarks, setAdminRemarks]   = useState(app?.adminRemarks ?? '')
  const [correctionNotes, setCorrectionNotes] = useState(app?.correctionNotes ?? '')
  const [saving, setSaving]               = useState(false)
  const [success, setSuccess]             = useState<string | null>(null)
  const [actionError, setActionError]     = useState<string | null>(null)

  // Mark as under_review when opened (if submitted)
  useEffect(() => {
    let active = true
    if (isOpen && app?.status === 'application_submitted') {
      void updateApplicationStatus(app.id, 'under_review', {}).catch((cause: unknown) => {
        if (active) setActionError(cause instanceof Error ? cause.message : 'Unable to mark this application under review.')
      })
    }
    return () => { active = false }
  }, [isOpen, app, updateApplicationStatus])

  // Handle keyboard ESC
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleActionSubmit = async () => {
    setActionError(null)

    if (action === 'approve') {
      const cgpa = parseFloat(verifiedCgpa)
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        setActionError('Enter a valid verified CGPA between 0.00 and 10.00.')
        return
      }
    }

    if ((action === 'reject' || action === 'correction') && !adminRemarks.trim() && !correctionNotes.trim()) {
      setActionError('Please provide a reason or remarks.')
      return
    }

    setSaving(true)
    const targetStatus: StudentStatus =
      action === 'approve'    ? 'approved' :
      action === 'reject'     ? 'rejected'  :
      'correction_required'

    try {
      await updateApplicationStatus(app!.id, targetStatus, {
        adminRemarks:    adminRemarks.trim() || undefined,
        correctionNotes: correctionNotes.trim() || undefined,
        verifiedCgpa:    action === 'approve' ? parseFloat(verifiedCgpa) : undefined,
      })
      setSuccess(
        action === 'approve'    ? 'Application approved and marked as verified.'  :
        action === 'reject'     ? 'Application has been rejected.'                :
        'Correction request sent to the student.'
      )
      setAction(null)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to update the application.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Application Review"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Application Review</h2>
            {app && student && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {student.rollNo} &middot; {student.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {app && <StatusBadge status={app.status} />}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {!app || !student ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            No application selected.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* Success banner */}
            {success && (
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-800 font-medium">{success}</p>
              </div>
            )}

            {/* Previous remarks (if any) */}
            {app.adminRemarks && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[10px] font-bold uppercase text-blue-400 mb-0.5">Previous Admin Remarks</p>
                <p className="text-xs text-blue-800">{app.adminRemarks}</p>
              </div>
            )}
            {app.correctionNotes && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-[10px] font-bold uppercase text-orange-400 mb-0.5">Correction Notes Sent</p>
                <p className="text-xs text-orange-800">{app.correctionNotes}</p>
              </div>
            )}

            {/* Personal */}
            <SectionAccordion icon={User} title="Personal Details" defaultOpen>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <DataBlock label="Full Name"            value={app.personal.fullName} />
                <DataBlock label="Roll Number"          value={app.personal.rollNumber} />
                <DataBlock label="Branch"               value={app.personal.branch} />
                <DataBlock label="Academic Year"        value={app.personal.year} />
                <DataBlock label="Phone"                value={app.personal.phone} />
                <DataBlock label="Email"                value={app.personal.email} />
                <DataBlock label="Parent / Guardian"    value={app.personal.parentName} />
                <DataBlock label="Parent Phone"         value={app.personal.parentPhone} />
              </div>
            </SectionAccordion>

            {/* Academic */}
            <SectionAccordion icon={ClipboardList} title="Academic Details" defaultOpen>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                <DataBlock label="CGPA (Self-Reported)"     value={app.academic.selfReportedCgpa} />
                <DataBlock label="Verified CGPA"
                  value={app.verifiedCgpa ? String(app.verifiedCgpa) : 'Not yet verified'} />
                <DataBlock label="Prev. Sem %"              value={app.academic.previousSemPercentage} />
                <DataBlock label="Active Backlogs"          value={app.academic.activeBacklogs} />
                {app.verifiedBy && (
                  <DataBlock label="Verified By"            value={app.verifiedBy} />
                )}
                {app.verifiedAt && (
                  <DataBlock
                    label="Verified On"
                    value={new Date(app.verifiedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  />
                )}
              </div>
            </SectionAccordion>

            {/* Address */}
            <SectionAccordion icon={MapPin} title="Permanent Address">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2">
                  <DataBlock label="Street / Locality" value={app.address.permanentAddress} />
                </div>
                <DataBlock label="City"    value={app.address.city} />
                <DataBlock label="PIN Code" value={app.address.pincode} />
                <DataBlock label="State"   value={app.address.state} />
              </div>
            </SectionAccordion>

            {/* Documents */}
            <SectionAccordion icon={Paperclip} title="Documents" defaultOpen>
              <DocFileRow label="Government ID Card (Aadhaar)"       doc={app.documents.aadharCard}    required documentKey="govtPhotoId" studentId={student.id} />
              <DocFileRow label="Previous Semester Marksheet"         doc={app.documents.marksheet}     required documentKey="semesterMarksheet" studentId={student.id} />
              <DocFileRow label="Hostel / Mess Fee Receipt"           doc={app.documents.feeReceipt}    required documentKey="hostelFeeClearance" studentId={student.id} />
              <DocFileRow label="Student ID Card"                     doc={app.documents.studentIdCard} required documentKey="studentIdentityCard" studentId={student.id} />
              <DocFileRow label="Hostel ID Card"                      doc={app.documents.hostelIdCard}  required={false} documentKey="hostelIdCard" studentId={student.id} />
              {(app.documents.otherDocs ?? []).map((od) => (
                <DocFileRow key={od.label} label={od.label} doc={od.file} required={false} documentKey="otherDocument" studentId={student.id} />
              ))}
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                Document preview requires backend file storage integration. File names and sizes shown are from submission metadata.
                Future: GET /api/applications/:id/documents/:docKey → signed URL.
              </p>
            </SectionAccordion>
          </div>
        )}

        {/* ── Action Panel ── */}
        {app && app.status !== 'approved' && app.status !== 'rejected' && (
          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50">

            {/* Action picker */}
            {!action ? (
              <div className="flex items-center gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={() => { setAction('approve'); setSuccess(null) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  <CheckCircle2 size={14} />
                  Approve Application
                </button>
                <button
                  type="button"
                  onClick={() => { setAction('correction'); setSuccess(null) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                >
                  <AlertTriangle size={14} />
                  Request Correction
                </button>
                <button
                  type="button"
                  onClick={() => { setAction('reject'); setSuccess(null) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-3">
                <p className="text-xs font-bold text-slate-700">
                  {action === 'approve'    && '✅ Approve Application'}
                  {action === 'reject'     && '❌ Reject Application'}
                  {action === 'correction' && '⚠️ Request Correction from Student'}
                </p>

                {/* Verified CGPA for approval */}
                {action === 'approve' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Verified CGPA <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      className="w-48 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      placeholder="e.g. 8.76"
                      value={verifiedCgpa}
                      onChange={(e) => setVerifiedCgpa(e.target.value)}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Self-reported: {app.academic.selfReportedCgpa}
                    </p>
                  </div>
                )}

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {action === 'correction' ? 'Correction Instructions for Student' : 'Admin Remarks (internal)'}
                    {(action === 'reject' || action === 'correction') && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    placeholder={
                      action === 'correction'
                        ? 'Describe what corrections the student must make and re-upload…'
                        : action === 'reject'
                        ? 'Reason for rejection (shown to student)…'
                        : 'Optional internal notes for this approval…'
                    }
                    value={action === 'correction' ? correctionNotes : adminRemarks}
                    onChange={(e) =>
                      action === 'correction'
                        ? setCorrectionNotes(e.target.value)
                        : setAdminRemarks(e.target.value)
                    }
                  />
                </div>

                {actionError && (
                  <p className="flex items-start gap-1.5 text-xs text-red-600">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    {actionError}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleActionSubmit}
                    disabled={saving}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors disabled:opacity-60 ${
                      action === 'approve'    ? 'bg-emerald-600 hover:bg-emerald-700' :
                      action === 'correction' ? 'bg-orange-500 hover:bg-orange-600'  :
                      'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {saving && <Loader2 size={13} className="animate-spin" />}
                    {saving ? 'Saving…' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAction(null); setActionError(null) }}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Already finalized */}
        {app && (app.status === 'approved' || app.status === 'rejected') && (
          <div className={`flex-shrink-0 px-6 py-4 border-t text-xs font-semibold flex items-center gap-2 ${
            app.status === 'approved'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {app.status === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {app.status === 'approved'
              ? `Approved by ${app.verifiedBy ?? 'Admin'} · Verified CGPA: ${app.verifiedCgpa}`
              : `Rejected · ${app.adminRemarks || 'No remarks provided.'}`}
          </div>
        )}
      </div>
    </>
  )
}