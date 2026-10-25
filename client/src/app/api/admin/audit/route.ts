import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { listAuditLog } from '@/services/round-service'

export const GET = apiRoute((request: NextRequest) => listAuditLog(request))
