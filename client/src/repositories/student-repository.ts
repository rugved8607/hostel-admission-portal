import { prisma } from '@/lib/prisma'
import { ApiError } from '@/services/api-error'

export async function findStudentProfile(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { application: true },
  })
  if (!student) {
    throw new ApiError(404, 'STUDENT_NOT_FOUND', 'No student profile exists for this account.')
  }
  return student
}

export async function findStudentByRollNo(rollNo: string) {
  return prisma.student.findUnique({
    where: { rollNo },
    select: { user: { select: { email: true } } },
  })
}

export async function listFormingGroups() {
  const round = await prisma.allocationRound.findFirst({
    where: { status: 'FORMATION_OPEN' },
    orderBy: { number: 'desc' },
    select: { id: true },
  })
  if (!round) return []

  return prisma.studentGroup.findMany({
    where: { roundId: round.id, status: 'FORMING' },
    include: {
      members: {
        include: {
          student: { select: { id: true, name: true, rollNo: true, gender: true } },
        },
        orderBy: { student: { rollNo: 'asc' } },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function listStudentRooms(gender: 'MALE' | 'FEMALE') {
  return prisma.room.findMany({
    where: { block: { hostel: { gender } } },
    include: {
      block: {
        include: { hostel: { select: { id: true, name: true, gender: true } } },
      },
    },
    orderBy: [
      { block: { hostel: { name: 'asc' } } },
      { block: { name: 'asc' } },
      { floor: 'asc' },
      { roomNumber: 'asc' },
    ],
  })
}
