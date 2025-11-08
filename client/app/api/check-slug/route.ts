import { NextRequest, NextResponse } from 'next/server'
import { isReservedSlug } from '@/lib/constants/reserved-slugs'
import { getSupabaseAdmin } from '@/lib/supabase/admin.server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')

    logger.info(`[${requestId}] Check slug request started`, { slug })

    if (!slug) {
      return NextResponse.json(
        { available: false, reason: 'Slug is required' },
        { status: 400 }
      )
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      logger.info(`[${requestId}] Slug format invalid`, { slug })
      return NextResponse.json({
        available: false,
        reason: 'Slug must contain only lowercase letters, numbers, and hyphens'
      })
    }

    // Check if slug is reserved
    if (isReservedSlug(slug)) {
      logger.info(`[${requestId}] Slug is reserved`, { slug })
      return NextResponse.json({
        available: false,
        reason: 'This slug is reserved and cannot be used'
      })
    }

    // Check if slug is already taken in the database
    // Use admin client to bypass RLS since user isn't a member yet
    try {
      logger.info(`[${requestId}] Getting admin client...`)
      const supabase = getSupabaseAdmin()
      logger.info(`[${requestId}] Admin client obtained, querying database...`)
      
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      logger.info(`[${requestId}] Database query completed`, { 
        hasData: !!data, 
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message 
      })

      if (error) {
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
        logger.info(`[${requestId}] Slug already taken`, { slug })
        return NextResponse.json({
          available: false,
          reason: 'This slug is already taken'
        })
      }

      logger.info(`[${requestId}] Slug is available`, { slug })
      return NextResponse.json({
        available: true,
        reason: 'Slug is available'
      })
    } catch (adminError) {
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
  }
}

