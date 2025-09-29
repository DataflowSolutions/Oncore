
import { createServerClient } from '@supabase/ssr'
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

export async function updateSession(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // Skip auth checks for public routes
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname === '/' || 
      pathname.startsWith('/pricing') ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up')) {
    return supabaseResponse
  }

  // Get the current user
  const { data: { user }, error } = await supabase.auth.getUser()

  // If accessing app routes, user must be authenticated
  if (pathname.startsWith('/create-org') || pathname.match(/^\/[^\/]+\//)) {
    if (error || !user) {
      const redirectUrl = new URL('/sign-in', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated but accessing create-org, check if they have orgs
    if (pathname === '/create-org') {
      const { data: memberships } = await supabase
        .from('org_members')
        .select('org_id, organizations(slug)')
        .eq('user_id', user.id)
        .limit(1)

      // If user has an org, redirect them to it
      if (memberships && memberships.length > 0) {
        const firstOrg = memberships[0].organizations as { slug: string }
        const redirectUrl = new URL(`/${firstOrg.slug}`, request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    // If accessing org routes, user needs to be authenticated (layout will handle org membership)
  }

  return supabaseResponse
}
