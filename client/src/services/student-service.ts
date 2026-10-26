import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { ApiError } from '@/services/api-error'
import { requireRole } from '@/services/auth-service'
import {
  findStudentByRollNo,
  findStudentProfile,
  listFormingGroups,
  listStudentRooms,
} from '@/repositories/student-repository'

const lookupSchema = z.object({ rollNo: z.string().trim().min(1).max(32) }).strict()

export async function getStudentProfile(request: NextRequest) {
  const actor = await requireRole(request, ['STUDENT'])
  return findStudentProfile(actor.id)
}

export async function lookupStudent(request: NextRequest) {
  lookupSchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  const rollNo = request.nextUrl.searchParams.get('rollNo')?.trim().toUpperCase()
  if (!rollNo) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'A roll number is required.')
  }
  const student = await findStudentByRollNo(rollNo)
  if (!student) {
    throw new ApiError(404, 'STUDENT_NOT_FOUND', 'Student credentials could not be verified.')
  }
  return { email: student.user.email }
}

export async function getFormingGroups(request: NextRequest) {
  await requireRole(request, ['STUDENT'])
  return listFormingGroups()
}

export async function getStudentRooms(request: NextRequest) {
  const actor = await requireRole(request, ['STUDENT'])
  const student = await findStudentProfile(actor.id)
  return listStudentRooms(student.gender)
}
