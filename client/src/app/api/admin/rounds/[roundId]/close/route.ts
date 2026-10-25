import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { closeRound } from '@/services/round-service'

export const POST = apiRoute((request: NextRequest) =>
  closeRound(request, request.nextUrl.pathname.split('/').at(-2) ?? ''),
)
