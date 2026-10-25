import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { listUnallotted } from '@/services/round-service'

export const GET = apiRoute((request: NextRequest) => listUnallotted(request))
