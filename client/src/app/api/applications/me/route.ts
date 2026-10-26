import type { NextRequest } from 'next/server'
import { apiRoute, parseJson } from '@/lib/api'
import { studentSubmissionSchema, submitStudentApplication } from '@/services/application-service'

export const POST = apiRoute(async (request: NextRequest) =>
  submitStudentApplication(request, await parseJson(request, studentSubmissionSchema)),
)
