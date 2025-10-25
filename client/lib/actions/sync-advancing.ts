'use server'

import { createClient } from '@/app/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Sync advancing data (flights, hotel times, etc.) to schedule_items
 * This makes advancing data visible in the calendar view
 */
export async function syncAdvancingToSchedule(showId: string) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Authentication required' }
  }

  try {
    // Get the show and org
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, org_id, date')
      .eq('id', showId)
      .single()

    if (showError || !show) {
      throw new Error('Show not found')
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', show.org_id)
      .eq('user_id', session.user.id)
      .single()

    if (!membership) {
      return { success: false, error: 'Access denied' }
    }

    // Get advancing session
    const { data: advSession, error: sessionError } = await supabase
      .from('advancing_sessions')
      .select('id')
      .eq('show_id', showId)
      .single()

    if (sessionError || !advSession) {
      return { success: false, error: 'No advancing session found for this show' }
    }

    // Get all advancing fields
    const { data: fields, error: fieldsError } = await supabase
      .from('advancing_fields')
      .select('field_name, value')
      .eq('session_id', advSession.id)

    if (fieldsError || !fields) {
      return { success: false, error: 'Failed to fetch advancing data' }
    }

    // Get assigned people for this show
    const { data: assignments } = await supabase
      .from('show_assignments')
      .select(`
        person_id,
        duty,
        people (
          id,
          name
        )
      `)
      .eq('show_id', showId)

    const scheduleItemsToCreate: Array<{
      org_id: string
      show_id: string
      starts_at: string
      ends_at?: string
      title: string
      location?: string
      notes?: string
      person_id?: string
      item_type?: string
    }> = []

    // Parse arrival and departure flights
    assignments?.forEach(assignment => {
      const personId = assignment.person_id
      const personName = assignment.people?.name || 'Unknown'

      // Arrival flight
      const arrivalDate = fields.find(f => f.field_name === `arrival_flight_${personId}_arrivalDate`)?.value
      const arrivalTime = fields.find(f => f.field_name === `arrival_flight_${personId}_arrivalTime`)?.value
      const arrivalFlightNumber = fields.find(f => f.field_name === `arrival_flight_${personId}_flightNumber`)?.value
      const arrivalFrom = fields.find(f => f.field_name === `arrival_flight_${personId}_fromCity`)?.value
      const arrivalTo = fields.find(f => f.field_name === `arrival_flight_${personId}_toCity`)?.value

      if (arrivalDate && arrivalTime) {
        scheduleItemsToCreate.push({
          org_id: show.org_id,
          show_id: showId,
          starts_at: `${arrivalDate}T${arrivalTime}:00Z`,
          title: `✈️ ${personName} - Arrival`,
          location: arrivalTo ? `${arrivalTo} Airport` : undefined,
          notes: arrivalFlightNumber 
            ? `Flight ${arrivalFlightNumber}${arrivalFrom ? ` from ${arrivalFrom}` : ''}`
            : undefined,
          person_id: personId,
          item_type: 'arrival'
        })
      }

      // Departure flight
      const departureDate = fields.find(f => f.field_name === `departure_flight_${personId}_departureDate`)?.value
      const departureTime = fields.find(f => f.field_name === `departure_flight_${personId}_departureTime`)?.value
      const departureFlightNumber = fields.find(f => f.field_name === `departure_flight_${personId}_flightNumber`)?.value
      const departureFrom = fields.find(f => f.field_name === `departure_flight_${personId}_fromCity`)?.value
      const departureTo = fields.find(f => f.field_name === `departure_flight_${personId}_toCity`)?.value

      if (departureDate && departureTime) {
        scheduleItemsToCreate.push({
          org_id: show.org_id,
          show_id: showId,
          starts_at: `${departureDate}T${departureTime}:00Z`,
          title: `✈️ ${personName} - Departure`,
          location: departureFrom ? `${departureFrom} Airport` : undefined,
          notes: departureFlightNumber 
            ? `Flight ${departureFlightNumber}${departureTo ? ` to ${departureTo}` : ''}`
            : undefined,
          person_id: personId,
          item_type: 'departure'
        })
      }

      // Hotel check-in/check-out
      const hotelCheckIn = fields.find(f => f.field_name === `hotel_${personId}_checkIn`)?.value as string | undefined
      const hotelCheckOut = fields.find(f => f.field_name === `hotel_${personId}_checkOut`)?.value as string | undefined
      const hotelName = fields.find(f => f.field_name === `hotel_${personId}_name`)?.value as string | undefined
      const hotelAddress = fields.find(f => f.field_name === `hotel_${personId}_address`)?.value as string | undefined

      if (hotelCheckIn) {
        scheduleItemsToCreate.push({
          org_id: show.org_id,
          show_id: showId,
          starts_at: hotelCheckIn.includes('T') ? hotelCheckIn : `${hotelCheckIn}T15:00:00Z`,
          ends_at: hotelCheckOut 
            ? (hotelCheckOut.includes('T') ? hotelCheckOut : `${hotelCheckOut}T11:00:00Z`)
            : undefined,
          title: `🏨 ${personName} - Hotel`,
          location: hotelName || 'Hotel',
          notes: hotelAddress || undefined,
          person_id: personId,
          item_type: 'hotel'
        })
      }
    })

    // Delete existing auto-generated schedule items (flights, hotels) for this show
    await supabase
      .from('schedule_items')
      .delete()
      .eq('show_id', showId)
      .in('item_type', ['arrival', 'departure', 'hotel'])

    // Insert new schedule items
    if (scheduleItemsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('schedule_items')
        .insert(scheduleItemsToCreate)

      if (insertError) {
        throw insertError
      }
    }

    revalidatePath(`/[org]/shows/${showId}/day`, 'page')

    return {
      success: true,
      data: {
        itemsCreated: scheduleItemsToCreate.length,
        message: `Successfully synced ${scheduleItemsToCreate.length} items to calendar`
      }
    }

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Error syncing advancing to schedule:', err)
    return {
      success: false,
      error: err.message || 'Failed to sync advancing data'
    }
  }
}
