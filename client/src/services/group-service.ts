import { z } from 'zod'
import type { NextRequest } from 'next/server'
import type { Role } from '@prisma/client'
import { requireRole } from '@/services/auth-service'
import * as groups from '@/repositories/group-repository'

const groupIdSchema = z.string().uuid()
const createGroupSchema = z.object({}).strict()
const groupMembershipSchema = z.object({ groupId: groupIdSchema }).strict()
const preferencesSchema = z.object({
  preferences: z.array(z.string().uuid()).max(200)
    .refine((values) => new Set(values).size === values.length),
}).strict()

type Actor = { id: string; role: Role; email: string }

async function studentActor(request: NextRequest): Promise<Actor> {
  return requireRole(request, ['STUDENT'])
}

export async function getMyGroup(request: NextRequest) {
  const actor = await studentActor(request)
  return groups.findStudentGroup(actor.id)
}

export async function createGroup(request: NextRequest, input: unknown) {
  createGroupSchema.parse(input)
  const actor = await studentActor(request)
  return groups.createGroup(actor.id)
}

export async function joinGroup(request: NextRequest, input: unknown) {
  const { groupId } = groupMembershipSchema.parse(input)
  const actor = await studentActor(request)
  return groups.joinGroup(actor.id, groupId)
}

export async function leaveGroup(request: NextRequest, groupId: string) {
  const actor = await studentActor(request)
  return groups.leaveGroup(actor.id, groupIdSchema.parse(groupId))
}

export async function dissolveGroup(request: NextRequest, groupId: string) {
  const actor = await studentActor(request)
  return groups.dissolveGroup(actor.id, groupIdSchema.parse(groupId))
}

export async function submitGroup(request: NextRequest, groupId: string) {
  const actor = await studentActor(request)
  return groups.submitGroup(actor.id, groupIdSchema.parse(groupId))
}

export async function savePreferences(
  request: NextRequest,
  groupId: string,
  input: unknown,
) {
  const parsedId = groupIdSchema.parse(groupId)
  const { preferences } = preferencesSchema.parse(input)
  const actor = await studentActor(request)
  return groups.savePreferences(actor.id, parsedId, preferences)
}
