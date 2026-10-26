import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { getStudentRooms } from '@/services/student-service'

export const GET = apiRoute((request: NextRequest) => getStudentRooms(request))
