import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiRoute, parseJson } from '@/lib/api'
import { cancelAllotment } from '@/services/round-service'

const schema = z.object({
  groupId: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
}).strict()

export const POST = apiRoute(async (request: NextRequest) =>
  cancelAllotment(
    request,
    request.nextUrl.pathname.split('/').at(-2) ?? '',
    await parseJson(request, schema),
  ),
)
