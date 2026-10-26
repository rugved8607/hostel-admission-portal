import { createClient } from '@/utils/supabase/server'
import { ApiError } from '@/services/api-error'
import { findUserByAuthId } from '@/repositories/user-repository'

export async function getCurrentPortalUser() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser()
  if (error && error.status !== 401 && error.status !== 403) throw error
  if (!authUser) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')

  const user = await findUserByAuthId(authUser.id)
  if (!user) throw new ApiError(403, 'USER_NOT_REGISTERED', 'The authenticated user has no portal account.')
  return user
}
