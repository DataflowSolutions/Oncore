'use server'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
})

export async function createOrganization(formData: FormData) {
  try {
    const data = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
    }

    const validatedData = createOrgSchema.parse(data)
    
    const supabase = await getSupabaseServer()
    
    // Check if slug is already taken
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('slug')
      .eq('slug', validatedData.slug)
      .single()

    if (existingOrg) {
      throw new Error(`The slug "${validatedData.slug}" is already taken. Please choose a different one.`)
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
        throw new Error(`The slug "${validatedData.slug}" is already taken. Please choose a different one.`)
      }
      throw new Error('Failed to create organization')
    }

    // Redirect to the new org
    redirect(`/${validatedData.slug}`)
    
  } catch (error) {
    console.error('Error creating organization:', error)
    // In a real app, you'd show user-friendly error messages
    throw error
  }
}