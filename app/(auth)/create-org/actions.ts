'use server'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
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
    
    // Check if slug is already taken
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('slug')
      .eq('slug', validatedData.slug)
      .single()

    if (existingOrg) {
      return {
        error: `The slug "${validatedData.slug}" is already taken. Please choose a different one.`
      }
    }
    
    // Call the RPC function we created in the database
    const { error } = await supabase
      .rpc('app_create_organization_with_owner', {
        org_name: validatedData.name,
        org_slug: validatedData.slug
      })

    if (error) {
      console.error('Failed to create organization:', error)
      // Check if it's a duplicate key error
      if (error.message.includes('duplicate key') || error.message.includes('unique')) {
        return {
          error: `The slug "${validatedData.slug}" is already taken. Please choose a different one.`
        }
      }
      return {
        error: 'Failed to create organization. Please try again.'
      }
    }
    
  } catch (error) {
    console.error('Error creating organization:', error)
    return {
      error: 'An unexpected error occurred. Please try again.'
    }
  }

  // If we reach here, organization was created successfully
  redirect(`/${validatedData.slug}`)
}