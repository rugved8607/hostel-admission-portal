import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiRoute, parseJson } from '@/lib/api'
import { applicationUpdateSchema, updateAdminApplication } from '@/services/application-service'

export const PATCH = apiRoute(async (request: NextRequest) =>
  updateAdminApplication(
    request,
    z.string().uuid().parse(request.nextUrl.pathname.split('/').at(-1)),
    await parseJson(request, applicationUpdateSchema),
  ),
)
