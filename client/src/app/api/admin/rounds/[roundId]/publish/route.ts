import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { publishRound } from '@/services/round-service'

export const POST = apiRoute((request: NextRequest) =>
  publishRound(request, request.nextUrl.pathname.split('/').at(-2) ?? ''),
)
