import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and anon key must be configured.')
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error && error.name !== 'AuthSessionMissingError') {
    console.error('Unable to verify the Supabase session:', error)
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isStudentRoute = request.nextUrl.pathname.startsWith('/student')

  if (!isAdminRoute && !isStudentRoute) {
    return response
  }

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const role = String(user.app_metadata?.role ?? '').toUpperCase()
  const canAccessRoute = isAdminRoute
    ? role === 'ADMIN' || role === 'WARDEN'
    : role === 'STUDENT'

  if (!canAccessRoute) {
    const destination =
      role === 'ADMIN' || role === 'WARDEN'
        ? '/admin/dashboard'
        : role === 'STUDENT'
          ? '/student/dashboard'
          : '/'

    return NextResponse.redirect(new URL(destination, request.url))
  }

  return response
}
