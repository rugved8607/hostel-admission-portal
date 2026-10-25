import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiRoute, parseJson } from '@/lib/api'
import { createRoundDraft, listRounds } from '@/services/round-service'

const schema = z.object({
  formationDeadline: z.string(),
  tieBreakRule: z.enum(['ROLL_NO_ASC', 'MAX_CGPA_THEN_ROLL_NO', 'GROUP_CREATED_ASC']),
}).strict()

export const GET = apiRoute((request: NextRequest) => listRounds(request))
export const POST = apiRoute(async (request: NextRequest) =>
  createRoundDraft(request, await parseJson(request, schema)),
)
