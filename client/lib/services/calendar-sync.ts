import { logger } from '@/lib/logger'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type CalendarEvent = {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  organizer?: {
    email?: string
    displayName?: string
  }
}

export class CalendarService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Sync calendar events to schedule_items
   */
  async syncCalendarEvents(orgId: string, events: CalendarEvent[], syncRunId: string | null = null) {
    try {
      console.log('[CalendarService] Syncing events', { orgId, eventCount: events.length, syncRunId });
      
      // Convert calendar events to the format expected by the RPC
      const scheduleItems = events.map(event => {
        const startsAt = event.start.dateTime || `${event.start.date}T00:00:00Z`
        const endsAt = event.end.dateTime || `${event.end.date}T23:59:59Z`

        return {
          title: event.summary,
          starts_at: startsAt,
          ends_at: endsAt,
          location: event.location || null,
          notes: event.description || null,
          external_calendar_id: event.id,
        }
      })

      console.log('[CalendarService] Prepared schedule items', { 
        count: scheduleItems.length,
        sample: scheduleItems[0] 
      });

      // Use RPC to bypass RLS issues
      const { data, error } = await this.supabase.rpc('import_calendar_events', {
        p_org_id: orgId,
        p_events: scheduleItems,
        p_sync_run_id: syncRunId ?? undefined
      })

      if (error) {
        console.error('[CalendarService] RPC error', error);
        throw error
      }

      const result = data?.[0] || { inserted: 0, updated: 0, total: 0 }
      console.log('[CalendarService] Sync complete', result);

      return { 
        success: true, 
        count: result.total,
        inserted: result.inserted,
        updated: result.updated
      }
    } catch (error: unknown) {
      const err = error as { message?: string }
      logger.error('Error syncing calendar events', err)
      console.error('[CalendarService] Sync failed', err);
      return {
        success: false,
        error: err.message || 'Failed to sync calendar events',
      }
    }
  }

  /**
   * Export shows to iCalendar format
   */
  async exportShowsToICalendar(orgId: string, showIds?: string[]) {
    try {
      let query = this.supabase
        .from('shows')
        .select(`
          id,
          title,
          date,
          notes,
          venue:venues(name, address, city, state),
          schedule_items(title, starts_at, ends_at, location, notes)
        `)
        .eq('org_id', orgId)

      if (showIds && showIds.length > 0) {
        query = query.in('id', showIds)
      }

      const { data: shows, error } = await query

      if (error) throw error

      // Generate iCalendar format
      const ical = this.generateICalendar(shows)

      return { success: true, data: ical }
    } catch (error: unknown) {
      const err = error as { message?: string }
      logger.error('Error exporting to iCalendar', err)
      return {
        success: false,
        error: err.message || 'Failed to export calendar',
      }
    }
  }

  /**
   * Generate iCalendar (.ics) format
   */
  private generateICalendar(shows: unknown[]): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    let ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Oncore//Tour Management//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ].join('\r\n')

    shows.forEach((show: any) => {
      const showDate = new Date(show.date)
      const dateStr = showDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      
      const venue = show.venue
      const location = venue 
        ? `${venue.name}${venue.address ? ', ' + venue.address : ''}${venue.city ? ', ' + venue.city : ''}${venue.state ? ', ' + venue.state : ''}`
        : ''

      ical += '\r\n' + [
        'BEGIN:VEVENT',
        `UID:show-${show.id}@oncore.app`,
        `DTSTAMP:${now}`,
        `DTSTART:${dateStr}`,
        `SUMMARY:${this.escapeICalText(show.title)}`,
        location ? `LOCATION:${this.escapeICalText(location)}` : '',
        show.notes ? `DESCRIPTION:${this.escapeICalText(show.notes)}` : '',
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].filter(Boolean).join('\r\n')

      // Add schedule items for this show
      if (show.schedule_items && Array.isArray(show.schedule_items)) {
        show.schedule_items.forEach((item: any) => {
          const startDate = new Date(item.starts_at)
          const endDate = new Date(item.ends_at)
          const startStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
          const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

          ical += '\r\n' + [
            'BEGIN:VEVENT',
            `UID:schedule-${item.id}@oncore.app`,
            `DTSTAMP:${now}`,
            `DTSTART:${startStr}`,
            `DTEND:${endStr}`,
            `SUMMARY:${this.escapeICalText(item.title)}`,
            item.location ? `LOCATION:${this.escapeICalText(item.location)}` : '',
            item.notes ? `DESCRIPTION:${this.escapeICalText(item.notes)}` : '',
            'STATUS:CONFIRMED',
            'END:VEVENT',
          ].filter(Boolean).join('\r\n')
        })
      }
    })

    ical += '\r\nEND:VCALENDAR'

    return ical
  }

  /**
   * Escape special characters for iCalendar format
   */
  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  /**
   * Parse iCalendar format and import events
   */
  async importICalendar(orgId: string, icalContent: string, syncRunId: string | null = null) {
    try {
      const events = this.parseICalendar(icalContent)
      return await this.syncCalendarEvents(orgId, events, syncRunId)
    } catch (error: unknown) {
      const err = error as { message?: string }
      logger.error('Error importing iCalendar', err)
      return {
        success: false,
        error: err.message || 'Failed to import calendar',
      }
    }
  }

  /**
   * Basic iCalendar parser
   */
  private parseICalendar(icalContent: string): CalendarEvent[] {
    const events: CalendarEvent[] = []
    const lines = icalContent.split(/\r?\n/)
    
    let currentEvent: Partial<CalendarEvent> | null = null

    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        currentEvent = { start: {}, end: {} }
      } else if (line.startsWith('END:VEVENT') && currentEvent) {
        if (currentEvent.id && currentEvent.summary) {
          events.push(currentEvent as CalendarEvent)
        }
        currentEvent = null
      } else if (currentEvent) {
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':')

        if (key === 'UID') {
          currentEvent.id = value
        } else if (key === 'SUMMARY') {
          currentEvent.summary = this.unescapeICalText(value)
        } else if (key === 'DESCRIPTION') {
          currentEvent.description = this.unescapeICalText(value)
        } else if (key === 'LOCATION') {
          currentEvent.location = this.unescapeICalText(value)
        } else if (key.startsWith('DTSTART')) {
          currentEvent.start = { dateTime: this.parseICalDate(value) }
        } else if (key.startsWith('DTEND')) {
          currentEvent.end = { dateTime: this.parseICalDate(value) }
        }
      }
    }

    return events
  }

  /**
   * Parse iCalendar date format
   */
  private parseICalDate(dateStr: string): string {
    // Format: 20231215T193000Z -> 2023-12-15T19:30:00Z
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    const hour = dateStr.substring(9, 11)
    const minute = dateStr.substring(11, 13)
    const second = dateStr.substring(13, 15)

    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  }

  /**
   * Unescape iCalendar text
   */
  private unescapeICalText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
  }
}

/**
 * Create a calendar service instance
 */
export async function createCalendarService() {
  const supabase = await createClient()
  return new CalendarService(supabase)
}
