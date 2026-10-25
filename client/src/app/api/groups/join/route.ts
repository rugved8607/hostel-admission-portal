import type { NextRequest } from 'next/server'
import { apiRoute, parseJson } from '@/lib/api'
import { joinGroup } from '@/services/group-service'
import { z } from 'zod'

const schema = z.object({ groupId: z.string().uuid() }).strict()

export const POST = apiRoute(async (request: NextRequest) =>
  joinGroup(request, await parseJson(request, schema)),
)
