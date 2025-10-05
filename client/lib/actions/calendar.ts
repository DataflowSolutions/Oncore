'use server'

import { createCalendarService } from '@/lib/services/calendar-sync'
import { z } from 'zod'

const exportCalendarSchema = z.object({
  orgId: z.string().uuid(),
  showIds: z.array(z.string().uuid()).optional(),
})

export async function exportToCalendar(data: z.infer<typeof exportCalendarSchema>) {
  const validation = exportCalendarSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    }
  }

  const { orgId, showIds } = validation.data

  try {
    const calendarService = await createCalendarService()
    return await calendarService.exportShowsToICalendar(orgId, showIds)
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Error exporting calendar:', err)
    return {
      success: false,
      error: err.message || 'Failed to export calendar',
    }
  }
}

const importCalendarSchema = z.object({
  orgId: z.string().uuid(),
  icalContent: z.string(),
})

export async function importFromCalendar(data: z.infer<typeof importCalendarSchema>) {
  const validation = importCalendarSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    }
  }

  const { orgId, icalContent } = validation.data

  try {
    const calendarService = await createCalendarService()
    return await calendarService.importICalendar(orgId, icalContent)
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Error importing calendar:', err)
    return {
      success: false,
      error: err.message || 'Failed to import calendar',
    }
  }
}
