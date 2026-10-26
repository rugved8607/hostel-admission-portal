import { GroupStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/services/api-error'
import { serializableTransaction } from '@/repositories/transaction'
import {
  canStudentJoinGroup,
  isValidGroupSize,
  statusAfterMemberLeaves,
} from '@/services/group-rules'

type Transaction = Prisma.TransactionClient

async function lockOpenRound(tx: Transaction) {
  const rows = await tx.$queryRaw<{ id: string; formationDeadline: Date | null }[]>`
    SELECT "id", "formationDeadline"
    FROM "AllocationRound"
    WHERE "status" = 'FORMATION_OPEN'
    ORDER BY "number" DESC
    LIMIT 1
    FOR UPDATE
  `
  const round = rows[0]
  if (!round) {
    throw new ApiError(409, 'FORMATION_CLOSED', 'There is no open group-formation round.')
  }
  if (round.formationDeadline && round.formationDeadline <= new Date()) {
    throw new ApiError(409, 'FORMATION_DEADLINE_PASSED', 'The group-formation deadline has passed.')
  }
  return round
}

async function lockStudent(tx: Transaction, userId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Student" WHERE "userId" = ${userId} FOR UPDATE
  `
  if (!rows[0]) {
    throw new ApiError(404, 'STUDENT_NOT_FOUND', 'No student profile exists for this account.')
  }
  return rows[0].id
}

async function lockGroup(tx: Transaction, groupId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "StudentGroup" WHERE "id" = ${groupId} FOR UPDATE
  `
  if (!rows[0]) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', 'The requested group was not found.')
  }
}

async function assertCanJoinGroup(tx: Transaction, studentId: string) {
  const allotment = await tx.allotment.findUnique({ where: { studentId }, select: { id: true } })
  const membership = await tx.groupMember.findUnique({ where: { studentId }, select: { id: true } })
  if (!canStudentJoinGroup(Boolean(allotment), Boolean(membership))) {
    if (allotment) {
      throw new ApiError(409, 'STUDENT_ALREADY_ALLOTTED', 'Allotted students cannot join another group.')
    }
    throw new ApiError(409, 'ALREADY_IN_GROUP', 'Leave or dissolve your current group before joining another.')
  }
  const application = await tx.application.findUnique({
    where: { studentId },
    select: { status: true },
  })
  if (application?.status !== 'APPROVED') {
    throw new ApiError(403, 'APPLICATION_NOT_APPROVED', 'Your hostel application must be approved before forming or joining a group.')
  }
}

async function refreshMetrics(tx: Transaction, groupId: string) {
  const members = await tx.groupMember.findMany({
    where: { groupId },
    include: { student: { select: { cgpa: true } } },
  })
  const total = members.reduce((sum, member) => sum + member.student.cgpa, 0)
  const averageCgpa = members.length ? total / members.length : 0
  const maxIndividualCgpa = members.length
    ? Math.max(...members.map((member) => member.student.cgpa))
    : 0

  return tx.studentGroup.update({
    where: { id: groupId },
    data: { averageCgpa, maxIndividualCgpa },
  })
}

async function requireCurrentGroup(
  tx: Transaction,
  groupId: string,
  currentRoundId: string,
  options: { allowUnallotted?: boolean } = {},
) {
  const group = await tx.studentGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { student: true } } },
  })
  if (!group) throw new ApiError(404, 'GROUP_NOT_FOUND', 'The requested group was not found.')
  if (group.status === GroupStatus.ALLOTTED || group.status === GroupStatus.DISSOLVED) {
    throw new ApiError(409, 'INVALID_GROUP_STATE', 'This group can no longer be changed.')
  }
  if (group.roundId !== currentRoundId &&
      !(options.allowUnallotted && group.status === GroupStatus.UNALLOTTED)) {
    throw new ApiError(409, 'GROUP_FROM_ANOTHER_ROUND', 'Create a new group for the current round.')
  }
  return group
}

export async function findStudentGroup(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      allotment: { select: { id: true } },
      groupMember: {
        include: {
          group: {
            include: {
              members: {
                include: {
                  student: {
                    select: { id: true, name: true, rollNo: true, branch: true, year: true, cgpa: true, gender: true },
                  },
                },
                orderBy: { student: { rollNo: 'asc' } },
              },
              round: { select: { number: true, status: true, formationDeadline: true } },
              room: { select: { id: true, roomNumber: true } },
            },
          },
        },
      },
    },
  })
  if (!student) throw new ApiError(404, 'STUDENT_NOT_FOUND', 'No student profile exists for this account.')
  const group = student.groupMember?.group ?? null

  if (group) {
    return {
      group,
      allocation: group.status === GroupStatus.UNALLOTTED
        ? { status: 'UNALLOTTED', nextStep: 'Form a new group when the next round opens.' }
        : group.status === GroupStatus.ALLOTTED
          ? { status: 'ALLOTTED', nextStep: null }
          : { status: 'PENDING', nextStep: null },
    }
  }
  if (student.allotment) {
    return { group: null, allocation: { status: 'ALLOTTED', nextStep: null } }
  }

  const previousOutcomes = await prisma.$queryRaw<{ groupId: string; result: string }[]>`
    SELECT "groupId", "result"
    FROM "RoundGroupSnapshot"
    WHERE "members" @> ${JSON.stringify([{ id: student.id }])}::jsonb
      AND "result" IN ('UNALLOTTED', 'ALLOTTED')
    ORDER BY "createdAt" DESC
    LIMIT 1
  `
  const previousOutcome = previousOutcomes[0]

  if (previousOutcome?.result === 'UNALLOTTED') {
    return {
      group: null,
      allocation: {
        status: 'UNALLOTTED',
        nextStep: 'Form or join a new group when the next round opens.',
      },
    }
  }

  if (previousOutcome?.result === 'ALLOTTED') {
    const cancellation = await prisma.auditLog.findFirst({
      where: { action: 'ALLOTMENT_CANCELLED', entityId: previousOutcome.groupId },
      select: { id: true },
    })
    if (cancellation) {
      return {
        group: null,
        allocation: {
          status: 'CANCELLED',
          nextStep: 'Form or join a new group when the next round opens.',
        },
      }
    }
  }

  return { group: null, allocation: { status: 'NOT_ALLOTTED', nextStep: null } }
}

export async function createGroup(userId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockOpenRound(tx)
    const studentId = await lockStudent(tx, userId)
    await assertCanJoinGroup(tx, studentId)

    const group = await tx.studentGroup.create({
      data: {
        roundId: round.id,
        members: { create: { studentId, isLeader: true } },
      },
      include: { members: { include: { student: true } } },
    })
    await refreshMetrics(tx, group.id)
    return group
  })
}

export async function joinGroup(userId: string, groupId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockOpenRound(tx)
    const studentId = await lockStudent(tx, userId)
    await lockGroup(tx, groupId)
    await assertCanJoinGroup(tx, studentId)
    const group = await requireCurrentGroup(tx, groupId, round.id)
    const student = await tx.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { gender: true },
    })
    if (group.status !== GroupStatus.FORMING || group.members.length >= 4) {
      throw new ApiError(409, 'GROUP_FULL_OR_LOCKED', 'This group is full or no longer accepting members.')
    }
    if (group.members.some((member) => member.student.gender !== student.gender)) {
      throw new ApiError(409, 'GENDER_MISMATCH', 'Students in a group must have the same gender.')
    }

    await tx.groupMember.create({ data: { studentId, groupId } })
    return refreshMetrics(tx, groupId)
  })
}

export async function leaveGroup(userId: string, groupId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockOpenRound(tx)
    const studentId = await lockStudent(tx, userId)
    await lockGroup(tx, groupId)
    const group = await requireCurrentGroup(tx, groupId, round.id, { allowUnallotted: true })
    const membership = group.members.find((member) => member.studentId === studentId)
    if (!membership) throw new ApiError(403, 'NOT_A_GROUP_MEMBER', 'You are not a member of this group.')

    await tx.groupMember.delete({ where: { studentId } })
    const remaining = group.members.filter((member) => member.studentId !== studentId)
    const nextStatus = statusAfterMemberLeaves(group.status, remaining.length)
    if (nextStatus === GroupStatus.DISSOLVED) {
      return tx.studentGroup.update({
        where: { id: groupId },
        data: { status: GroupStatus.DISSOLVED, dissolvedAt: new Date(), averageCgpa: 0, maxIndividualCgpa: 0 },
      })
    }

    if (membership.isLeader) {
      const nextLeader = [...remaining].sort((left, right) =>
        left.student.rollNo.localeCompare(right.student.rollNo),
      )[0]
      if (nextLeader) {
        await tx.groupMember.update({
          where: { studentId: nextLeader.studentId },
          data: { isLeader: true },
        })
      }
    }

    const update = await refreshMetrics(tx, groupId)
    if (nextStatus !== group.status) {
      return tx.studentGroup.update({
        where: { id: groupId },
        data: { status: nextStatus },
      })
    }
    return update
  })
}

export async function dissolveGroup(userId: string, groupId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockOpenRound(tx)
    const studentId = await lockStudent(tx, userId)
    await lockGroup(tx, groupId)
    const group = await requireCurrentGroup(tx, groupId, round.id, { allowUnallotted: true })
    if (!group.members.some((member) => member.studentId === studentId)) {
      throw new ApiError(403, 'NOT_A_GROUP_MEMBER', 'Only a current group member can dissolve it.')
    }
    await tx.groupMember.deleteMany({ where: { groupId } })
    const dissolved = await tx.studentGroup.update({
      where: { id: groupId },
      data: {
        status: GroupStatus.DISSOLVED,
        dissolvedAt: new Date(),
        averageCgpa: 0,
        maxIndividualCgpa: 0,
      },
    })
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: 'GROUP_DISSOLVED',
        entity: 'StudentGroup',
        entityId: groupId,
        details: { roundId: round.id, memberCount: group.members.length },
      },
    })
    return dissolved
  })
}

export async function submitGroup(userId: string, groupId: string) {
  return serializableTransaction(async (tx) => {
    const round = await lockOpenRound(tx)
    const studentId = await lockStudent(tx, userId)
    await lockGroup(tx, groupId)
    const group = await requireCurrentGroup(tx, groupId, round.id)
    if (!group.members.some((member) => member.studentId === studentId)) {
      throw new ApiError(403, 'NOT_A_GROUP_MEMBER', 'Only a group member can submit it.')
    }
    if (!isValidGroupSize(group.members.length)) {
      throw new ApiError(409, 'INVALID_GROUP_SIZE', 'A submitted group must have exactly 3 or 4 members.')
    }
    if (group.members.some((member) => member.student.gender !== group.members[0].student.gender)) {
      throw new ApiError(409, 'GENDER_MISMATCH', 'Students in a group must have the same gender.')
    }
    await refreshMetrics(tx, groupId)
    return tx.studentGroup.update({
      where: { id: groupId },
      data: { status: GroupStatus.SUBMITTED },
    })
  })
}

export async function savePreferences(userId: string, groupId: string, preferences: string[]) {
  return serializableTransaction(async (tx) => {
    const round = await lockOpenRound(tx)
    const studentId = await lockStudent(tx, userId)
    await lockGroup(tx, groupId)
    const group = await requireCurrentGroup(tx, groupId, round.id)
    if (!group.members.some((member) => member.studentId === studentId)) {
      throw new ApiError(403, 'NOT_A_GROUP_MEMBER', 'Only a group member can edit preferences.')
    }
    if (group.status !== GroupStatus.FORMING && group.status !== GroupStatus.SUBMITTED) {
      throw new ApiError(409, 'INVALID_GROUP_STATE', 'Preferences cannot be edited after allocation.')
    }
    const rooms = await tx.room.findMany({
      where: { id: { in: preferences } },
      select: { id: true },
    })
    if (rooms.length !== new Set(preferences).size) {
      throw new ApiError(400, 'INVALID_ROOM_PREFERENCE', 'Every preference must reference an existing room.')
    }
    return tx.studentGroup.update({ where: { id: groupId }, data: { preferences } })
  })
}
