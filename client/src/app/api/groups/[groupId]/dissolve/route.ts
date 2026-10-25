import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { dissolveGroup } from '@/services/group-service'

export const POST = apiRoute((request: NextRequest) =>
  dissolveGroup(request, request.nextUrl.pathname.split('/').at(-2) ?? ''),
)
