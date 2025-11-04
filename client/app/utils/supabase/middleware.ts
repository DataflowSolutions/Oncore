
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

// Public routes that don't require auth checks
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/sign-in',
  '/sign-up',
  '/auth/callback',
  '/api/auth'
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth entirely for static assets
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

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

  // Skip expensive auth checks for public routes
  if (PUBLIC_ROUTES.includes(pathname) || PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return supabaseResponse;
  }

  // Only check auth for protected routes (org pages)
  // Match /create-org or any org route like /dataflow-solutions or /dataflow-solutions/shows
  if (pathname.startsWith('/create-org') || pathname.match(/^\/[^\/]+($|\/)/)) {
    console.log('🔒 [Middleware] Checking auth for:', pathname);
    
    // Optimize: Use getSession instead of getUser (faster, uses local JWT)
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      console.log('❌ [Middleware] No session found, redirecting to sign-in');
      const redirectUrl = new URL('/sign-in', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    console.log('✅ [Middleware] Session found for user:', session.user.id);

    // If user is authenticated but accessing create-org, check if they have orgs
    if (pathname === '/create-org') {
      const { data: memberships } = await supabase
        .from('org_members')
        .select('org_id, organizations(slug)')
        .eq('user_id', session.user.id)
        .limit(1)

      // If user has an org, redirect them to it
      if (memberships && memberships.length > 0) {
        const firstOrg = memberships[0].organizations as { slug: string }
        const redirectUrl = new URL(`/${firstOrg.slug}`, request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return supabaseResponse
}
