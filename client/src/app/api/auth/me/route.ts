import { apiRoute } from '@/lib/api'
import { getCurrentPortalUser } from '@/services/session-service'

export const GET = apiRoute(() => getCurrentPortalUser())
