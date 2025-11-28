'use server'

import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// =====================================
// TYPES
// =====================================

export interface ActionResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface Promoter {
  id: string
  org_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  city: string | null
  country: string | null
  notes: string | null
  status: 'active' | 'inactive'
  type: 'promoter' | 'agent' | 'manager' | 'vendor' | 'other'
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface PromoterWithVenues extends Promoter {
  venues?: Array<{
    id: string
    name: string
    city: string | null
    is_primary: boolean
  }>
}

export interface VenuePromoterLink {
  id: string
  venue_id: string
  contact_id: string // Updated from promoter_id to match new schema
  is_primary: boolean
  notes: string | null
  created_at: string
}

// =====================================
// VALIDATION SCHEMAS
// =====================================

/**
 * Helper: Get org slug from org ID for revalidation using RPC
 */
async function getOrgSlug(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc('get_org_by_id', {
    p_org_id: orgId
  })
  
  return data?.slug || null
}

const createPromoterSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  type: z.enum(['promoter', 'agent', 'manager', 'vendor', 'other']).default('promoter'),
})

const updatePromoterSchema = z.object({
  promoterId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

const linkPromoterToVenueSchema = z.object({
  venueId: z.string().uuid(),
  promoterId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
})

// =====================================
// READ OPERATIONS
// =====================================

/**
 * Get all promoters for an organization
 */
export async function getPromotersByOrg(
  orgId: string
): Promise<ActionResponse<PromoterWithVenues[]>> {
  const supabase = await createClient()

  try {
    const { data: promoters, error } = await supabase
      .from('contacts')
      .select(`
        *,
        venue_contacts (
          venue_id,
          is_primary,
          venues (
            id,
            name,
            city
          )
        )
      `)
      .eq('org_id', orgId)
      .eq('type', 'promoter')
      .eq('status', 'active')
      .order('name')

    if (error) {
      logger.error('Error fetching promoters', error)
      return {
        success: false,
        error: `Failed to fetch promoters: ${error.message}`,
      }
    }

    // Transform the data to include venues array
    const transformedPromoters = (promoters || []).map((promoter) => ({
      ...promoter,
      venues: promoter.venue_contacts?.map((vp) => ({
        id: vp.venues.id,
        name: vp.venues.name,
        city: vp.venues.city,
        is_primary: vp.is_primary,
      })) || [],
      venue_contacts: undefined, // Remove the nested structure
    })) as PromoterWithVenues[]

    return {
      success: true,
      data: transformedPromoters,
    }
  } catch (error) {
    logger.error('Error in getPromotersByOrg', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    }
  }
}

/**
 * Get all promoters linked to a specific venue
 */
export async function getPromotersByVenue(
  venueId: string
): Promise<ActionResponse<(Promoter & { is_primary?: boolean })[]>> {
  const supabase = await createClient()

  try {
    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_promoters_by_venue', {
      p_venue_id: venueId
    })

    if (error) {
      logger.error('Error fetching venue promoters', error)
      return {
        success: false,
        error: `Failed to fetch venue promoters: ${error.message}`,
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    logger.error('Error in getPromotersByVenue', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    }
  }
}

/**
 * Get a single promoter by ID with all linked venues
 */
export async function getPromoterById(promoterId: string): Promise<PromoterWithVenues | null> {
  const supabase = await createClient()

  const { data: promoter, error } = await supabase
    .from('contacts')
    .select(`
      *,
      venue_contacts (
        venue_id,
        is_primary,
        venues (
          id,
          name,
          city,
          country
        )
      )
    `)
    .eq('id', promoterId)
    .eq('type', 'promoter')
    .single()

  if (error) {
    logger.error('Error fetching promoter', error)
    return null
  }

  return {
    ...promoter,
    venues: promoter.venue_contacts?.map((vp) => ({
      id: vp.venues.id,
      name: vp.venues.name,
      city: vp.venues.city,
      is_primary: vp.is_primary,
    })) || [],
  } as PromoterWithVenues
}

// =====================================
// CREATE OPERATIONS
// =====================================

/**
 * Create a new promoter
 */
export async function createPromoter(data: z.infer<typeof createPromoterSchema>) {
  const supabase = await createClient()

  // Validate session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Authentication required' }
  }

  // Validate input
  const validation = createPromoterSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    }
  }

  const { orgId, ...promoterData } = validation.data

  // Verify user has access to this org using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any).rpc('get_org_membership', {
    p_org_id: orgId
  })

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  try {
    const { data: promoter, error } = await supabase
      .from('contacts')
      .insert({
        org_id: orgId,
        ...promoterData,
        type: 'promoter', // Ensure type is set correctly
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Get org slug for revalidation
    const orgSlug = await getOrgSlug(supabase, orgId)
    if (orgSlug) {
      revalidatePath(`/${orgSlug}/venues`, 'page')
      revalidatePath(`/${orgSlug}/people/partners`, 'page')
    }
    
    return {
      success: true,
      data: promoter,
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error('Error creating promoter', err)
    return {
      success: false,
      error: err.message || 'Failed to create promoter',
    }
  }
}

/**
 * Link a promoter to a venue
 */
export async function linkPromoterToVenue(data: z.infer<typeof linkPromoterToVenueSchema>) {
  const supabase = await createClient()

  // Validate session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Authentication required' }
  }

  // Validate input
  const validation = linkPromoterToVenueSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    }
  }

  const { venueId, promoterId, isPrimary, notes } = validation.data

  // Verify venue exists and user has access
  const { data: venue } = await supabase
    .from('venues')
    .select('org_id')
    .eq('id', venueId)
    .single()

  if (!venue) {
    return { success: false, error: 'Venue not found' }
  }

  // Verify user has access using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any).rpc('get_org_membership', {
    p_org_id: venue.org_id
  })

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  try {
    // If setting as primary, unset other primary contacts for this venue
    if (isPrimary) {
      await supabase
        .from('venue_contacts')
        .update({ is_primary: false })
        .eq('venue_id', venueId)
    }

    const { data: link, error } = await supabase
      .from('venue_contacts')
      .insert({
        venue_id: venueId,
        contact_id: promoterId,
        is_primary: isPrimary,
        notes,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Get org slug for revalidation
    const orgSlug = await getOrgSlug(supabase, venue.org_id)
    if (orgSlug) {
      revalidatePath(`/${orgSlug}/venues/${venueId}`, 'page')
      revalidatePath(`/${orgSlug}/venues`, 'page')
      revalidatePath(`/${orgSlug}/people/partners`, 'page')
    }
    
    return {
      success: true,
      data: link,
    }
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string }
    logger.error('Error linking promoter to venue', err)
    
    if (err.code === '23505') {
      return {
        success: false,
        error: 'This promoter is already linked to this venue',
      }
    }
    
    return {
      success: false,
      error: err.message || 'Failed to link promoter to venue',
    }
  }
}

// =====================================
// UPDATE OPERATIONS
// =====================================

/**
 * Update a promoter
 */
export async function updatePromoter(data: z.infer<typeof updatePromoterSchema>) {
  const supabase = await createClient()

  // Validate session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Authentication required' }
  }

  // Validate input
  const validation = updatePromoterSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    }
  }

  const { promoterId, ...updates } = validation.data

  // Get promoter to verify org access
  const { data: promoter } = await supabase
    .from('contacts')
    .select('org_id')
    .eq('id', promoterId)
    .eq('type', 'promoter')
    .single()

  if (!promoter) {
    return { success: false, error: 'Promoter not found' }
  }

  // Verify user has access using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any).rpc('get_org_membership', {
    p_org_id: promoter.org_id
  })

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  try {
    const { data: updated, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', promoterId)
      .select()
      .single()

    if (error) throw error

    // Get org slug for revalidation
    const orgSlug = await getOrgSlug(supabase, promoter.org_id)
    if (orgSlug) {
      revalidatePath(`/${orgSlug}/venues`, 'page')
      revalidatePath(`/${orgSlug}/people/partners`, 'page')
    }
    
    return {
      success: true,
      data: updated,
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error('Error updating promoter', err)
    return {
      success: false,
      error: err.message || 'Failed to update promoter',
    }
  }
}

// =====================================
// DELETE OPERATIONS
// =====================================

/**
 * Delete a promoter (soft delete by setting status to inactive)
 */
export async function deletePromoter(promoterId: string) {
  const supabase = await createClient()

  // Validate session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Authentication required' }
  }

  // Get promoter to verify org access
  const { data: promoter } = await supabase
    .from('contacts')
    .select('org_id')
    .eq('id', promoterId)
    .eq('type', 'promoter')
    .single()

  if (!promoter) {
    return { success: false, error: 'Promoter not found' }
  }

  // Verify user has access using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any).rpc('get_org_membership', {
    p_org_id: promoter.org_id
  })

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  try {
    // Soft delete by setting status to inactive
    const { error } = await supabase
      .from('contacts')
      .update({ status: 'inactive' })
      .eq('id', promoterId)

    if (error) throw error

    // Get org slug for revalidation
    const orgSlug = await getOrgSlug(supabase, promoter.org_id)
    if (orgSlug) {
      revalidatePath(`/${orgSlug}/venues`, 'page')
      revalidatePath(`/${orgSlug}/people/partners`, 'page')
    }
    
    return { success: true }
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error('Error deleting promoter', err)
    return {
      success: false,
      error: err.message || 'Failed to delete promoter',
    }
  }
}

/**
 * Unlink a promoter from a venue
 */
export async function unlinkPromoterFromVenue(venueId: string, promoterId: string) {
  const supabase = await createClient()

  // Validate session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Authentication required' }
  }

  // Verify venue exists and user has access
  const { data: venue } = await supabase
    .from('venues')
    .select('org_id')
    .eq('id', venueId)
    .single()

  if (!venue) {
    return { success: false, error: 'Venue not found' }
  }

  // Verify user has access using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any).rpc('get_org_membership', {
    p_org_id: venue.org_id
  })

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  try {
    const { error } = await supabase
      .from('venue_contacts')
      .delete()
      .eq('venue_id', venueId)
      .eq('contact_id', promoterId)

    if (error) throw error

    // Get org slug for revalidation
    const orgSlug = await getOrgSlug(supabase, venue.org_id)
    if (orgSlug) {
      revalidatePath(`/${orgSlug}/venues/${venueId}`, 'page')
      revalidatePath(`/${orgSlug}/venues`, 'page')
      revalidatePath(`/${orgSlug}/people/partners`, 'page')
    }
    
    return { success: true }
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error('Error unlinking promoter from venue', err)
    return {
      success: false,
      error: err.message || 'Failed to unlink promoter from venue',
    }
  }
}

/**
 * Search promoters by name, company, city, or email
 */
export async function searchPromoters(
  orgId: string, 
  query: string = ''
): Promise<ActionResponse<Promoter[]>> {
  const supabase = await createClient()

  try {
    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('search_promoters', {
      p_org_id: orgId,
      p_query: query || ''
    })

    if (error) {
      logger.error('Error searching promoters', error)
      return {
        success: false,
        error: `Failed to search promoters: ${error.message}`,
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    logger.error('Error in searchPromoters', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    }
  }
}
