import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { closeFormation } from '@/services/round-service'

export const POST = apiRoute((request: NextRequest) =>
  closeFormation(request, request.nextUrl.pathname.split('/').at(-2) ?? ''),
)
