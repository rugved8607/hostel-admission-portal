import { describe, expect, it } from 'vitest'
import type { Gender, TieBreakRule } from '@prisma/client'
import {
  allocationAlreadyComplete,
  planAllocation,
  rankAllocationGroups,
  type AllocationGroup,
  type AllocationRoom,
} from './allocation-service'
import {
  allotmentCancellationAudit,
  canStudentJoinGroup,
  isValidGroupSize,
  statusAfterMemberLeaves,
} from './group-rules'
import { retrySerializable } from './transaction-retry'
import { GroupStatus } from '@prisma/client'

const male = 'MALE' as Gender
const female = 'FEMALE' as Gender
const date = new Date('2026-10-20T10:00:00.000Z')

function makeGroup(
  id: string,
  cgpas: number[],
  options: { gender?: Gender; rollPrefix?: string; createdAt?: Date; preferences?: string[] } = {},
): AllocationGroup {
  return {
    id,
    createdAt: options.createdAt ?? date,
    preferences: options.preferences ?? [],
    members: cgpas.map((cgpa, index) => ({
      id: `${id}-student-${index}`,
      name: `${id} Student ${index}`,
      rollNo: `${options.rollPrefix ?? id}-${String(index).padStart(3, '0')}`,
      cgpa,
      gender: options.gender ?? male,
    })),
  }
}

function room(
  id: string,
  capacity: number,
  gender: Gender = male,
): AllocationRoom {
  return { id, roomNumber: id, capacity, gender }
}

function ranking(
  groups: AllocationGroup[],
  rule: TieBreakRule = 'ROLL_NO_ASC',
) {
  return rankAllocationGroups(groups, rule).map(({ id }) => id)
}

describe('allocation planner', () => {
  it('gives a single four-person room to the higher-CGPA group', () => {
    const result = planAllocation(
      [
        makeGroup('lower', [8.1, 8.2, 8.3, 8.4]),
        makeGroup('higher', [9.1, 9.2, 9.3, 9.4]),
      ],
      [room('room-4', 4)],
      'ROLL_NO_ASC',
    )

    expect(result.map(({ id, result: status, room: assigned }) => [id, status, assigned?.id ?? null])).toEqual([
      ['higher', 'ALLOTTED', 'room-4'],
      ['lower', 'UNALLOTTED', null],
    ])
    expect(result[1].reason).toMatch(/No compatible/)
  })

  it('allows unallotted members to reform as groups of three in a later-round inventory', () => {
    const laterRound = planAllocation(
      [
        makeGroup('reformed-a', [8.2, 8.4, 8.6]),
        makeGroup('reformed-b', [8.1, 8.3, 8.5]),
      ],
      [room('remaining-3', 3)],
      'MAX_CGPA_THEN_ROLL_NO',
    )

    expect(laterRound[0].room?.capacity).toBe(3)
    expect(laterRound[0].result).toBe('ALLOTTED')
    expect(laterRound[1].result).toBe('UNALLOTTED')
  })

  it('applies each deterministic tie-break rule after average CGPA', () => {
    const groups = [
      makeGroup('max-cgpa', [9, 7], { rollPrefix: '20' }),
      makeGroup('roll-number', [8, 8], { rollPrefix: '10' }),
      makeGroup('created-first', [8, 8], {
        rollPrefix: '30',
        createdAt: new Date('2026-10-19T10:00:00.000Z'),
      }),
    ]

    expect(ranking(groups, 'ROLL_NO_ASC')).toEqual(['roll-number', 'max-cgpa', 'created-first'])
    expect(ranking(groups, 'MAX_CGPA_THEN_ROLL_NO')).toEqual(['max-cgpa', 'roll-number', 'created-first'])
    expect(ranking(groups, 'GROUP_CREATED_ASC')).toEqual(['created-first', 'max-cgpa', 'roll-number'])
  })

  it('leaves a group unallotted when no room matches its gender or capacity', () => {
    const plan = planAllocation(
      [makeGroup('male-four', [8, 8, 8, 8])],
      [room('female-four', 4, female), room('male-three', 3)],
      'ROLL_NO_ASC',
    )
    expect(plan[0].result).toBe('UNALLOTTED')
    expect(plan[0].reason).toMatch(/No compatible/)
  })

  it('handles empty room inventory without dropping submitted groups', () => {
    const plan = planAllocation(
      [makeGroup('one', [8, 8, 8]), makeGroup('two', [7, 7, 7])],
      [],
      'ROLL_NO_ASC',
    )
    expect(plan).toHaveLength(2)
    expect(plan.every(({ result }) => result === 'UNALLOTTED')).toBe(true)
  })

  it('does not allocate twice after a round has already been allocated or published', () => {
    expect(allocationAlreadyComplete('ALLOCATED')).toBe(true)
    expect(allocationAlreadyComplete('PUBLISHED')).toBe(true)
    expect(allocationAlreadyComplete('FORMATION_CLOSED')).toBe(false)
  })

  it('retries a serialization conflict so concurrent allocation remains idempotent', async () => {
    let committed = false
    let commitCount = 0
    let firstAttempt = true

    const runAllocation = () => retrySerializable(async () => {
      if (firstAttempt) {
        firstAttempt = false
        throw Object.assign(new Error('serialization conflict'), { code: '40001' })
      }
      if (committed) return 'already allocated'
      committed = true
      commitCount += 1
      return 'allocated'
    })

    const results = await Promise.all([runAllocation(), runAllocation()])
    expect(results.sort()).toEqual(['allocated', 'already allocated'])
    expect(commitCount).toBe(1)
  })
})

describe('group lifecycle rules', () => {
  it('prevents an allotted student from joining another group', () => {
    expect(canStudentJoinGroup(true, false)).toBe(false)
    expect(canStudentJoinGroup(false, true)).toBe(false)
    expect(canStudentJoinGroup(false, false)).toBe(true)
  })

  it('rejects a group that drops below three members after a leave', () => {
    expect(isValidGroupSize(2)).toBe(false)
    expect(statusAfterMemberLeaves(GroupStatus.SUBMITTED, 2)).toBe(GroupStatus.FORMING)
    expect(isValidGroupSize(3)).toBe(true)
  })

  it('records the required cancellation reason in the audit event', () => {
    expect(allotmentCancellationAudit('round-2', 'room-9', 'Eligibility appeal approved')).toEqual({
      action: 'ALLOTMENT_CANCELLED',
      entity: 'StudentGroup',
      details: {
        roundId: 'round-2',
        roomId: 'room-9',
        reason: 'Eligibility appeal approved',
      },
    })
  })
})
