import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiRoute, parseJson } from '@/lib/api'
import { savePreferences } from '@/services/group-service'

const schema = z.object({
  preferences: z.array(z.string().uuid()).max(200),
}).strict()

export const PUT = apiRoute(async (request: NextRequest) =>
  savePreferences(
    request,
    request.nextUrl.pathname.split('/').at(-2) ?? '',
    await parseJson(request, schema),
  ),
)
