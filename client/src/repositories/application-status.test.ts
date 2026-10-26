import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApplicationStatus } from '@prisma/client'

const prismaMock = vi.hoisted(() => ({
  student: { findUnique: vi.fn() },
  application: { upsert: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { getApplicationStatus } from './application-repository'

describe('getApplicationStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a DRAFT application when the student has no application row', async () => {
    prismaMock.student.findUnique.mockResolvedValue({ id: 'student-1', application: null })
    prismaMock.application.upsert.mockResolvedValue({
      id: 'application-1',
      studentId: 'student-1',
      status: ApplicationStatus.DRAFT,
      adminRemarks: null,
      documents: {},
    })

    const result = await getApplicationStatus('user-1')

    expect(prismaMock.application.upsert).toHaveBeenCalledWith({
      where: { studentId: 'student-1' },
      create: { studentId: 'student-1', status: ApplicationStatus.DRAFT, documents: {} },
      update: {},
    })
    expect(result).toMatchObject({
      status: ApplicationStatus.DRAFT,
      adminRemarks: null,
      documents: {},
    })
  })
})
