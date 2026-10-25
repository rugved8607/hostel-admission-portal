import {
  GroupStatus,
  Prisma,
  RoomStatus,
  RoundStatus,
  type TieBreakRule,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/services/api-error'
import { serializableTransaction } from '@/repositories/transaction'
import {
  allocationAlreadyComplete,
  planAllocation,
  type AllocationGroup,
} from '@/services/allocation-service'
import { allotmentCancellationAudit } from '@/services/group-rules'

type Transaction = Prisma.TransactionClient

async function writeRoundAudit(
  tx: Transaction,
  actorId: string,
  roundId: string,
  action: string,
  details: Prisma.InputJsonObject = {},
) {
  await tx.auditLog.create({
    data: { actorId, action, entity: 'AllocationRound', entityId: roundId, details },
  })
}

async function lockRound(tx: Transaction, roundId: string) {
  const rows = await tx.$queryRaw<{ id: string; status: RoundStatus; formationDeadline: Date | null }[]>`
    SELECT "id", "status", "formationDeadline" FROM "AllocationRound" WHERE "id" = ${roundId} FOR UPDATE
  `
  const round = rows[0]
  if (!round) throw new ApiError(404, 'ROUND_NOT_FOUND', 'The requested round was not found.')
  return round
}

export async function listRounds() {
  return prisma.allocationRound.findMany({
    orderBy: { number: 'desc' },
    include: {
      _count: { select: { groups: true, snapshots: true, allotments: true } },
    },
  })
}

export async function getRound(roundId: string) {
  const round = await prisma.allocationRound.findUnique({
    where: { id: roundId },
    include: {
      snapshots: { orderBy: { rank: 'asc' } },
      groups: {
        where: { status: { in: [GroupStatus.SUBMITTED, GroupStatus.ALLOTTED, GroupStatus.UNALLOTTED] } },
        include: {
          members: { include: { student: { select: { id: true, name: true, rollNo: true, cgpa: true, gender: true } } } },
          room: { include: { block: { include: { hostel: true } } } },
        },
      },
    },
  })
  if (!round) throw new ApiError(404, 'ROUND_NOT_FOUND', 'The requested round was not found.')
  return round
}

export async function createRoundDraft(
  formationDeadline: Date,
  tieBreakRule: TieBreakRule,
  actorId: string,
) {
  return serializableTransaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(781239412)`
    const latest = await tx.allocationRound.findFirst({ orderBy: { number: 'desc' } })
    if (latest &&
        latest.status !== RoundStatus.PUBLISHED &&
        latest.status !== RoundStatus.CLOSED) {
      throw new ApiError(409, 'INVALID_ROUND_STATE', 'The current round must be published or closed before starting another.')
    }
    const round = await tx.allocationRound.create({
      data: {
        number: (latest?.number ?? 0) + 1,
        status: RoundStatus.DRAFT,
        formationDeadline,
        tieBreakRule,
      },
    })
    await writeRoundAudit(tx, actorId, round.id, 'ROUND_DRAFT_CREATED', {
      number: round.number,
      formationDeadline: formationDeadline.toISOString(),
      tieBreakRule,
    })
    return round
  })
}

export async function updateRoundSettings(
  roundId: string,
  formationDeadline: Date,
  tieBreakRule: TieBreakRule,
  actorId: string,
) {
  return serializableTransaction(async (tx) => {
    const round = await lockRound(tx, roundId)
    if (round.status !== RoundStatus.DRAFT && round.status !== RoundStatus.FORMATION_OPEN) {
      throw new ApiError(409, 'INVALID_ROUND_STATE', 'Round settings can only be changed before formation closes.')
    }
    const updated = await tx.allocationRound.update({
      where: { id: roundId },
      data: { formationDeadline, tieBreakRule },
    })
    await writeRoundAudit(tx, actorId, roundId, 'ROUND_SETTINGS_UPDATED', {
      formationDeadline: formationDeadline.toISOString(),
      tieBreakRule,
    })
    return updated
  })
}

export async function openRound(roundId: string, actorId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockRound(tx, roundId)
    if (round.status !== RoundStatus.DRAFT) {
      throw new ApiError(409, 'INVALID_ROUND_STATE', 'Only a draft round can be opened.')
    }
    if (round.formationDeadline && round.formationDeadline <= new Date()) {
      throw new ApiError(409, 'FORMATION_DEADLINE_PASSED', 'The formation deadline must be in the future.')
    }
    const opened = await tx.allocationRound.update({
      where: { id: roundId },
      data: { status: RoundStatus.FORMATION_OPEN, startedAt: new Date() },
    })
    await writeRoundAudit(tx, actorId, roundId, 'ROUND_FORMATION_OPENED')
    return opened
  })
}

export async function closeFormation(roundId: string, actorId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockRound(tx, roundId)
    if (round.status !== RoundStatus.FORMATION_OPEN) {
      throw new ApiError(409, 'INVALID_ROUND_STATE', 'Only an open formation round can be closed.')
    }
    const closed = await tx.allocationRound.update({
      where: { id: roundId },
      data: { status: RoundStatus.FORMATION_CLOSED },
    })
    await writeRoundAudit(tx, actorId, roundId, 'ROUND_FORMATION_CLOSED')
    return closed
  })
}

export async function allocateRound(roundId: string, actorId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockRound(tx, roundId)
    if (allocationAlreadyComplete(round.status)) {
      return { roundId, status: round.status, alreadyAllocated: true, results: [] }
    }
    if (round.status !== RoundStatus.FORMATION_CLOSED) {
      throw new ApiError(409, 'INVALID_ROUND_STATE', 'Formation must be closed before allocation.')
    }

    const groupLocks = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "StudentGroup"
      WHERE "roundId" = ${roundId} AND "status" = 'SUBMITTED'
      ORDER BY "id" FOR UPDATE
    `
    const groupIds = groupLocks.map((group) => group.id)
    if (groupIds.length) {
      await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Student"
        WHERE "id" IN (
          SELECT "studentId" FROM "GroupMember" WHERE "groupId" IN (${Prisma.join(groupIds)})
        )
        ORDER BY "id" FOR UPDATE
      `
    }
    const roomLocks = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Room"
      WHERE "status" = 'AVAILABLE' AND "allottedGroupId" IS NULL
      ORDER BY "id" FOR UPDATE
    `
    const groups = await tx.studentGroup.findMany({
      where: { id: { in: groupIds } },
      include: {
        members: {
          include: {
            student: { select: { id: true, name: true, rollNo: true, cgpa: true, gender: true } },
          },
        },
      },
    })
    const rooms = await tx.room.findMany({
      where: { id: { in: roomLocks.map((room) => room.id) } },
      include: { block: { include: { hostel: { select: { gender: true } } } } },
      orderBy: { roomNumber: 'asc' },
    })
    const roundSettings = await tx.allocationRound.findUniqueOrThrow({ where: { id: roundId } })
    const allocationPlan = planAllocation(
      groups.map((group): AllocationGroup => ({
        id: group.id,
        createdAt: group.createdAt,
        preferences: group.preferences,
        members: group.members.map(({ student }) => student),
      })),
      rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        capacity: room.capacity,
        gender: room.block.hostel.gender,
      })),
      roundSettings.tieBreakRule,
    )
    const results = []

    for (const group of allocationPlan) {
      const room = group.room
      const reason = group.reason

      if (room) {
        await tx.room.update({
          where: { id: room.id },
          data: { allottedGroupId: group.id, status: RoomStatus.OCCUPIED },
        })
        await tx.allotment.createMany({
          data: group.members.map((member) => ({
            roomId: room.id,
            studentId: member.id,
            groupId: group.id,
            roundId,
          })),
        })
      }

      await tx.studentGroup.update({
        where: { id: group.id },
        data: {
          averageCgpa: group.averageCgpa,
          maxIndividualCgpa: group.maxCgpa,
          status: room ? GroupStatus.ALLOTTED : GroupStatus.UNALLOTTED,
        },
      })
      const result = group.result
      await tx.roundGroupSnapshot.create({
        data: {
          roundId,
          groupId: group.id,
          groupSize: group.members.length,
          averageCgpa: group.averageCgpa,
          maxCgpa: group.maxCgpa,
          rank: group.rank,
          tieBreakNote: group.tieBreakNote,
          preferences: group.preferences,
          members: group.members.map(({ id, name, rollNo, cgpa, gender }) => ({ id, name, rollNo, cgpa, gender })),
          result,
          roomId: room?.id,
          reason,
        },
      })
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ROUND_GROUP_ALLOCATION',
          entity: 'StudentGroup',
          entityId: group.id,
          details: { roundId, rank: group.rank, result, roomId: room?.id ?? null, reason },
        },
      })
      results.push({ groupId: group.id, rank: group.rank, result, roomId: room?.id ?? null, reason })
    }

    await tx.allocationRound.update({
      where: { id: roundId },
      data: { status: RoundStatus.ALLOCATED },
    })
    return { roundId, status: RoundStatus.ALLOCATED, alreadyAllocated: false, results }
  })
}

export async function publishRound(roundId: string, actorId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockRound(tx, roundId)
    if (round.status !== RoundStatus.ALLOCATED) {
      throw new ApiError(409, 'INVALID_ROUND_STATE', 'Only an allocated round can be published.')
    }
    const published = await tx.allocationRound.update({
      where: { id: roundId },
      data: { status: RoundStatus.PUBLISHED, publishedAt: new Date() },
    })
    await writeRoundAudit(tx, actorId, roundId, 'ROUND_PUBLISHED')
    return published
  })
}

export async function closeRound(roundId: string, actorId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockRound(tx, roundId)
    if (round.status !== RoundStatus.PUBLISHED) {
      throw new ApiError(409, 'INVALID_ROUND_STATE', 'Only a published round can be closed.')
    }
    const closed = await tx.allocationRound.update({
      where: { id: roundId },
      data: { status: RoundStatus.CLOSED, closedAt: new Date() },
    })
    await writeRoundAudit(tx, actorId, roundId, 'ROUND_CLOSED')
    return closed
  })
}

export async function cancelAllotment(roundId: string, groupId: string, actorId: string, reason: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockRound(tx, roundId)
    if (round.status !== RoundStatus.ALLOCATED &&
        round.status !== RoundStatus.PUBLISHED &&
        round.status !== RoundStatus.CLOSED) {
      throw new ApiError(409, 'INVALID_ROUND_STATE', 'Allotments can only be cancelled after allocation.')
    }
    const groupLocks = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "StudentGroup" WHERE "id" = ${groupId} FOR UPDATE
    `
    if (!groupLocks.length) throw new ApiError(404, 'GROUP_NOT_FOUND', 'The requested group was not found.')
    const group = await tx.studentGroup.findUnique({
      where: { id: groupId },
      include: { members: true, room: true },
    })
    if (!group || group.status !== GroupStatus.ALLOTTED || group.roundId !== roundId || !group.room) {
      throw new ApiError(409, 'ALLOTMENT_NOT_FOUND', 'The group has no allotment in this round.')
    }
    const studentIds = group.members.map((member) => member.studentId)
    if (studentIds.length) {
      await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Student" WHERE "id" IN (${Prisma.join(studentIds)}) ORDER BY "id" FOR UPDATE
      `
    }
    await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Room" WHERE "id" = ${group.room.id} FOR UPDATE
    `
    await tx.allotment.deleteMany({ where: { groupId, roundId } })
    await tx.room.update({
      where: { id: group.room.id },
      data: { allottedGroupId: null, status: RoomStatus.AVAILABLE },
    })
    await tx.groupMember.deleteMany({ where: { groupId } })
    const dissolved = await tx.studentGroup.update({
      where: { id: groupId },
      data: { status: GroupStatus.DISSOLVED, dissolvedAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        actorId,
        entityId: groupId,
        ...allotmentCancellationAudit(roundId, group.room.id, reason),
      },
    })
    return dissolved
  })
}

export async function listUnallottedStudents() {
  const groups = await prisma.studentGroup.findMany({
    where: { status: GroupStatus.UNALLOTTED },
    include: {
      round: { select: { number: true, status: true } },
      members: {
        include: {
          student: {
            select: {
              id: true, name: true, rollNo: true, cgpa: true, gender: true,
              allotment: { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: [{ round: { number: 'desc' } }, { averageCgpa: 'desc' }],
  })
  const snapshots = await prisma.roundGroupSnapshot.findMany({
    where: { groupId: { in: groups.map(({ id }) => id) }, result: 'UNALLOTTED' },
    orderBy: { createdAt: 'desc' },
  })
  return groups.map((group) => ({
    ...group,
    outcome: snapshots.find((snapshot) => snapshot.groupId === group.id) ?? null,
    nextStep: 'Members may leave and reform into a group of 3 or 4 in the next round.',
  }))
}

export async function listAvailableRooms() {
  return prisma.room.findMany({
    where: { status: RoomStatus.AVAILABLE, allottedGroupId: null },
    include: {
      block: { include: { hostel: { select: { id: true, name: true, gender: true } } } },
    },
    orderBy: [{ block: { hostel: { name: 'asc' } } }, { block: { name: 'asc' } }, { floor: 'asc' }, { roomNumber: 'asc' }],
  })
}

export async function listAuditLog() {
  return prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })
}
