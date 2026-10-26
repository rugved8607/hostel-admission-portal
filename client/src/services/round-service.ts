import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { requireRole } from '@/services/auth-service'
import * as rounds from '@/repositories/round-repository'

const roundIdSchema = z.string().uuid()
const tieBreakSchema = z.enum([
  'ROLL_NO_ASC',
  'MAX_CGPA_THEN_ROLL_NO',
  'GROUP_CREATED_ASC',
])
const openRoundSchema = z.object({
  formationDeadline: z.iso.datetime().refine((value) => new Date(value) > new Date(), {
    message: 'Formation deadline must be in the future.',
  }),
  tieBreakRule: tieBreakSchema,
}).strict()
const cancelSchema = z.object({
  groupId: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
}).strict()

async function adminActor(request: NextRequest) {
  return requireRole(request, ['ADMIN', 'WARDEN'])
}

export async function listRounds(request: NextRequest) {
  await adminActor(request)
  return rounds.listRounds()
}

export async function createRoundDraft(request: NextRequest, input: unknown) {
  const actor = await adminActor(request)
  const parsed = openRoundSchema.parse(input)
  return rounds.createRoundDraft(
    new Date(parsed.formationDeadline),
    parsed.tieBreakRule,
    actor.id,
  )
}

export async function updateRoundSettings(request: NextRequest, roundId: string, input: unknown) {
  const actor = await adminActor(request)
  const parsed = openRoundSchema.parse(input)
  return rounds.updateRoundSettings(
    roundIdSchema.parse(roundId),
    new Date(parsed.formationDeadline),
    parsed.tieBreakRule,
    actor.id,
  )
}

export async function openRound(request: NextRequest, roundId: string) {
  const actor = await adminActor(request)
  return rounds.openRound(roundIdSchema.parse(roundId), actor.id)
}

export async function getRound(request: NextRequest, roundId: string) {
  await adminActor(request)
  return rounds.getRound(roundIdSchema.parse(roundId))
}

export async function closeFormation(request: NextRequest, roundId: string) {
  const actor = await adminActor(request)
  return rounds.closeFormation(roundIdSchema.parse(roundId), actor.id)
}

export async function allocateRound(request: NextRequest, roundId: string) {
  const actor = await adminActor(request)
  return rounds.allocateRound(roundIdSchema.parse(roundId), actor.id)
}

export async function publishRound(request: NextRequest, roundId: string) {
  const actor = await adminActor(request)
  return rounds.publishRound(roundIdSchema.parse(roundId), actor.id)
}

export async function closeRound(request: NextRequest, roundId: string) {
  const actor = await adminActor(request)
  return rounds.closeRound(roundIdSchema.parse(roundId), actor.id)
}

export async function cancelAllotment(request: NextRequest, roundId: string, input: unknown) {
  const actor = await adminActor(request)
  const { groupId, reason } = cancelSchema.parse(input)
  return rounds.cancelAllotment(roundIdSchema.parse(roundId), groupId, actor.id, reason)
}

export async function listUnallotted(request: NextRequest) {
  await adminActor(request)
  return rounds.listUnallottedStudents()
}

export async function listRooms(request: NextRequest) {
  await adminActor(request)
  return rounds.listRooms()
}

export async function listAvailableRooms(request: NextRequest) {
  await adminActor(request)
  return rounds.listAvailableRooms()
}

export async function listAuditLog(request: NextRequest) {
  await adminActor(request)
  return rounds.listAuditLog()
}
