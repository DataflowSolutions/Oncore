'use client'

import { useState } from 'react'
import { Upload, File, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createAdvancingDocument } from '@/lib/actions/advancing'

interface DocumentsBoxProps {
  sessionId: string
  orgSlug: string
  partyType: 'from_us' | 'from_you'
  documents: Array<{
    id: string
    label: string | null
    party_type: 'from_us' | 'from_you'
    created_at: string
    files: Array<{
      id: string
      original_name: string | null
      content_type: string | null
      size_bytes: number | null
      storage_path: string
      created_at: string
    }>
  }>
  title: string
}

export function DocumentsBox({ 
  sessionId, 
  orgSlug, 
  partyType, 
  documents, 
  title 
}: DocumentsBoxProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [newDocumentLabel, setNewDocumentLabel] = useState('')
  const [isAddingDocument, setIsAddingDocument] = useState(false)

  const handleCreateDocument = async () => {
    if (!newDocumentLabel.trim()) return

    setIsUploading(true)
    try {
      await createAdvancingDocument(orgSlug, sessionId, partyType, newDocumentLabel)
      setNewDocumentLabel('')
      setIsAddingDocument(false)
    } catch (error) {
      console.error('Error creating document:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return '🖼️'
    if (contentType.includes('pdf')) return '📄'
    if (contentType.includes('word')) return '📝'
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊'
    return '📎'
  }

  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-100">{title}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-500">
              {documents.length} documents
            </span>
            {!isAddingDocument && (
              <Button
                size="sm"
                onClick={() => setIsAddingDocument(true)}
                className="h-7 px-3 text-xs bg-white text-black hover:bg-neutral-200"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Add Document Form */}
        {isAddingDocument && (
          <div className="space-y-3 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div>
              <label className="text-sm font-medium">Document Label</label>
              <Input
                type="text"
                value={newDocumentLabel}
                onChange={(e) => setNewDocumentLabel(e.target.value)}
                placeholder="e.g., Tech Rider, Hospitality Requirements"
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateDocument}
                disabled={isUploading || !newDocumentLabel.trim()}
              >
                {isUploading ? 'Creating...' : 'Create Document'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingDocument(false)
                  setNewDocumentLabel('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Documents List */}
        {documents.length === 0 && !isAddingDocument ? (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents yet</p>
            <p className="text-xs">Add a document to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <h4 className="font-medium truncate">
                        {doc.label || 'Untitled Document'}
                      </h4>
                    </div>
                    
                    {/* Files in this document */}
                    {doc.files && doc.files.length > 0 && (
                      <div className="space-y-2 ml-6">
                        {doc.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between text-sm bg-background p-2 rounded border"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-base">
                                {getFileIcon(file.content_type || '')}
                              </span>
                              <span className="truncate font-medium">
                                {file.original_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {formatFileSize(file.size_bytes || 0)}
                              </Badge>
                            </div>
                            
                            <Button size="sm" variant="ghost" className="flex-shrink-0">
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload Area for this document */}
                    <div className="mt-3 ml-6">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
                        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Drop files here or click to upload
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  Created {new Date(doc.created_at).toLocaleDateString('en-US')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}