'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  slug: z.string().min(1, 'Organization slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
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
    // Use the new RPC function that creates org and assigns creator as owner
    const { data: orgId, error } = await supabase.rpc('app_create_organization_with_owner', {
      org_name: name,
      org_slug: slug
    })

    if (error) throw error

    return { success: true, orgId }
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === '23505') {
      return { error: 'Organization slug already exists' }
    }
    return { error: 'Failed to create organization' }
  }
}