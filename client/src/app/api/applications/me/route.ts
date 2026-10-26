import type { NextRequest } from 'next/server'
import { apiRoute, parseJson } from '@/lib/api'
import {
  getStudentApplication,
  studentSubmissionSchema,
  submitStudentApplication,
} from '@/services/application-service'

export const GET = apiRoute((request: NextRequest) => getStudentApplication(request))

export const POST = apiRoute(async (request: NextRequest) =>
  submitStudentApplication(request, await parseJson(request, studentSubmissionSchema)),
)
