'use server'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { RESERVED_SLUGS } from '@/lib/constants/reserved-slugs'

const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  slug: z.string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .refine((slug) => !RESERVED_SLUGS.includes(slug as never), {
      message: 'This slug is reserved and cannot be used',
    }),
})

export async function createOrganization(formData: FormData) {
  const data = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
  }

  let validatedData
  try {
    validatedData = createOrgSchema.parse(data)
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        error: error.issues.map((issue) => issue.message).join(', ')
      }
    }
    return {
      error: 'Invalid input data.'
    }
  }

  try {
    const supabase = await getSupabaseServer()
    
    logger.info('Creating organization', {
      name: validatedData.name,
      slug: validatedData.slug
    })
    
    // Call the RPC function - let the DB unique constraint handle race conditions
    const { data: orgId, error } = await supabase
      .rpc('app_create_organization_with_owner', {
        org_name: validatedData.name,
        org_slug: validatedData.slug
      })

    logger.info('RPC call completed', {
      hasData: !!orgId,
      data: orgId,
      hasError: !!error,
      error: error
    })

    if (error) {
      logger.error('Failed to create organization', error)
      
      // PostgreSQL unique violation error code
      if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique')) {
        return {
          error: `The slug "${validatedData.slug}" is already taken. Please choose a different one.`
        }
      }
      
      return {
        error: 'Failed to create organization. Please try again.'
      }
    }
    
  } catch (error) {
    logger.error('Error creating organization', error)
    
    // Catch any PostgreSQL errors that might bubble up
    const pgError = error as { code?: string; message?: string }
    if (pgError.code === '23505' || pgError.message?.includes('duplicate key') || pgError.message?.includes('unique')) {
      return {
        error: `The slug "${validatedData.slug}" is already taken. Please choose a different one.`
      }
    }
    
    return {
      error: 'An unexpected error occurred. Please try again.'
    }
  }

  // If we reach here, organization was created successfully
  redirect(`/${validatedData.slug}`)
}