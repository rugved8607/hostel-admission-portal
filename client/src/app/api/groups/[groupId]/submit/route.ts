import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { submitGroup } from '@/services/group-service'

export const POST = apiRoute((request: NextRequest) =>
  submitGroup(request, request.nextUrl.pathname.split('/').at(-2) ?? ''),
)
