import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { getFormingGroups } from '@/services/student-service'

export const GET = apiRoute((request: NextRequest) => getFormingGroups(request))
