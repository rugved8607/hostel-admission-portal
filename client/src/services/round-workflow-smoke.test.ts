import { describe, expect, it, vi } from 'vitest'

vi.mock('@/repositories/round-repository', () => ({
  createRoundDraft: vi.fn(async () => ({ id: 'round-1', number: 1, status: 'DRAFT' })),
  openRound: vi.fn(async () => ({ id: 'round-1', status: 'FORMATION_OPEN' })),
  closeFormation: vi.fn(async () => ({ id: 'round-1', status: 'FORMATION_CLOSED' })),
  allocateRound: vi.fn(async () => ({ roundId: 'round-1', status: 'ALLOCATED', alreadyAllocated: false, results: [] })),
  publishRound: vi.fn(async () => ({ id: 'round-1', status: 'PUBLISHED' })),
  createRoomsForTest: vi.fn(),
}))

vi.mock('@/repositories/group-repository', () => ({
  createGroup: vi.fn(async () => ({ id: 'group-1', status: 'FORMING' })),
  joinGroup: vi.fn(async () => ({ id: 'group-1', status: 'FORMING' })),
  submitGroup: vi.fn(async () => ({ id: 'group-1', status: 'SUBMITTED' })),
}))

import * as rounds from '@/repositories/round-repository'
import * as groups from '@/repositories/group-repository'

describe('round workflow smoke', () => {
  it('runs a complete round workflow without real database writes', async () => {
    const deadline = new Date('2026-11-30T12:00:00.000Z')
    const created = await rounds.createRoundDraft(deadline, 'MAX_CGPA_THEN_ROLL_NO', 'admin-1')
    const opened = await rounds.openRound('round-1', 'admin-1')
    const group = await groups.createGroup('student-1')
    const joined = await groups.joinGroup('student-2', 'group-1')
    const submitted = await groups.submitGroup('student-1', 'group-1')
    const closed = await rounds.closeFormation('round-1', 'admin-1')
    const allocated = await rounds.allocateRound('round-1', 'admin-1')
    const published = await rounds.publishRound('round-1', 'admin-1')
    const nextRound = await rounds.createRoundDraft(deadline, 'MAX_CGPA_THEN_ROLL_NO', 'admin-1')

    expect(created).toMatchObject({ status: 'DRAFT' })
    expect(opened).toMatchObject({ status: 'FORMATION_OPEN' })
    expect(group).toMatchObject({ status: 'FORMING' })
    expect(joined).toMatchObject({ status: 'FORMING' })
    expect(submitted).toMatchObject({ status: 'SUBMITTED' })
    expect(closed).toMatchObject({ status: 'FORMATION_CLOSED' })
    expect(allocated).toMatchObject({ status: 'ALLOCATED', alreadyAllocated: false })
    expect(published).toMatchObject({ status: 'PUBLISHED' })
    expect(nextRound).toMatchObject({ status: 'DRAFT' })
  })
})
