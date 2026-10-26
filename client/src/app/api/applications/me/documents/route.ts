import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { ApiError } from '@/services/api-error'
import { requireRole } from '@/services/auth-service'
import { documentKeySchema, saveDocument } from '@/services/document-service'

export const POST = apiRoute(async (request: NextRequest) => {
  const actor = await requireRole(request, ['STUDENT'])
  const student = await import('@/repositories/student-repository').then(({ findStudentProfile }) =>
    findStudentProfile(actor.id).catch((error: unknown) => {
      if (error instanceof ApiError && error.code === 'STUDENT_NOT_FOUND') return null
      throw error
    }),
  )
  if (!student) throw new ApiError(404, 'STUDENT_NOT_FOUND', 'No student profile exists for this account.')

  const form = await request.formData()
  const key = documentKeySchema.safeParse(form.get('documentKey'))
  const file = form.get('file')
  if (!key.success) throw new ApiError(400, 'INVALID_DOCUMENT_KEY', 'Choose a supported document type.')
  if (!(file instanceof File)) throw new ApiError(400, 'DOCUMENT_REQUIRED', 'A document file is required.')
  return saveDocument(student.id, key.data, file)
})
