'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { RESERVED_SLUGS } from '@/lib/constants/reserved-slugs'

const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  slug: z.string()
    .min(1, 'Organization slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .refine((slug) => !RESERVED_SLUGS.includes(slug as never), {
      message: 'This slug is reserved and cannot be used',
    }),
})

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/sign-in')
  }

  const validation = createOrgSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug')
  })

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { name, slug } = validation.data

  try {
    // Use the RPC function - let the DB unique constraint handle race conditions
    const { data: orgId, error } = await supabase.rpc('app_create_organization_with_owner', {
      org_name: name,
      org_slug: slug
    })

    if (error) {
      // PostgreSQL unique violation error code
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique')) {
        return { error: `The slug "${slug}" is already taken. Please choose a different one.` }
      }
      throw error
    }

    return { success: true, orgId }
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    
    // Catch any PostgreSQL errors that might bubble up
    if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique')) {
      return { error: `The slug "${slug}" is already taken. Please choose a different one.` }
    }
    
    return { error: 'Failed to create organization' }
  }
}