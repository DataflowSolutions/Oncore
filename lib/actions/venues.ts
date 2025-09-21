import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Get all venues for an organization
export async function getVenuesByOrg(orgId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) {
    console.error('Error fetching venues:', error)
    throw new Error(`Failed to fetch venues: ${error.message}`)
  }

  return data || []
}

// Search venues by name and city for an organization
export async function searchVenues(orgId: string, searchTerm: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('org_id', orgId)
    .or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
    .order('name')
    .limit(10)

  if (error) {
    console.error('Error searching venues:', error)
    throw new Error(`Failed to search venues: ${error.message}`)
  }

  return data || []
}

// Get venue details with shows
export async function getVenueDetails(venueId: string) {
  const supabase = await getSupabaseServer()
  
  // Get venue basic info
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single()

  if (venueError) {
    console.error('Error fetching venue:', venueError)
    throw new Error(`Failed to fetch venue: ${venueError.message}`)
  }

  // Get shows at this venue
  const { data: shows, error: showsError } = await supabase
    .from('shows')
    .select(`
      id,
      title,
      date,
      status,
      created_at
    `)
    .eq('venue_id', venueId)
    .order('date', { ascending: false })

  if (showsError) {
    console.error('Error fetching venue shows:', showsError)
    // Don't throw error, just return empty shows
  }

  return {
    venue,
    shows: shows || []
  }
}

// Get venues with show counts for an organization
export async function getVenuesWithShowCounts(orgId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('venues')
    .select(`
      *,
      shows:shows(count)
    `)
    .eq('org_id', orgId)
    .order('name')

  if (error) {
    console.error('Error fetching venues with show counts:', error)
    throw new Error(`Failed to fetch venues: ${error.message}`)
  }

  return data || []
}

// Create a new venue
export async function createVenue(formData: FormData) {
  try {
    const supabase = await getSupabaseServer()
    
    const rawData = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      country: formData.get('country') as string,
      capacity: formData.get('capacity') ? parseInt(formData.get('capacity') as string) : null,
      org_id: formData.get('org_id') as string,
      contacts: formData.get('contacts') ? JSON.parse(formData.get('contacts') as string) : null,
    }

    const { data, error } = await supabase
      .from('venues')
      .insert([rawData])
      .select()
      .single()

    if (error) {
      console.error('Error creating venue:', error)
      throw new Error(`Failed to create venue: ${error.message}`)
    }

    revalidatePath('/[org]/venues')
    revalidatePath('/[org]/shows')
    
    return { success: true, venue: data }
  } catch (error) {
    console.error('Error in createVenue:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create venue' 
    }
  }
}

// Update venue
export async function updateVenue(venueId: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServer()
    
    const rawData = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      country: formData.get('country') as string,
      capacity: formData.get('capacity') ? parseInt(formData.get('capacity') as string) : null,
      contacts: formData.get('contacts') ? JSON.parse(formData.get('contacts') as string) : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('venues')
      .update(rawData)
      .eq('id', venueId)
      .select()
      .single()

    if (error) {
      console.error('Error updating venue:', error)
      throw new Error(`Failed to update venue: ${error.message}`)
    }

    revalidatePath('/[org]/venues')
    revalidatePath('/[org]/shows')
    
    return { success: true, venue: data }
  } catch (error) {
    console.error('Error in updateVenue:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update venue' 
    }
  }
}

// Delete venue
export async function deleteVenue(venueId: string) {
  try {
    const supabase = await getSupabaseServer()
    
    // Check if venue has shows
    const { data: shows } = await supabase
      .from('shows')
      .select('id')
      .eq('venue_id', venueId)
      .limit(1)

    if (shows && shows.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete venue with existing shows. Please remove or move shows first.' 
      }
    }

    const { error } = await supabase
      .from('venues')
      .delete()
      .eq('id', venueId)

    if (error) {
      console.error('Error deleting venue:', error)
      throw new Error(`Failed to delete venue: ${error.message}`)
    }

    revalidatePath('/[org]/venues')
    
    return { success: true }
  } catch (error) {
    console.error('Error in deleteVenue:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete venue' 
    }
  }
}