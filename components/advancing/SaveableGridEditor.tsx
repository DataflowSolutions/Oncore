'use client'

import { useState } from 'react'
import { Plus, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SmartTimeInput, SmartDateInput } from '@/components/ui/smart-inputs'
import { saveAdvancingGridData } from '@/lib/actions/advancing'

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

interface SaveableGridEditorProps {
  title: string
  gridType: 'team' | 'arrival_flight' | 'departure_flight'
  icon?: React.ReactNode
  columns: GridColumn[]
  data: GridRow[]
  onDataChange: (data: GridRow[]) => void
  addButtonText?: string
  maxRows?: number
  className?: string
  hideAddButton?: boolean
  orgSlug: string
  sessionId: string
  showId?: string
}

export function SaveableGridEditor({ 
  title, 
  gridType,
  icon, 
  columns, 
  data, 
  onDataChange, 
  addButtonText = "Add Row",
  maxRows,
  className = "",
  hideAddButton = false,
  orgSlug,
  sessionId,
  showId
}: SaveableGridEditorProps) {
  const [localData, setLocalData] = useState(data)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleCellChange = (rowId: string, columnKey: string, value: string) => {
    const newData = localData.map(row => 
      row.id === rowId ? { ...row, [columnKey]: value } : row
    )
    setLocalData(newData)
    setHasUnsavedChanges(true)
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
    setHasUnsavedChanges(true)
    onDataChange(newData)
  }

  const handleSave = async () => {
    if (!showId) {
      console.error('Cannot save without showId')
      return
    }
    
    setIsSaving(true)
    try {
      const result = await saveAdvancingGridData(
        orgSlug,
        sessionId,
        showId,
        gridType,
        localData.filter(row => {
          // Only save rows that have at least one non-empty value
          return Object.entries(row).some(([key, value]) => 
            key !== 'id' && value && String(value).trim() !== ''
          )
        })
      )
      
      if (result.success) {
        setHasUnsavedChanges(false)
        // Show success feedback briefly
        setTimeout(() => {
          // Could add a success toast here
        }, 1000)
      } else {
        console.error('Failed to save grid data:', result.error)
      }
    } catch (error) {
      console.error('Error saving grid data:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatPlaceholder = (placeholder: string, rowIndex: number) => {
    return placeholder.replace('{index}', (rowIndex + 1).toString())
  }

  const renderInput = (column: GridColumn, row: GridRow, rowIndex: number) => {
    const value = String(row[column.key] || '')
    const placeholder = column.placeholder ? formatPlaceholder(column.placeholder, rowIndex) : ''

    if (column.type === 'time') {
      return (
        <SmartTimeInput
          value={value}
          onChange={(newValue) => handleCellChange(row.id, column.key, newValue)}
          className="w-full"
        />
      )
    }

    if (column.type === 'date') {
      return (
        <SmartDateInput
          value={value}
          onChange={(newValue) => handleCellChange(row.id, column.key, newValue)}
          className="w-full"
        />
      )
    }

    return (
      <Input
        type={column.type === 'email' ? 'email' : column.type === 'phone' ? 'tel' : 'text'}
        value={value}
        onChange={(e) => handleCellChange(row.id, column.key, e.target.value)}
        placeholder={placeholder}
        className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder-neutral-500 focus:border-neutral-600"
      />
    )
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
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Button
                onClick={handleSave}
                size="sm"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
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
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className="text-left p-3 text-xs font-medium text-neutral-300 uppercase tracking-wider bg-neutral-900/50"
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localData.map((row, rowIndex) => (
              <tr key={row.id} className="border-b border-neutral-800 hover:bg-neutral-900/20">
                {columns.map((column) => (
                  <td key={column.key} className="p-3">
                    {renderInput(column, row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}