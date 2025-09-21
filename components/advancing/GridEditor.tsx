'use client'

import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GridColumn {
  key: string
  label: string
  type: 'text' | 'email' | 'phone' | 'date' | 'time'
  placeholder?: string
  width?: string
}

interface GridRow {
  id: string
  [key: string]: string | number | boolean
}

interface GridEditorProps {
  title: string
  icon?: React.ReactNode
  columns: GridColumn[]
  data: GridRow[]
  onDataChange: (data: GridRow[]) => void
  addButtonText?: string
  maxRows?: number
  className?: string
  hideAddButton?: boolean
}

export function GridEditor({ 
  title, 
  icon, 
  columns, 
  data, 
  onDataChange, 
  addButtonText = "Add Row",
  maxRows,
  className = "",
  hideAddButton = false
}: GridEditorProps) {
  const [localData, setLocalData] = useState(data)

  const handleCellChange = (rowId: string, columnKey: string, value: string) => {
    const newData = localData.map(row => 
      row.id === rowId ? { ...row, [columnKey]: value } : row
    )
    setLocalData(newData)
    onDataChange(newData)
  }

  const addRow = () => {
    if (maxRows && localData.length >= maxRows) return
    
    const newRow: GridRow = {
      id: `row_${Date.now()}`,
      ...columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {})
    }
    
    const newData = [...localData, newRow]
    setLocalData(newData)
    onDataChange(newData)
  }

  const removeRow = (rowId: string) => {
    const newData = localData.filter(row => row.id !== rowId)
    setLocalData(newData)
    onDataChange(newData)
  }

  const formatPlaceholder = (placeholder: string, rowIndex: number) => {
    return placeholder.replace('{index}', (rowIndex + 1).toString())
  }

  if (localData.length === 0) {
    return (
      <div className={`border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30 ${className}`}>
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {icon && <div className="text-neutral-400">{icon}</div>}
              <h3 className="text-sm font-medium text-neutral-100">{title}</h3>
            </div>
            {!hideAddButton && (
              <Button
                onClick={addRow}
                size="sm"
                variant="outline"
                className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                {addButtonText}
              </Button>
            )}
          </div>
        </div>
        <div className="p-8 text-center text-neutral-500">
          <p className="text-sm">No entries yet. Click &ldquo;{addButtonText}&rdquo; to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30 ${className}`}>
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon && <div className="text-neutral-400">{icon}</div>}
            <h3 className="text-sm font-medium text-neutral-100">{title}</h3>
          </div>
          {!hideAddButton && (!maxRows || localData.length < maxRows) && (
            <Button
              onClick={addRow}
              size="sm"
              variant="outline"
              className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
            >
              <Plus className="w-4 h-4 mr-1" />
              {addButtonText}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/20">
              <th className="w-12 px-4 py-3 text-left">
                <span className="text-xs text-neutral-500">#</span>
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left"
                  style={column.width ? { width: column.width } : {}}
                >
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    {column.label}
                  </span>
                </th>
              ))}
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {localData.map((row, rowIndex) => (
              <tr key={row.id} className="border-b border-neutral-800/50 hover:bg-neutral-900/20">
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-500">{rowIndex + 1}</span>
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    <Input
                      type={column.type === 'phone' ? 'tel' : column.type === 'email' ? 'email' : 'text'}
                      value={String(row[column.key] || '')}
                      onChange={(e) => handleCellChange(row.id, column.key, e.target.value)}
                      placeholder={column.placeholder ? formatPlaceholder(column.placeholder, rowIndex) : ''}
                      className="bg-neutral-800/50 border-neutral-700 text-neutral-100 text-sm h-8 
                                focus:bg-neutral-800 focus:border-neutral-600 placeholder:text-neutral-500"
                    />
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Button
                    onClick={() => removeRow(row.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Predefined column configurations for common use cases
export const GRID_CONFIGS = {
  teamInfo: {
    title: 'Team Info',
    icon: <Users className="w-4 h-4" />,
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