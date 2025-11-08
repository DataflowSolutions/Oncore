'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

/**
 * Upload a file to an advancing document
 */
export async function uploadAdvancingFile(
  orgSlug: string,
  sessionId: string,
  documentId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; fileId?: string }> {
  const supabase = await getSupabaseServer()

  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get org_id and show_id from session
    const { data: session, error: sessionError } = await supabase
      .from('advancing_sessions')
      .select('org_id, show_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return { success: false, error: 'Session not found' }
    }

    // Verify document belongs to this session
    const { data: document, error: docError } = await supabase
      .from('advancing_documents')
      .select('id')
      .eq('id', documentId)
      .eq('session_id', sessionId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${session.org_id}/shows/${session.show_id}/advancing/${sessionId}/${fileName}`

    // Upload file to storage with metadata for RLS
    const { error: uploadError } = await supabase.storage
      .from('advancing-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
        metadata: {
          org_id: session.org_id,
          show_id: session.show_id,
          session_id: sessionId,
          document_id: documentId,
        },
      })

    if (uploadError) {
      logger.error('Error uploading file to storage', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Create file record in database
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        org_id: session.org_id,
        session_id: sessionId,
        document_id: documentId,
        storage_path: filePath,
        original_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
        uploaded_by: user.id,
      })
      .select('id')
      .single()

    if (fileError) {
      logger.error('Error creating file record', fileError)
      // Try to clean up the uploaded file
      await supabase.storage.from('advancing-files').remove([filePath])
      return { success: false, error: fileError.message }
    }

    // Log activity
    await supabase
      .from('activity_log')
      .insert({
        org_id: session.org_id,
        user_id: user.id,
        action: 'uploaded',
        resource_type: 'file',
        resource_id: fileRecord.id,
        details: {
          file_name: file.name,
          file_size: file.size,
          session_id: sessionId,
          document_id: documentId,
        },
      })

    if (session.show_id) {
      revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
    }

    return { success: true, fileId: fileRecord.id }
  } catch (error) {
    logger.error('Error uploading file', error)
    return { success: false, error: 'Failed to upload file' }
  }
}

/**
 * Delete a file from an advancing document
 */
export async function deleteAdvancingFile(
  orgSlug: string,
  sessionId: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()

  try {
    // Get file info and session info
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('storage_path, org_id, session_id')
      .eq('id', fileId)
      .eq('session_id', sessionId)
      .single()

    if (fileError || !file) {
      return { success: false, error: 'File not found' }
    }

    // Get show_id from session
    const { data: session } = await supabase
      .from('advancing_sessions')
      .select('show_id')
      .eq('id', file.session_id!)
      .single()

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('advancing-files')
      .remove([file.storage_path])

    if (storageError) {
      logger.error('Error deleting file from storage', storageError)
      // Continue anyway to delete the database record
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      logger.error('Error deleting file record', deleteError)
      return { success: false, error: deleteError.message }
    }

    if (session?.show_id) {
      revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
    }

    return { success: true }
  } catch (error) {
    logger.error('Error deleting file', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

/**
 * Rename a file
 */
export async function renameAdvancingFile(
  orgSlug: string,
  sessionId: string,
  fileId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Verify file belongs to this session
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('id, session_id')
      .eq('id', fileId)
      .eq('session_id', sessionId)
      .single()

    if (fileError || !file) {
      return { success: false, error: 'File not found' }
    }

    // Get show_id from session
    const { data: session } = await supabase
      .from('advancing_sessions')
      .select('show_id')
      .eq('id', file.session_id!)
      .single()

    // Update the original_name
    const { error: updateError } = await supabase
      .from('files')
      .update({ original_name: newName })
      .eq('id', fileId)

    if (updateError) {
      logger.error('Error renaming file', updateError)
      return { success: false, error: updateError.message }
    }

    if (session?.show_id) {
      revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
    }

    return { success: true }
  } catch (error) {
    logger.error('Error renaming file', error)
    return { success: false, error: 'Failed to rename file' }
  }
}

/**
 * Get download URL for a file
 */
export async function getAdvancingFileUrl(
  filePath: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  const supabase = await getSupabaseServer()

  try {
    const { data, error } = await supabase.storage
      .from('advancing-files')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) {
      logger.error('Error creating signed URL', error)
      return { success: false, error: error.message }
    }

    return { success: true, url: data.signedUrl }
  } catch (error) {
    logger.error('Error getting file URL', error)
    return { success: false, error: 'Failed to get file URL' }
  }
}