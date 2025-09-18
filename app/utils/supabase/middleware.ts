
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'

// Environment-based configuration (middleware uses NEXT_PUBLIC vars)
const isProduction = process.env.NEXT_PUBLIC_PROD_DB === 'true'

const supabaseUrl = isProduction
  ? process.env.NEXT_PUBLIC_PROD_SUPABASE_URL!
  : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!

const supabaseAnonKey = isProduction
  ? process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY!
  : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!

export function updateSession(request: NextRequest) {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  // Suppress common auth errors for unauthenticated users
  supabase.auth.getUser().catch((error) => {
    // Only log unexpected errors, not common "no refresh token" errors
    if (error?.code !== 'refresh_token_not_found') {
      console.error('Auth error in middleware:', error)
    }
  })

  return supabaseResponse
}
