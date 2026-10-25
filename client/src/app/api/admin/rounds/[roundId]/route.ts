import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { getRound } from '@/services/round-service'

export const GET = apiRoute((request: NextRequest) =>
  getRound(request, request.nextUrl.pathname.split('/').at(-1) ?? ''),
)
