'use client'
import { logger } from '@/lib/logger'

import { useState, useRef } from 'react'
import { Upload, File, Download, Plus, Trash2, Loader2, Pencil, Check, X, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createAdvancingDocument, deleteAdvancingDocument, updateAdvancingDocument } from '@/lib/actions/advancing'
import { uploadAdvancingFile, deleteAdvancingFile, getAdvancingFileUrl, renameAdvancingFile } from '@/lib/actions/advancing-files'
import { FilePreviewModal } from '@/components/advancing/FilePreviewModal'

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
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set())
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editingDocLabel, setEditingDocLabel] = useState('')
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingFileName, setEditingFileName] = useState('')
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Preview modal state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string>("")
  const [previewContentType, setPreviewContentType] = useState<string>("")
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const toggleDocumentExpanded = (docId: string) => {
    setExpandedDocIds(prev => {
      const next = new Set(prev)
      if (next.has(docId)) {
        next.delete(docId)
      } else {
        next.add(docId)
      }
      return next
    })
  }

  const startEditingDocument = (docId: string, currentLabel: string) => {
    setEditingDocId(docId)
    setEditingDocLabel(currentLabel || '')
  }

  const cancelEditingDocument = () => {
    setEditingDocId(null)
    setEditingDocLabel('')
  }

  const saveDocumentLabel = async (docId: string) => {
    if (!editingDocLabel.trim()) {
      cancelEditingDocument()
      return
    }

    try {
      const result = await updateAdvancingDocument(orgSlug, sessionId, docId, editingDocLabel)
      if (!result.success) {
        logger.error('Document rename failed', result.error)
        alert(`Rename failed: ${result.error}`)
      }
    } catch (error) {
      logger.error('Error renaming document', error)
      alert('Failed to rename document')
    } finally {
      cancelEditingDocument()
    }
  }

  const startEditingFile = (fileId: string, currentName: string) => {
    setEditingFileId(fileId)
    setEditingFileName(currentName || '')
  }

  const cancelEditingFile = () => {
    setEditingFileId(null)
    setEditingFileName('')
  }

  const saveFileName = async (fileId: string) => {
    if (!editingFileName.trim()) {
      cancelEditingFile()
      return
    }

    try {
      const result = await renameAdvancingFile(orgSlug, sessionId, fileId, editingFileName)
      if (!result.success) {
        logger.error('File rename failed', result.error)
        alert(`Rename failed: ${result.error}`)
      }
    } catch (error) {
      logger.error('Error renaming file', error)
      alert('Failed to rename file')
    } finally {
      cancelEditingFile()
    }
  }

  const handleCreateDocument = async () => {
    if (!newDocumentLabel.trim()) return

    setIsUploading(true)
    try {
      await createAdvancingDocument(orgSlug, sessionId, partyType, newDocumentLabel)
      setNewDocumentLabel('')
      setIsAddingDocument(false)
    } catch (error) {
      logger.error('Error creating document', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (documentId: string, file: File) => {
    setUploadingDocId(documentId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await uploadAdvancingFile(orgSlug, sessionId, documentId, formData)
      
      if (!result.success) {
        logger.error('File upload failed', result.error)
        alert(`Upload failed: ${result.error}`)
      }
    } catch (error) {
      logger.error('Error uploading file', error)
      alert('Failed to upload file')
    } finally {
      setUploadingDocId(null)
    }
  }

  const handleFileSelect = (documentId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    handleFileUpload(documentId, file)
  }

  const handleDrop = (documentId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileUpload(documentId, files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    
    setDeletingFileId(fileId)
    try {
      const result = await deleteAdvancingFile(orgSlug, sessionId, fileId)
      if (!result.success) {
        logger.error('File deletion failed', result.error)
        alert(`Delete failed: ${result.error}`)
      }
    } catch (error) {
      logger.error('Error deleting file', error)
      alert('Failed to delete file')
    } finally {
      setDeletingFileId(null)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document container and all its files?')) return
    
    setDeletingDocId(documentId)
    try {
      const result = await deleteAdvancingDocument(orgSlug, sessionId, documentId)
      if (!result.success) {
        logger.error('Document deletion failed', result.error)
        alert(`Delete failed: ${result.error}`)
      }
    } catch (error) {
      logger.error('Error deleting document', error)
      alert('Failed to delete document')
    } finally {
      setDeletingDocId(null)
    }
  }

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const result = await getAdvancingFileUrl(filePath)
      if (result.success && result.url) {
        // Force download by creating a link with download attribute
        const link = document.createElement('a')
        link.href = result.url
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        logger.error('Failed to get download URL', result.error)
        alert(`Download failed: ${result.error}`)
      }
    } catch (error) {
      logger.error('Error downloading file', error)
      alert('Failed to download file')
    }
  }

  const handlePreviewFile = async (filePath: string, fileName: string, contentType: string) => {
    setIsLoadingPreview(true)
    setPreviewFileName(fileName)
    setPreviewContentType(contentType)
    setIsPreviewModalOpen(true)
    
    try {
      const result = await getAdvancingFileUrl(filePath)
      if (result.success && result.url) {
        setPreviewUrl(result.url)
      } else {
        logger.error('Failed to get preview URL', result.error)
        alert(`Preview failed: ${result.error}`)
        setIsPreviewModalOpen(false)
      }
    } catch (error) {
      logger.error('Error loading preview', error)
      alert('Failed to load preview')
      setIsPreviewModalOpen(false)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const canPreview = (contentType: string) => {
    return (
      contentType.startsWith('image/') ||
      contentType.includes('pdf') ||
      contentType.includes('text/')
    )
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
            {documents.map((doc) => {
              const isExpanded = expandedDocIds.has(doc.id)
              const hasFiles = doc.files && doc.files.length > 0
              const isEditingDoc = editingDocId === doc.id
              
              return (
                <div
                  key={doc.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        
                        {isEditingDoc ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              type="text"
                              value={editingDocLabel}
                              onChange={(e) => setEditingDocLabel(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveDocumentLabel(doc.id)
                                if (e.key === 'Escape') cancelEditingDocument()
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => saveDocumentLabel(doc.id)}
                            >
                              <Check className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={cancelEditingDocument}
                            >
                              <X className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-medium truncate">
                              {doc.label || 'Untitled Document'}
                            </h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                              onClick={() => startEditingDocument(doc.id, doc.label || '')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        
                        {hasFiles && (
                          <Badge variant="secondary" className="text-xs">
                            {doc.files.length} {doc.files.length === 1 ? 'file' : 'files'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Files in this document */}
                      {hasFiles && (
                        <div className="space-y-2 ml-6">
                          {doc.files.map((file) => {
                            const isEditingThisFile = editingFileId === file.id
                            
                            return (
                              <div
                                key={file.id}
                                className="flex items-center justify-between text-sm bg-background p-2 rounded border"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-base flex-shrink-0">
                                    {getFileIcon(file.content_type || '')}
                                  </span>
                                  
                                  {isEditingThisFile ? (
                                    <div className="flex items-center gap-1 flex-1">
                                      <Input
                                        type="text"
                                        value={editingFileName}
                                        onChange={(e) => setEditingFileName(e.target.value)}
                                        className="h-6 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveFileName(file.id)
                                          if (e.key === 'Escape') cancelEditingFile()
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-1"
                                        onClick={() => saveFileName(file.id)}
                                      >
                                        <Check className="w-3 h-3 text-green-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-1"
                                        onClick={cancelEditingFile}
                                      >
                                        <X className="w-3 h-3 text-red-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="truncate font-medium">
                                        {file.original_name}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-1"
                                        onClick={() => startEditingFile(file.id, file.original_name || '')}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                  
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {formatFileSize(file.size_bytes || 0)}
                                  </Badge>
                                </div>
                                
                                <div className="flex gap-1 flex-shrink-0">
                                  {canPreview(file.content_type || '') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handlePreviewFile(
                                        file.storage_path,
                                        file.original_name || 'file',
                                        file.content_type || 'application/octet-stream'
                                      )}
                                      title="Preview"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadFile(file.storage_path, file.original_name || 'file')}
                                    title="Download"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteFile(file.id)}
                                    disabled={deletingFileId === file.id}
                                    title="Delete"
                                  >
                                    {deletingFileId === file.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Upload Area - collapsible when there are files */}
                      {(isExpanded || !hasFiles) && (
                        <div className="mt-3 ml-6">
                          <input
                            ref={(el) => {
                              fileInputRefs.current[doc.id] = el
                            }}
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileSelect(doc.id, e.target.files)}
                          />
                          <div
                            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                            onClick={() => fileInputRefs.current[doc.id]?.click()}
                            onDrop={(e) => handleDrop(doc.id, e)}
                            onDragOver={handleDragOver}
                          >
                            {uploadingDocId === doc.id ? (
                              <>
                                <Loader2 className="w-5 h-5 mx-auto mb-1 text-muted-foreground animate-spin" />
                                <p className="text-xs text-muted-foreground">
                                  Uploading...
                                </p>
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">
                                  Drop files here or click to upload
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Document actions */}
                    <div className="flex gap-1 ml-2">
                      {hasFiles && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleDocumentExpanded(doc.id)}
                          className="h-7 px-2"
                        >
                          {isExpanded ? (
                            <span className="text-xs">Hide upload</span>
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingDocId === doc.id}
                        className="h-7 px-2 text-destructive hover:text-destructive"
                      >
                        {deletingDocId === doc.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-2">
                    Created {new Date(doc.created_at).toLocaleDateString('en-US')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        fileUrl={previewUrl}
        fileName={previewFileName}
        contentType={previewContentType}
        isLoading={isLoadingPreview}
        onDownload={handleDownloadFile}
      />
    </div>
  )
}