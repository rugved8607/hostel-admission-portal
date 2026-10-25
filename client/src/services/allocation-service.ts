import type { Gender, TieBreakRule } from '@prisma/client'

export interface AllocationMember {
  id: string
  name: string
  rollNo: string
  cgpa: number
  gender: Gender
}

export interface AllocationGroup {
  id: string
  createdAt: Date
  preferences: string[]
  members: AllocationMember[]
}

export interface AllocationRoom {
  id: string
  roomNumber: string
  capacity: number
  gender: Gender
}

export interface RankedAllocationGroup extends AllocationGroup {
  averageCgpa: number
  maxCgpa: number
  rank: number
  tieBreakNote: string
}

export interface AllocationPlanEntry extends RankedAllocationGroup {
  room: AllocationRoom | null
  result: 'ALLOTTED' | 'UNALLOTTED'
  reason: string | null
}

function minimumRollNo(group: AllocationGroup) {
  return group.members.map((member) => member.rollNo).sort((a, b) => a.localeCompare(b))[0] ?? ''
}

export function rankAllocationGroups(
  groups: AllocationGroup[],
  tieBreakRule: TieBreakRule,
): RankedAllocationGroup[] {
  const ranked = groups.map((group) => {
    const values = group.members.map((member) => member.cgpa)
    const averageCgpa = values.length
      ? values.reduce((sum, cgpa) => sum + cgpa, 0) / values.length
      : 0
    const maxCgpa = values.length ? Math.max(...values) : 0
    return { ...group, averageCgpa, maxCgpa, minRollNo: minimumRollNo(group) }
  })

  ranked.sort((left, right) => {
    const averageOrder = right.averageCgpa - left.averageCgpa
    if (averageOrder !== 0) return averageOrder

    if (tieBreakRule === 'ROLL_NO_ASC') {
      return left.minRollNo.localeCompare(right.minRollNo) || left.id.localeCompare(right.id)
    }
    if (tieBreakRule === 'MAX_CGPA_THEN_ROLL_NO') {
      return right.maxCgpa - left.maxCgpa ||
        left.minRollNo.localeCompare(right.minRollNo) ||
        left.id.localeCompare(right.id)
    }
    return left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id)
  })

  return ranked.map((group, index) => ({
    ...group,
    rank: index + 1,
    tieBreakNote:
      tieBreakRule === 'ROLL_NO_ASC'
        ? `Average CGPA descending; lowest roll number ${group.minRollNo} ascending.`
        : tieBreakRule === 'MAX_CGPA_THEN_ROLL_NO'
          ? `Average CGPA descending; maximum CGPA ${group.maxCgpa.toFixed(2)} descending; lowest roll number ${group.minRollNo} ascending.`
          : `Average CGPA descending; group creation time ${group.createdAt.toISOString()} ascending.`,
  }))
}

export function chooseRoom(
  group: RankedAllocationGroup,
  rooms: AllocationRoom[],
) {
  const groupGender = group.members[0]?.gender
  if (!groupGender || group.members.some((member) => member.gender !== groupGender)) return null

  const preferenceRank = new Map(group.preferences.map((roomId, index) => [roomId, index]))
  const compatible = rooms
    .filter((room) => room.gender === groupGender && [3, 4].includes(room.capacity) && room.capacity >= group.members.length)
    .sort((left, right) => {
      const leftPreference = preferenceRank.get(left.id) ?? Number.MAX_SAFE_INTEGER
      const rightPreference = preferenceRank.get(right.id) ?? Number.MAX_SAFE_INTEGER
      return leftPreference - rightPreference ||
        Number(left.capacity !== group.members.length) - Number(right.capacity !== group.members.length) ||
        left.roomNumber.localeCompare(right.roomNumber) ||
        left.id.localeCompare(right.id)
    })

  return compatible[0] ?? null
}

export function planAllocation(
  groups: AllocationGroup[],
  rooms: AllocationRoom[],
  tieBreakRule: TieBreakRule,
): AllocationPlanEntry[] {
  const freeRooms = [...rooms]
  return rankAllocationGroups(groups, tieBreakRule).map((group) => {
    const invalidReason = group.members.length < 3 || group.members.length > 4
      ? 'Group size must be 3 or 4.'
      : group.members.some((member) => member.gender !== group.members[0]?.gender)
        ? 'Group members do not have a consistent gender.'
        : null
    const room = invalidReason ? null : chooseRoom(group, freeRooms)
    const reason = invalidReason ?? (room ? null : 'No compatible available room remains.')

    if (room) freeRooms.splice(freeRooms.findIndex((candidate) => candidate.id === room.id), 1)
    return {
      ...group,
      room,
      result: room ? 'ALLOTTED' : 'UNALLOTTED',
      reason,
    }
  })
}

export function allocationAlreadyComplete(status: string) {
  return status === 'ALLOCATED' || status === 'PUBLISHED'
}
