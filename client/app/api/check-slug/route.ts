import { NextRequest, NextResponse } from 'next/server'
import { isReservedSlug } from '@/lib/constants/reserved-slugs'
import { getSupabaseAdmin } from '@/lib/supabase/admin.server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { available: false, reason: 'Slug is required' },
        { status: 400 }
      )
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json({
        available: false,
        reason: 'Slug must contain only lowercase letters, numbers, and hyphens'
      })
    }

    // Check if slug is reserved
    if (isReservedSlug(slug)) {
      return NextResponse.json({
        available: false,
        reason: 'This slug is reserved and cannot be used'
      })
    }

    // Check if slug is already taken in the database
    // Use admin client to bypass RLS since user isn't a member yet
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('Error checking slug availability:', error)
      return NextResponse.json(
        { available: false, reason: 'Error checking availability' },
        { status: 500 }
      )
    }

    if (data) {
      return NextResponse.json({
        available: false,
        reason: 'This slug is already taken'
      })
    }

    return NextResponse.json({
      available: true,
      reason: 'Slug is available'
    })
  } catch (error) {
    console.error('Unexpected error in check-slug:', error)
    return NextResponse.json(
      { available: false, reason: 'Unexpected error occurred' },
      { status: 500 }
    )
  }
}
