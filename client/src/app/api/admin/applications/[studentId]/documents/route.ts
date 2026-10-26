import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { ApiError } from '@/services/api-error'
import { requireRole } from '@/services/auth-service'
import { prisma } from '@/lib/prisma'
import {
  createDocumentSignedUrl,
  documentKeySchema,
  getDocumentMetadata,
  type DocumentKey,
} from '@/services/document-service'

export const GET = apiRoute(async (request: NextRequest) => {
  await requireRole(request, ['ADMIN', 'WARDEN'])
  const key = documentKeySchema.safeParse(request.nextUrl.searchParams.get('documentKey'))
  if (!key.success) throw new ApiError(400, 'INVALID_DOCUMENT_KEY', 'Choose a supported document type.')
  const studentId = request.nextUrl.pathname.split('/').at(-2)
  if (!studentId) throw new ApiError(400, 'STUDENT_ID_REQUIRED', 'A student id is required.')

  const application = await prisma.application.findUnique({
    where: { studentId },
    select: { documents: true },
  })
  const metadata = getDocumentMetadata(application?.documents, key.data)
  if (!metadata) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'This document has not been uploaded.')
  return {
    key: key.data as DocumentKey,
    metadata,
    signedUrl: await createDocumentSignedUrl(metadata.path),
  }
})
