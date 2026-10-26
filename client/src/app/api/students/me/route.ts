import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { getStudentProfile } from '@/services/student-service'

export const GET = apiRoute((request: NextRequest) => getStudentProfile(request))
