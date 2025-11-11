import { NextRequest, NextResponse } from 'next/server'
import { isReservedSlug } from '@/lib/constants/reserved-slugs'
import { getSupabaseAdmin } from '@/lib/supabase/admin.server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')

    logger.info('Check slug request', { slug })

    if (!slug) {
      return NextResponse.json(
        { available: false, reason: 'Slug is required' },
        { status: 400 }
      )
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      logger.info('Slug format invalid', { slug })
      return NextResponse.json({
        available: false,
        reason: 'Slug must contain only lowercase letters, numbers, and hyphens'
      })
    }

    // Check if slug is reserved
    if (isReservedSlug(slug)) {
      logger.info('Slug is reserved', { slug })
      return NextResponse.json({
        available: false,
        reason: 'This slug is reserved and cannot be used'
      })
    }

    // Check if slug is already taken in the database
    // Use admin client to bypass RLS since user isn't a member yet
    try {
      const supabase = getSupabaseAdmin()
      
      const { data, error } = await supabase
        .rpc('check_slug_available', { slug_to_check: slug })

      if (error) {
        logger.error('Error checking slug availability', {
          code: error.code,
          message: error.message,
          slug
        })
        return NextResponse.json(
          { available: false, reason: 'Error checking availability' },
          { status: 500 }
        )
      }

      // data is a boolean: true = available, false = taken
      const isAvailable = data === true

      if (!isAvailable) {
        logger.info('Slug already taken', { slug })
        return NextResponse.json({
          available: false,
          reason: 'This slug is already taken'
        })
      }

      logger.info('Slug is available', { slug })
      return NextResponse.json({
        available: true,
        reason: 'Slug is available'
      })
    } catch (adminError) {
      logger.error('Admin client error', {
        error: adminError,
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
    logger.error('Unexpected error in check-slug', {
      error,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { available: false, reason: 'Unexpected error occurred' },
      { status: 500 }
    )
  }
}

