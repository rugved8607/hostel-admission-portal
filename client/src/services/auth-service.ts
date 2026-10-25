import type { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { ApiError } from '@/services/api-error'
import { findUserByAuthId } from '@/repositories/user-repository'
import type { Role } from '@prisma/client'

export async function requireRole(
  _request: NextRequest,
  allowedRoles: readonly Role[],
) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser()

  if (error && error.status !== 401 && error.status !== 403) {
    throw error
  }
  if (!authUser) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')
  }

  const user = await findUserByAuthId(authUser.id)
  if (!user) {
    throw new ApiError(403, 'USER_NOT_REGISTERED', 'The authenticated user has no portal account.')
  }

  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.')
  }

  return user
}
