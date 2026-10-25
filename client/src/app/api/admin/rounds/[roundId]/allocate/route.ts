import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { allocateRound } from '@/services/round-service'

export const POST = apiRoute((request: NextRequest) =>
  allocateRound(request, request.nextUrl.pathname.split('/').at(-2) ?? ''),
)
