import type { ShowStatus, VenueContact, VenueContactsValue } from './types'

export const statusLabel: Record<ShowStatus, string> = {
  confirmed: 'Confirmed',
  draft: 'Draft',
  cancelled: 'Cancelled',
}

export const statusVariant: Record<ShowStatus, 'default' | 'secondary' | 'destructive'> = {
  confirmed: 'default',
  draft: 'secondary',
  cancelled: 'destructive',
}

export function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00Z`))
  } catch {
    return value
  }
}

export function formatTime(value: string | null) {
  if (!value) return 'TBD'

  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return 'TBD'
  }
}

export function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatScheduleRange(start: string, end: string | null) {
  const startTime = formatDateTime(start)
  if (!end) {
    return startTime
  }

  try {
    const endTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(end))

    return `${startTime} → ${endTime}`
  } catch {
    return startTime
  }
}

export function parseVenueContacts(value: VenueContactsValue): VenueContact[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((contact): contact is Record<string, unknown> =>
      typeof contact === 'object' && contact !== null && !Array.isArray(contact),
    )
    .map((contact) => ({
      name: typeof contact['name'] === 'string' ? (contact['name'] as string) : undefined,
      role: typeof contact['role'] === 'string' ? (contact['role'] as string) : undefined,
      email: typeof contact['email'] === 'string' ? (contact['email'] as string) : undefined,
      phone: typeof contact['phone'] === 'string' ? (contact['phone'] as string) : undefined,
    }))
    .filter((contact) => Object.values(contact).some(Boolean))
}
