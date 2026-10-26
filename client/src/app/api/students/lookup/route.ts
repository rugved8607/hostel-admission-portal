import type { NextRequest } from 'next/server'
import { apiRoute } from '@/lib/api'
import { lookupStudent } from '@/services/student-service'

export const GET = apiRoute((request: NextRequest) => lookupStudent(request))
