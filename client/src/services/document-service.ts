import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { ApiError } from '@/services/api-error'
import { prisma } from '@/lib/prisma'

export const documentKeySchema = z.enum([
  'govtPhotoId',
  'semesterMarksheet',
  'hostelFeeClearance',
  'studentIdentityCard',
])

export type DocumentKey = z.infer<typeof documentKeySchema>

export const documentLabels: Record<DocumentKey, string> = {
  govtPhotoId: 'Govt Photo ID',
  semesterMarksheet: 'Semester Marksheet',
  hostelFeeClearance: 'Hostel Fee Clearance',
  studentIdentityCard: 'Student Identity Card',
}

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png'])

export function getDocumentMetadata(documents: unknown, key: DocumentKey) {
  if (!documents || typeof documents !== 'object' || Array.isArray(documents)) return null
  const value = (documents as Record<string, unknown>)[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const metadata = value as Record<string, unknown>
  if (typeof metadata.path !== 'string' || typeof metadata.name !== 'string') return null
  return metadata as {
    path: string
    name: string
    mimeType: string
    sizeBytes: number
  }
}

export async function saveDocument(
  studentId: string,
  key: DocumentKey,
  file: File,
) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new ApiError(400, 'INVALID_DOCUMENT_TYPE', 'Only PDF, JPG, and PNG documents are accepted.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(400, 'DOCUMENT_TOO_LARGE', 'Each document must be no larger than 5 MB.')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new ApiError(500, 'DOCUMENT_STORAGE_NOT_CONFIGURED', 'Document storage is not configured.')
  }

  const storage = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage
  const extension = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${studentId}/${key}.${extension}`
  const { error: uploadError } = await storage
    .from('documents')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (uploadError) throw uploadError

  const metadata = {
    path,
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  }
  const application = await prisma.application.findUnique({
    where: { studentId },
    select: { documents: true },
  })
  const documents = application?.documents && typeof application.documents === 'object' && !Array.isArray(application.documents)
    ? application.documents as Prisma.JsonObject
    : {}
  await prisma.application.upsert({
    where: { studentId },
    create: { studentId, documents: { ...documents, [key]: metadata } },
    update: { documents: { ...documents, [key]: metadata } },
  })

  return { key, metadata, signedUrl: await createDocumentSignedUrl(path) }
}

export async function createDocumentSignedUrl(path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new ApiError(500, 'DOCUMENT_STORAGE_NOT_CONFIGURED', 'Document storage is not configured.')
  }
  const storage = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage
  const { data, error } = await storage.from('documents').createSignedUrl(path, 15 * 60)
  if (error || !data) throw error ?? new ApiError(404, 'DOCUMENT_NOT_FOUND', 'The requested document was not found.')
  return data.signedUrl
}
