import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { listAdminApplications } from '@/services/application-service'

export const GET = apiRoute((request: NextRequest) => listAdminApplications(request))
