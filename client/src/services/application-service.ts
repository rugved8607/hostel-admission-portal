import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/services/auth-service'
import * as applications from '@/repositories/application-repository'

export const studentSubmissionSchema = z.object({
  phone: z.string().trim().min(7).max(30),
  address: z.object({
    street: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    pincode: z.string().trim().min(4).max(12),
  }).strict(),
}).strict()

export const applicationUpdateSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected', 'correction_required']),
  adminRemarks: z.string().trim().max(2000).optional(),
  correctionNotes: z.string().trim().max(2000).optional(),
  verifiedCgpa: z.number().min(0).max(10).optional(),
}).strict().superRefine((value, context) => {
  if (value.status === 'approved' && value.verifiedCgpa === undefined) {
    context.addIssue({ code: 'custom', path: ['verifiedCgpa'], message: 'Verified CGPA is required for approval.' })
  }
  if (value.status === 'correction_required' && !value.correctionNotes?.trim() && !value.adminRemarks?.trim()) {
    context.addIssue({ code: 'custom', path: ['correctionNotes'], message: 'A correction reason is required.' })
  }
  if (value.status === 'rejected' && !value.adminRemarks?.trim()) {
    context.addIssue({ code: 'custom', path: ['adminRemarks'], message: 'A rejection reason is required.' })
  }
})

export async function getStudentApplication(request: NextRequest) {
  const actor = await requireRole(request, ['STUDENT'])
  return applications.getApplicationStatus(actor.id)
}

export async function submitStudentApplication(request: NextRequest, input: unknown) {
  const actor = await requireRole(request, ['STUDENT'])
  const parsed = studentSubmissionSchema.parse(input)
  return applications.submitApplication(actor.id, parsed)
}

export async function listAdminApplications(request: NextRequest) {
  await requireRole(request, ['ADMIN', 'WARDEN'])
  return applications.listApplications()
}

export async function updateAdminApplication(
  request: NextRequest,
  studentId: string,
  input: unknown,
) {
  const actor = await requireRole(request, ['ADMIN', 'WARDEN'])
  const parsed = applicationUpdateSchema.parse(input)
  return applications.updateApplication(studentId, actor.id, parsed.status, parsed)
}
