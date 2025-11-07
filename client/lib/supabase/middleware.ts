import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '../database.types'
import { getClientConfig, validateConfig } from './config'
import { logger } from '../logger'

const IS_DEV = process.env.NODE_ENV === 'development'

// Lightweight logger for middleware
const mwLogger = {
  debug: (message: string) => {
    if (IS_DEV) logger.debug(`[MW] ${message}`)
  },
  security: (message: string, result: 'allowed' | 'denied') => {
    logger.security(`[MW] ${message}`, { action: 'middleware', result })
  }
}

// Helper function to check if a path is public (doesn't require auth)
function isPublicPath(pathname: string): boolean {
  // Exact match public routes
  const exactPublicRoutes = [
    '/sign-in',
    '/sign-up',
    '/pricing',
    '/auth/callback',
  ]
  
  if (exactPublicRoutes.includes(pathname)) {
    return true
  }
  
  // Pattern-based public routes using regex for precise matching
  const publicPatterns = [
    /^\/$/,                           // Exact root path only
    /^\/login$/,                      // Login page
    /^\/signup$/,                     // Signup page
    /^\/auth\/.+$/,                   // Auth callback routes
    /^\/api\/auth\/.+$/,              // Auth API routes only
  ]
  
  return publicPatterns.some(pattern => pattern.test(pathname))
}

// Helper function to check if a path is a static/system resource
function isStaticResource(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$/) !== null
  )
}

/**
 * Update session in middleware with auth protection
 * 
 * This helper:
 * - Refreshes the user's session
 * - Protects routes that require authentication
 * - Redirects unauthenticated users to sign-in
 * - Handles org-specific redirects
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth entirely for static assets and Next.js internals
  if (isStaticResource(pathname)) {
    return NextResponse.next()
  }

  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const config = getClientConfig()
  validateConfig(config, 'client')

  const supabase = createServerClient<Database>(
    config.url,
    config.anonKey,
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

  // Allow public routes without auth check
  if (isPublicPath(pathname)) {
    return supabaseResponse
  }

  // Protected API routes require auth (defense in depth)
  if (pathname.startsWith('/api/')) {
    mwLogger.debug('Checking auth for API')
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      mwLogger.security('API route access', 'denied')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    mwLogger.security('API route access', 'allowed')
    return supabaseResponse
  }

  // Check auth for all other routes (protected by default)
  mwLogger.debug('Checking auth for protected route')
  
  // Optimize: Use getSession instead of getUser (faster, uses local JWT)
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    mwLogger.security('Protected route access', 'denied')
    const redirectUrl = new URL('/sign-in', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  mwLogger.security('Protected route access', 'allowed')

  // Allow users to create multiple organizations
  // No redirect from /create-org page

  return supabaseResponse
}

