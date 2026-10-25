import { GroupStatus } from '@prisma/client'

export function isValidGroupSize(size: number) {
  return size === 3 || size === 4
}

export function canStudentJoinGroup(hasAllotment: boolean, hasGroupMembership: boolean) {
  return !hasAllotment && !hasGroupMembership
}

export function statusAfterMemberLeaves(status: GroupStatus, remainingMembers: number) {
  if (remainingMembers === 0) return GroupStatus.DISSOLVED
  if (status === GroupStatus.SUBMITTED) return GroupStatus.FORMING
  return status
}

export function allotmentCancellationAudit(
  roundId: string,
  roomId: string,
  reason: string,
) {
  return {
    action: 'ALLOTMENT_CANCELLED',
    entity: 'StudentGroup',
    details: { roundId, roomId, reason },
  } as const
}
