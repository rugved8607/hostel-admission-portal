import { ApplicationStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/services/api-error'
import { serializableTransaction } from '@/repositories/transaction'

interface ApplicationSubmission {
  phone: string
  address: {
    street: string
    city: string
    state: string
    pincode: string
  }
}

export async function submitApplication(userId: string, input: ApplicationSubmission) {
  return serializableTransaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { userId },
      include: { application: true, allotment: { select: { id: true } } },
    })
    if (!student) throw new ApiError(404, 'STUDENT_NOT_FOUND', 'No student profile exists for this account.')
    if (student.allotment) {
      throw new ApiError(409, 'APPLICATION_LOCKED', 'An allotted student cannot change this application.')
    }
    if (student.application?.status === ApplicationStatus.APPROVED) {
      throw new ApiError(409, 'APPLICATION_LOCKED', 'An approved application cannot be resubmitted.')
    }

    const previousDocuments = student.application?.documents
    const existingDocuments = typeof previousDocuments === 'object' &&
      previousDocuments !== null && !Array.isArray(previousDocuments)
      ? previousDocuments as Prisma.JsonObject
      : {}
    const documents: Prisma.InputJsonObject = {
      ...existingDocuments,
      applicationDetails: {
        phone: input.phone,
        address: { ...input.address },
      },
    }
    const updatedStudent = await tx.student.update({
      where: { id: student.id },
      data: { phone: input.phone, address: input.address },
    })
    const application = await tx.application.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
        documents,
      },
      update: {
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
        adminRemarks: null,
        documents: { ...documents, applicationStatusOverride: '', correctionNotes: '' },
      },
    })
    return { ...updatedStudent, application }
  })
}

export async function listApplications() {
  const students = await prisma.student.findMany({
    include: { user: { select: { email: true } }, application: true },
    orderBy: { rollNo: 'asc' },
  })
  return students.map((student) => ({
    ...student,
    application: student.application
      ? { ...student.application, id: student.id }
      : {
          id: student.id,
          studentId: student.id,
          status: ApplicationStatus.DRAFT,
          documents: {},
          adminRemarks: null,
          submittedAt: null,
          createdAt: student.createdAt,
          updatedAt: student.createdAt,
        },
  }))
}

export async function updateApplication(
  studentId: string,
  actorId: string,
  status: 'under_review' | 'approved' | 'rejected' | 'correction_required',
  options: { adminRemarks?: string; correctionNotes?: string; verifiedCgpa?: number },
) {
  return serializableTransaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: { application: true },
    })
    if (!student) throw new ApiError(404, 'STUDENT_NOT_FOUND', 'The requested student was not found.')

    const previousDocuments = student.application?.documents
    const documents = typeof previousDocuments === 'object' && previousDocuments !== null && !Array.isArray(previousDocuments)
      ? previousDocuments as Prisma.JsonObject
      : {}
    const nextDocuments: Prisma.InputJsonObject = {
      ...documents,
      ...(status === 'correction_required' || status === 'under_review'
        ? {
            applicationStatusOverride: status,
            correctionNotes: status === 'correction_required' ? options.correctionNotes ?? '' : '',
          }
        : { applicationStatusOverride: '' }),
    }
    const databaseStatus = status === 'approved'
      ? ApplicationStatus.APPROVED
      : status === 'rejected'
        ? ApplicationStatus.REJECTED
        : ApplicationStatus.SUBMITTED
    const application = await tx.application.upsert({
      where: { studentId },
      create: {
        studentId,
        status: databaseStatus,
        submittedAt: new Date(),
        adminRemarks: options.adminRemarks,
        documents: nextDocuments,
      },
      update: {
        status: databaseStatus,
        adminRemarks: options.adminRemarks,
        documents: nextDocuments,
      },
    })
    if (status === 'approved' && options.verifiedCgpa !== undefined) {
      await tx.student.update({ where: { id: studentId }, data: { cgpa: options.verifiedCgpa } })
    }
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'APPLICATION_STATUS_UPDATED',
        entity: 'Application',
        entityId: application.id,
        details: {
          studentId,
          status,
          adminRemarks: options.adminRemarks ?? '',
          correctionNotes: options.correctionNotes ?? '',
          verifiedCgpa: options.verifiedCgpa ?? null,
        },
      },
    })
    return application
  })
}
