import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { openRound } from '@/services/round-service'

export const POST = apiRoute((request: NextRequest) =>
  openRound(request, request.nextUrl.pathname.split('/').at(-2) ?? ''),
)
