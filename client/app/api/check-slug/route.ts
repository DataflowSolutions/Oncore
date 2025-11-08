import { NextRequest, NextResponse } from 'next/server'
import { isReservedSlug } from '@/lib/constants/reserved-slugs'
import { getSupabaseAdmin } from '@/lib/supabase/admin.server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  
  console.log('='.repeat(80))
  console.log(`[CHECK-SLUG ${requestId}] REQUEST STARTED`)
  console.log('='.repeat(80))
  
  try {
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')

    console.log(`[${requestId}] Step 1: Got slug parameter:`, slug)
    logger.info(`[${requestId}] Check slug request started`, { slug })

    if (!slug) {
      console.log(`[${requestId}] ERROR: No slug provided`)
      return NextResponse.json(
        { available: false, reason: 'Slug is required' },
        { status: 400 }
      )
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    console.log(`[${requestId}] Step 2: Validating slug format...`)
    if (!slugRegex.test(slug)) {
      console.log(`[${requestId}] Slug format invalid:`, slug)
      logger.info(`[${requestId}] Slug format invalid`, { slug })
      return NextResponse.json({
        available: false,
        reason: 'Slug must contain only lowercase letters, numbers, and hyphens'
      })
    }
    console.log(`[${requestId}] Slug format valid`)

    // Check if slug is reserved
    console.log(`[${requestId}] Step 3: Checking if slug is reserved...`)
    if (isReservedSlug(slug)) {
      console.log(`[${requestId}] Slug is reserved:`, slug)
      logger.info(`[${requestId}] Slug is reserved`, { slug })
      return NextResponse.json({
        available: false,
        reason: 'This slug is reserved and cannot be used'
      })
    }
    console.log(`[${requestId}] Slug is not reserved`)

    // Check if slug is already taken in the database
    // Use admin client to bypass RLS since user isn't a member yet
    try {
      console.log(`[${requestId}] Step 4: Getting admin Supabase client...`)
      console.log(`[${requestId}] About to call getSupabaseAdmin()`)
      
      const supabase = getSupabaseAdmin()
      
      console.log(`[${requestId}] Admin client obtained successfully`)
      console.log(`[${requestId}] Client type:`, typeof supabase)
      console.log(`[${requestId}] Client has 'from' method:`, typeof supabase.from === 'function')
      
      logger.info(`[${requestId}] Admin client obtained, querying database...`)
      
      console.log(`[${requestId}] Step 5: Querying organizations table...`)
      console.log(`[${requestId}] Query: SELECT id FROM organizations WHERE slug = '${slug}'`)
      
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      console.log(`[${requestId}] Step 6: Query completed`)
      console.log(`[${requestId}] Result - Has data:`, !!data)
      console.log(`[${requestId}] Result - Has error:`, !!error)
      
      if (error) {
        console.log(`[${requestId}] ERROR DETAILS:`)
        console.log(`[${requestId}]   - code:`, error.code)
        console.log(`[${requestId}]   - message:`, error.message)
        console.log(`[${requestId}]   - details:`, error.details)
        console.log(`[${requestId}]   - hint:`, error.hint)
        console.log(`[${requestId}]   - Full error object:`, JSON.stringify(error, null, 2))
      }
      
      if (data) {
        console.log(`[${requestId}]   - Found data:`, JSON.stringify(data, null, 2))
      }

      logger.info(`[${requestId}] Database query completed`, { 
        hasData: !!data, 
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message 
      })

      if (error) {
        console.log(`[${requestId}] Returning error response`)
        logger.error(`[${requestId}] Error checking slug availability`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          slug
        })
        return NextResponse.json(
          { available: false, reason: 'Error checking availability' },
          { status: 500 }
        )
      }

      if (data) {
        console.log(`[${requestId}] Slug already taken, returning unavailable`)
        logger.info(`[${requestId}] Slug already taken`, { slug })
        return NextResponse.json({
          available: false,
          reason: 'This slug is already taken'
        })
      }

      console.log(`[${requestId}] Slug is available, returning success`)
      logger.info(`[${requestId}] Slug is available`, { slug })
      return NextResponse.json({
        available: true,
        reason: 'Slug is available'
      })
    } catch (adminError) {
      console.log(`[${requestId}] CAUGHT EXCEPTION in admin client block`)
      console.log(`[${requestId}] Exception type:`, typeof adminError)
      console.log(`[${requestId}] Exception instanceof Error:`, adminError instanceof Error)
      console.log(`[${requestId}] Exception:`, adminError)
      console.log(`[${requestId}] Exception stringified:`, JSON.stringify(adminError, Object.getOwnPropertyNames(adminError), 2))
      
      logger.error(`[${requestId}] Admin client error`, {
        error: adminError,
        errorType: typeof adminError,
        errorName: adminError instanceof Error ? adminError.name : 'unknown',
        errorMessage: adminError instanceof Error ? adminError.message : String(adminError),
        slug
      })
      return NextResponse.json(
        { available: false, reason: 'Database connection error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.log(`[${requestId}] CAUGHT EXCEPTION in outer block`)
    console.log(`[${requestId}] Exception type:`, typeof error)
    console.log(`[${requestId}] Exception:`, error)
    console.log(`[${requestId}] Exception stringified:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    logger.error(`[${requestId}] Unexpected error in check-slug`, {
      error,
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { available: false, reason: 'Unexpected error occurred' },
      { status: 500 }
    )
  } finally {
    console.log('='.repeat(80))
    console.log(`[CHECK-SLUG ${requestId}] REQUEST ENDED`)
    console.log('='.repeat(80))
  }
}

