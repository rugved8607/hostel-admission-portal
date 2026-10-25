import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupStatus, RoomStatus, RoundStatus } from '@prisma/client'

const prismaMock = vi.hoisted(() => ({ $transaction: vi.fn() }))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { allocateRound, cancelAllotment } from './round-repository'
import { joinGroup, leaveGroup } from './group-repository'

function transactionClient(
  queries: unknown[][],
  overrides: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {},
) {
  const tx = {
    $queryRaw: vi.fn(async () => queries.shift() ?? []),
    allotment: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      ...overrides.allotment,
    },
    groupMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      ...overrides.groupMember,
    },
    student: {
      findUniqueOrThrow: vi.fn(),
      ...overrides.student,
    },
    studentGroup: {
      findUnique: vi.fn(),
      update: vi.fn(),
      ...overrides.studentGroup,
    },
    room: {
      findMany: vi.fn(),
      update: vi.fn(),
      ...overrides.room,
    },
    allocationRound: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      ...overrides.allocationRound,
    },
    roundGroupSnapshot: {
      create: vi.fn(),
      ...overrides.roundGroupSnapshot,
    },
    auditLog: {
      create: vi.fn(),
      ...overrides.auditLog,
    },
  }
  prismaMock.$transaction.mockImplementation(async (callback) => callback(tx))
  return tx
}

describe('transactional group and allotment workflows', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects an allotted student trying to join another group', async () => {
    const tx = transactionClient(
      [
        [{ id: 'round-1', formationDeadline: null }],
        [{ id: 'student-1' }],
        [{ id: 'group-1' }],
      ],
      {
        allotment: { findUnique: vi.fn().mockResolvedValue({ id: 'allotment-1' }) },
        groupMember: { findUnique: vi.fn().mockResolvedValue(null) },
      },
    )

    await expect(joinGroup('user-1', 'group-1')).rejects.toMatchObject({
      code: 'STUDENT_ALREADY_ALLOTTED',
      status: 409,
    })
    expect(tx.groupMember.create).not.toHaveBeenCalled()
  })

  it('makes a group with two members invalid for submission after a leave', async () => {
    const members = [
      {
        studentId: 'student-1',
        isLeader: true,
        student: { cgpa: 9, rollNo: '1001', gender: 'MALE' },
      },
      {
        studentId: 'student-2',
        isLeader: false,
        student: { cgpa: 8, rollNo: '1002', gender: 'MALE' },
      },
      {
        studentId: 'student-3',
        isLeader: false,
        student: { cgpa: 7, rollNo: '1003', gender: 'MALE' },
      },
    ]
    const tx = transactionClient(
      [
        [{ id: 'round-1', formationDeadline: null }],
        [{ id: 'student-1' }],
        [{ id: 'group-1' }],
      ],
      {
        studentGroup: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'group-1',
            roundId: 'round-1',
            status: GroupStatus.SUBMITTED,
            members,
          }),
          update: vi.fn().mockResolvedValue({ id: 'group-1', status: GroupStatus.FORMING }),
        },
        groupMember: {
          delete: vi.fn(),
          update: vi.fn(),
        },
      },
    )
    tx.groupMember.findMany.mockResolvedValue(
      members.slice(1).map((member) => ({ ...member, student: { cgpa: member.student.cgpa } })),
    )

    const result = await leaveGroup('user-1', 'group-1')

    expect(result).toMatchObject({ id: 'group-1', status: GroupStatus.FORMING })
    expect(tx.studentGroup.update).toHaveBeenLastCalledWith({
      where: { id: 'group-1' },
      data: { status: GroupStatus.FORMING },
    })
  })

  it('cancels an allotment atomically and records the required audit reason', async () => {
    const tx = transactionClient(
      [
        [{ id: 'round-1', status: RoundStatus.ALLOCATED, formationDeadline: null }],
        [{ id: 'group-1' }],
        [{ id: 'student-1' }, { id: 'student-2' }, { id: 'student-3' }],
        [{ id: 'room-1' }],
      ],
      {
        studentGroup: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'group-1',
            roundId: 'round-1',
            status: GroupStatus.ALLOTTED,
            members: [
              { studentId: 'student-1' },
              { studentId: 'student-2' },
              { studentId: 'student-3' },
            ],
            room: { id: 'room-1' },
          }),
          update: vi.fn().mockResolvedValue({ id: 'group-1', status: GroupStatus.DISSOLVED }),
        },
        auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
      },
    )

    await cancelAllotment('round-1', 'group-1', 'admin-user', 'Eligibility review approved')

    expect(tx.allotment.deleteMany).toHaveBeenCalledWith({
      where: { groupId: 'group-1', roundId: 'round-1' },
    })
    expect(tx.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { allottedGroupId: null, status: 'AVAILABLE' },
    })
    expect(tx.groupMember.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } })
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'admin-user',
        entityId: 'group-1',
        action: 'ALLOTMENT_CANCELLED',
        entity: 'StudentGroup',
        details: {
          roundId: 'round-1',
          roomId: 'room-1',
          reason: 'Eligibility review approved',
        },
      },
    })
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
  })

  it('serializes concurrent allocation requests and persists only one result', async () => {
    let roundStatus: RoundStatus = RoundStatus.FORMATION_CLOSED
    let queue = Promise.resolve()
    let allocatedStudentCount = 0
    let snapshotCount = 0
    const tx = {
      $queryRaw: vi.fn(async (parts: TemplateStringsArray) => {
        const sql = parts.join('')
        expect(sql).toContain('FOR UPDATE')
        if (sql.includes('"AllocationRound"')) {
          return [{ id: 'round-1', status: roundStatus, formationDeadline: null }]
        }
        if (sql.includes('"StudentGroup"')) return [{ id: 'group-1' }]
        if (sql.includes('"Student"')) {
          return [
            { id: 'student-1' },
            { id: 'student-2' },
            { id: 'student-3' },
            { id: 'student-4' },
          ]
        }
        if (sql.includes('"Room"')) return [{ id: 'room-1' }]
        return []
      }),
      studentGroup: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'group-1',
          createdAt: new Date('2026-10-20T10:00:00.000Z'),
          preferences: [],
          members: [1, 2, 3, 4].map((number) => ({
            student: {
              id: `student-${number}`,
              name: `Student ${number}`,
              rollNo: `100${number}`,
              cgpa: 8 + number / 10,
              gender: 'MALE',
            },
          })),
        }]),
        update: vi.fn(),
      },
      room: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'room-1',
          roomNumber: 'A101',
          capacity: 4,
          block: { hostel: { gender: 'MALE' } },
        }]),
        update: vi.fn(),
      },
      allocationRound: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          tieBreakRule: 'MAX_CGPA_THEN_ROLL_NO',
        }),
        update: vi.fn(async ({ data }: { data: { status: RoundStatus } }) => {
          roundStatus = data.status
        }),
      },
      allotment: {
        createMany: vi.fn(async ({ data }: { data: unknown[] }) => {
          allocatedStudentCount += data.length
        }),
      },
      roundGroupSnapshot: {
        create: vi.fn(async () => {
          snapshotCount += 1
        }),
      },
      auditLog: { create: vi.fn() },
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      const previous = queue
      let release = () => {}
      queue = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      try {
        return await callback(tx)
      } finally {
        release()
      }
    })

    const results = await Promise.all([
      allocateRound('round-1', 'admin-user'),
      allocateRound('round-1', 'admin-user'),
    ])

    expect(results.filter((result) => result.alreadyAllocated)).toHaveLength(1)
    expect(results.filter((result) => !result.alreadyAllocated)).toHaveLength(1)
    expect(allocatedStudentCount).toBe(4)
    expect(snapshotCount).toBe(1)
    expect(tx.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { allottedGroupId: 'group-1', status: RoomStatus.OCCUPIED },
    })
  })
})
