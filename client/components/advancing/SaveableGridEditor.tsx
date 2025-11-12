'use client'
import { logger } from '@/lib/logger'

import { useState, useEffect } from 'react'
import { Plus, Save, Loader2, Copy, Clipboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SmartTimeInput, SmartDateInput } from '@/components/ui/smart-inputs'
import { saveAdvancingGridData } from '@/lib/actions/advancing'
import type { GridColumn } from './constants/grid-config'

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
  partyType?: 'from_us' | 'from_you'
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
  showId,
  partyType = 'from_you'
}: SaveableGridEditorProps) {
  const [localData, setLocalData] = useState(data)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedData, setCopiedData] = useState<Record<string, string> | null>(null)

  // Update local data when prop data changes (e.g., on refresh with loaded data)
  useEffect(() => {
    setLocalData(data)
    setHasUnsavedChanges(false)
  }, [data])

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
      logger.error('Cannot save without showId')
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
        }),
        partyType
      )
      
      if (result.success) {
        setHasUnsavedChanges(false)
        // Show success feedback briefly
        setTimeout(() => {
          // Could add a success toast here
        }, 1000)
      } else {
        logger.error('Failed to save grid data', result.error)
      }
    } catch (error) {
      logger.error('Error saving grid data', error)
    } finally {
      setIsSaving(false)
    }
  }

  const copyRow = (rowId: string) => {
    const row = localData.find(r => r.id === rowId)
    if (!row) return

    // Copy all non-empty fields except id
    const dataToCopy: Record<string, string> = {}
    Object.entries(row).forEach(([key, value]) => {
      if (key !== 'id' && value && String(value).trim() !== '') {
        dataToCopy[key] = String(value)
      }
    })
    
    setCopiedData(dataToCopy)
  }

  const pasteRow = (rowId: string) => {
    if (!copiedData || Object.keys(copiedData).length === 0) return

    const newData = localData.map(row => {
      if (row.id === rowId) {
        return { ...row, ...copiedData }
      }
      return row
    })
    setLocalData(newData)
    setHasUnsavedChanges(true)
    onDataChange(newData)
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
                variant="outline"
                className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
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
              <th className="text-right p-3 w-24 text-xs font-medium text-neutral-300 uppercase tracking-wider bg-neutral-900/50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {localData.map((row, rowIndex) => (
              <tr 
                key={row.id} 
                className="border-b border-neutral-800 hover:bg-neutral-900/20"
              >
                {columns.map((column) => (
                  <td key={column.key} className="p-3">
                    {renderInput(column, row, rowIndex)}
                  </td>
                ))}
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-neutral-800 cursor-pointer"
                      onClick={() => copyRow(row.id)}
                      title="Copy this row"
                    >
                      <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                      onClick={() => pasteRow(row.id)}
                      disabled={!copiedData}
                      title="Paste copied data"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-neutral-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}