import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { listRooms } from '@/services/round-service'

export const GET = apiRoute((request: NextRequest) => listRooms(request))
