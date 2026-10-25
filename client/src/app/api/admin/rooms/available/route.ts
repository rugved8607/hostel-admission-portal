import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { listAvailableRooms } from '@/services/round-service'

export const GET = apiRoute((request: NextRequest) => listAvailableRooms(request))
