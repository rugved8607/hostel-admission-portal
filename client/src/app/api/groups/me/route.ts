import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { getMyGroup } from '@/services/group-service'

export const GET = apiRoute((request: NextRequest) => getMyGroup(request))
