import { connection, NextResponse, type NextRequest } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { ApiError } from '@/services/api-error'

type ApiHandler = (request: NextRequest) => Promise<unknown>

export function apiRoute(handler: ApiHandler) {
  return async (request: NextRequest) => {
    await connection()
    try {
      return NextResponse.json(await handler(request))
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        )
      }

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Request validation failed.', code: 'VALIDATION_ERROR' },
          { status: 400 },
        )
      }

      console.error('Unhandled API error:', error)
      return NextResponse.json(
        { error: 'An unexpected server error occurred.', code: 'INTERNAL_ERROR' },
        { status: 500 },
      )
    }
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let value: unknown

  try {
    value = await request.json()
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.')
  }

  const result = schema.safeParse(value)
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.')
  }
  return result.data
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const result = schema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  )
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Query validation failed.')
  }
  return result.data
}
