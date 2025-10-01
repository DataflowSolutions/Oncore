export interface GridColumn {
  key: string
  label: string
  type: 'text' | 'email' | 'phone' | 'date' | 'time'
  placeholder?: string
  width?: string
}

export interface GridConfig {
  title: string
  columns: GridColumn[]
  addButtonText: string
}

// Predefined column configurations for common use cases
export const GRID_CONFIGS = {
  teamInfo: {
    title: 'Team Info',
    columns: [
      { key: 'name', label: 'Name', type: 'text' as const, placeholder: 'Full name', width: '25%' },
      { key: 'phone', label: 'Phone', type: 'phone' as const, placeholder: 'Phone number', width: '20%' },
      { key: 'email', label: 'Email', type: 'email' as const, placeholder: 'Email address', width: '30%' },
      { key: 'role', label: 'Role', type: 'text' as const, placeholder: 'Job title/role', width: '25%' }
    ],
    addButtonText: 'Add Team Member'
  },
  
  team: {
    title: 'Team',
    columns: [
      { key: 'rooming', label: 'Rooming', type: 'text' as const, placeholder: 'Room preferences', width: '20%' },
      { key: 'luggage', label: 'Luggage', type: 'text' as const, placeholder: 'Luggage details', width: '20%' },
      { key: 'visa', label: 'Visa / Immigration Docs', type: 'text' as const, placeholder: 'Visa status', width: '20%' },
      { key: 'passport', label: 'Passport Docs', type: 'text' as const, placeholder: 'Passport info', width: '20%' },
      { key: 'credentials', label: 'Credentials', type: 'text' as const, placeholder: 'Work credentials', width: '20%' }
    ],
    addButtonText: 'Add Team Member'
  },

  arrivalFlight: {
    title: 'Arrival Flight',
    columns: [
      { key: 'flightNumber', label: 'Flight Number', type: 'text' as const, placeholder: 'e.g. AA123', width: '15%' },
      { key: 'departureTime', label: 'Departure Time', type: 'time' as const, placeholder: 'HH:MM', width: '12%' },
      { key: 'departureDate', label: 'Departure Date', type: 'date' as const, placeholder: 'YYYY-MM-DD', width: '15%' },
      { key: 'fromCity', label: 'From City', type: 'text' as const, placeholder: 'Origin city', width: '15%' },
      { key: 'arrivalTime', label: 'Arrival Time', type: 'time' as const, placeholder: 'HH:MM', width: '12%' },
      { key: 'arrivalDate', label: 'Arrival Date', type: 'date' as const, placeholder: 'YYYY-MM-DD', width: '15%' },
      { key: 'toCity', label: 'To City', type: 'text' as const, placeholder: 'Destination city', width: '16%' }
    ],
    addButtonText: 'Add Flight'
  },

  departureFlight: {
    title: 'Departure Flight',
    columns: [
      { key: 'flightNumber', label: 'Flight Number', type: 'text' as const, placeholder: 'e.g. AA456', width: '15%' },
      { key: 'departureTime', label: 'Departure Time', type: 'time' as const, placeholder: 'HH:MM', width: '12%' },
      { key: 'departureDate', label: 'Departure Date', type: 'date' as const, placeholder: 'YYYY-MM-DD', width: '15%' },
      { key: 'fromCity', label: 'From City', type: 'text' as const, placeholder: 'Origin city', width: '15%' },
      { key: 'arrivalTime', label: 'Arrival Time', type: 'time' as const, placeholder: 'HH:MM', width: '12%' },
      { key: 'arrivalDate', label: 'Arrival Date', type: 'date' as const, placeholder: 'YYYY-MM-DD', width: '15%' },
      { key: 'toCity', label: 'To City', type: 'text' as const, placeholder: 'Destination city', width: '16%' }
    ],
    addButtonText: 'Add Flight'
  }
} as const
