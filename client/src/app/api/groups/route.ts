import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiRoute, parseJson } from '@/lib/api'
import { createGroup } from '@/services/group-service'

export const POST = apiRoute(async (request: NextRequest) =>
  createGroup(request, await parseJson(request, z.unknown())),
)
