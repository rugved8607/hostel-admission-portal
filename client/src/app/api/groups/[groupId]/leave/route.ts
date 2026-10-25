import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { leaveGroup } from '@/services/group-service'

export const POST = apiRoute(async (request: NextRequest) => {
  return leaveGroup(request, request.nextUrl.pathname.split('/').at(-2) ?? '')
})
