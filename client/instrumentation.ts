const requiredServerVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
] as const

export function register() {
  const missing = requiredServerVariables.filter((name) => !process.env[name]?.trim())
  if (missing.length) {
    throw new Error(
      `Missing required environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
    )
  }
}
