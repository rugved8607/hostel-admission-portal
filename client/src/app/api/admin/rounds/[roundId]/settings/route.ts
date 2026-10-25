import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiRoute, parseJson } from '@/lib/api'
import { updateRoundSettings } from '@/services/round-service'

const schema = z.object({
  formationDeadline: z.string(),
  tieBreakRule: z.enum(['ROLL_NO_ASC', 'MAX_CGPA_THEN_ROLL_NO', 'GROUP_CREATED_ASC']),
}).strict()

export const PATCH = apiRoute(async (request: NextRequest) =>
  updateRoundSettings(
    request,
    request.nextUrl.pathname.split('/').at(-2) ?? '',
    await parseJson(request, schema),
  ),
)
