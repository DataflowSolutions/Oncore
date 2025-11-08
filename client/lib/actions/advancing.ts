'use server'
import { logger } from '@/lib/logger'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database, Json } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'
import { cache } from 'react'
import crypto from 'crypto'
import { generateScheduleFromAdvancing } from './schedule'

type AdvancingSession = Database['public']['Tables']['advancing_sessions']['Row']
type AdvancingField = Database['public']['Tables']['advancing_fields']['Row']
type AdvancingFieldUpdate = Database['public']['Tables']['advancing_fields']['Update']
type AdvancingComment = Database['public']['Tables']['advancing_comments']['Row']
type AdvancingDocument = Database['public']['Tables']['advancing_documents']['Row']

// Session Management
export const getAdvancingSessions = cache(async (orgSlug: string) => {
  const supabase = await getSupabaseServer()
  
  // Get org_id from org slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()
    
  if (orgError || !org) {
    return []
  }
  
  const { data, error } = await supabase
    .from('advancing_sessions')
    .select(`
      *,
      shows (
        id,
        title,
        date,
        venues (
          name,
          city
        )
      )
    `)
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    
  if (error) {
    logger.error('Error fetching advancing sessions', error)
    return []
  }
  
  return data || []
})

export const getAdvancingSession = cache(async (sessionId: string): Promise<AdvancingSession | null> => {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('advancing_sessions')
    .select(`
      *,
      shows (
        id,
        title,
        date,
        venues (
          name,
          city,
          address
        ),
        artists (
          name
        )
      )
    `)
    .eq('id', sessionId)
    .single()
    
  if (error) {
    logger.error('Error fetching advancing session', error)
    return null
  }
  
  return data
})

export async function createAdvancingSession(
  orgSlug: string,
  sessionData: {
    showId: string
    title: string
    accessCode?: string
    expiresAt?: string
  }
): Promise<{ success: boolean; error?: string; data?: AdvancingSession }> {
  const supabase = await getSupabaseServer()
  
  // Get org_id from org slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()
    
  if (orgError || !org) {
    return { success: false, error: 'Organization not found' }
  }

  // Use the RPC function to create session (no access code - use invitation system)
  const { data, error } = await supabase
    .rpc('create_advancing_session', {
      p_show_id: sessionData.showId,
      p_org_id: org.id,
      p_title: sessionData.title
    })
    
  if (error) {
    logger.error('Error creating advancing session', error)
    return { success: false, error: error.message }
  }
  
  // The RPC returns the session data directly
  const result = data as { id: string }
  
  // Fetch the full session data
  const { data: session, error: fetchError } = await supabase
    .from('advancing_sessions')
    .select('*')
    .eq('id', result.id)
    .single()
  
  if (fetchError || !session) {
    logger.error('Error fetching created session', fetchError)
    return { success: false, error: 'Session created but could not be fetched' }
  }
  
  revalidatePath(`/${orgSlug}/shows/${sessionData.showId}/advancing`)
  
  return { 
    success: true, 
    data: session
  }
}

// Fields Management
export const getAdvancingFields = cache(async (sessionId: string): Promise<AdvancingField[]> => {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('advancing_fields')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })
    
  if (error) {
    logger.error('Error fetching advancing fields', error)
    return []
  }
  
  return data || []
})

export async function createAdvancingField(
  orgSlug: string,
  sessionId: string,
  fieldData: {
    section: string
    fieldName: string
    fieldType: string
    partyType: 'from_us' | 'from_you'
    value?: Json
    sortOrder?: number
  }
): Promise<{ success: boolean; error?: string; data?: AdvancingField }> {
  const supabase = await getSupabaseServer()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Get org_id from session
  const { data: session, error: sessionError } = await supabase
    .from('advancing_sessions')
    .select('org_id, show_id')
    .eq('id', sessionId)
    .single()
    
  if (sessionError || !session) {
    return { success: false, error: 'Session not found' }
  }

  // First, check if the field already exists
  const { data: existingField } = await supabase
    .from('advancing_fields')
    .select('id')
    .eq('session_id', sessionId)
    .eq('section', fieldData.section)
    .eq('field_name', fieldData.fieldName)
    .eq('party_type', fieldData.partyType)
    .single()

  if (existingField) {
    // Field exists, update it instead
    const { data: updatedData, error: updateError } = await supabase
      .from('advancing_fields')
      .update({
        value: fieldData.value || null,
        field_type: fieldData.fieldType,
        sort_order: fieldData.sortOrder || 1000
      })
      .eq('id', existingField.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating existing advancing field', updateError)
      return { success: false, error: updateError.message }
    }

    if (session.show_id) {
      revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
    }

    return { success: true, data: updatedData }
  }

  // Field doesn't exist, create it
  const { data, error } = await supabase
    .from('advancing_fields')
    .insert({
      org_id: session.org_id,
      session_id: sessionId,
      section: fieldData.section,
      field_name: fieldData.fieldName,
      field_type: fieldData.fieldType,
      value: fieldData.value || null,
      party_type: fieldData.partyType,
      sort_order: fieldData.sortOrder || 1000,
      created_by: user.id
    })
    .select()
    .single()
    
  if (error) {
    logger.error('Error creating advancing field', error)
    return { success: false, error: error.message }
  }
  
  if (session.show_id) {
    revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
  }
  
  return { success: true, data }
}

export async function updateAdvancingField(
  orgSlug: string,
  sessionId: string,
  fieldId: string,
  updates: AdvancingFieldUpdate
): Promise<{ success: boolean; error?: string; data?: AdvancingField }> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('advancing_fields')
    .update(updates)
    .eq('id', fieldId)
    .select()
    .single()
    
  if (error) {
    logger.error('Error updating advancing field', error)
    return { success: false, error: error.message }
  }
  
  // Fetch the session to get showId for revalidation
  const { data: sessionData } = await supabase
    .from('advancing_sessions')
    .select('show_id')
    .eq('id', sessionId)
    .single()
  
  if (sessionData?.show_id) {
    revalidatePath(`/${orgSlug}/shows/${sessionData.show_id}/advancing/${sessionId}`)
  }
  
  return { success: true, data }
}

// Comment Management
export async function getAdvancingComments(fieldId: string): Promise<AdvancingComment[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('advancing_comments')
    .select('*')
    .eq('field_id', fieldId)
    .order('created_at', { ascending: true })
    
  if (error) {
    logger.error('Error fetching advancing comments', error)
    return []
  }
  
  return data || []
}

export async function createAdvancingComment(
  orgSlug: string,
  sessionId: string,
  fieldId: string,
  body: string,
  authorName?: string
): Promise<{ success: boolean; error?: string; data?: AdvancingComment }> {
  const supabase = await getSupabaseServer()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get org_id and show_id from session
  const { data: session, error: sessionError } = await supabase
    .from('advancing_sessions')
    .select('org_id, show_id')
    .eq('id', sessionId)
    .single()
    
  if (sessionError || !session) {
    return { success: false, error: 'Session not found' }
  }

  const { data, error } = await supabase
    .from('advancing_comments')
    .insert({
      org_id: session.org_id,
      field_id: fieldId,
      author_id: user?.id || null,
      author_name: authorName || user?.email || 'Anonymous',
      body
    })
    .select()
    .single()
    
  if (error) {
    logger.error('Error creating advancing comment', error)
    return { success: false, error: error.message }
  }
  
  if (session.show_id) {
    revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
  }
  
  return { success: true, data }
}

// Document Management
type AdvancingDocumentWithFiles = AdvancingDocument & {
  files: Array<{
    id: string
    original_name: string | null
    content_type: string | null
    size_bytes: number | null
    storage_path: string
    created_at: string
  }>
}

export async function getAdvancingDocuments(sessionId: string): Promise<AdvancingDocumentWithFiles[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('advancing_documents')
    .select(`
      *,
      files (
        id,
        original_name,
        content_type,
        size_bytes,
        storage_path,
        created_at
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    
  if (error) {
    logger.error('Error fetching advancing documents', error)
    return []
  }
  
  return data || []
}

export async function createAdvancingDocument(
  orgSlug: string,
  sessionId: string,
  partyType: 'from_us' | 'from_you',
  label?: string
): Promise<{ success: boolean; error?: string; data?: AdvancingDocument }> {
  const supabase = await getSupabaseServer()
  
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

  const { data, error } = await supabase
    .from('advancing_documents')
    .insert({
      org_id: session.org_id,
      session_id: sessionId,
      party_type: partyType,
      label: label || null,
      created_by: user.id
    })
    .select()
    .single()
    
  if (error) {
    logger.error('Error creating advancing document', error)
    return { success: false, error: error.message }
  }
  
  if (session.show_id) {
    revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
  }
  
  return { success: true, data }
}

export async function updateAdvancingDocument(
  orgSlug: string,
  sessionId: string,
  documentId: string,
  label: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Get show_id from session for revalidation
  const { data: session } = await supabase
    .from('advancing_sessions')
    .select('show_id')
    .eq('id', sessionId)
    .single()

  // Update the document label
  const { error } = await supabase
    .from('advancing_documents')
    .update({ label })
    .eq('id', documentId)
    
  if (error) {
    logger.error('Error updating advancing document', error)
    return { success: false, error: error.message }
  }
  
  if (session?.show_id) {
    revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
  }
  
  return { success: true }
}

export async function deleteAdvancingDocument(
  orgSlug: string,
  sessionId: string,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Get show_id from session for revalidation
  const { data: session } = await supabase
    .from('advancing_sessions')
    .select('show_id')
    .eq('id', sessionId)
    .single()

  // Delete the document (files will be cascade deleted via database constraint)
  const { error } = await supabase
    .from('advancing_documents')
    .delete()
    .eq('id', documentId)
    
  if (error) {
    logger.error('Error deleting advancing document', error)
    return { success: false, error: error.message }
  }
  
  if (session?.show_id) {
    revalidatePath(`/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`)
  }
  
  return { success: true }
}

// Grid Data Management - OPTIMIZED with cache
export const loadAdvancingGridData = cache(async (
  sessionId: string,
  gridType: 'team' | 'arrival_flight' | 'departure_flight',
  teamMemberIds: string[]
): Promise<Array<{ id: string; [key: string]: string | number | boolean }>> => {
  const supabase = await getSupabaseServer()
  
  try {
    // Get all fields for this session that match the grid type pattern
    const { data: fields, error } = await supabase
      .from('advancing_fields')
      .select('field_name, value')
      .eq('session_id', sessionId)
      .like('field_name', `${gridType}_%`)
      
    if (error) {
      logger.error('Error loading grid data', error)
      return teamMemberIds.map(id => ({ id: `${gridType}_${id}` }))
    }
    
    // Group fields by row ID and build grid data
    const gridData: { [rowId: string]: { id: string; [key: string]: string | number | boolean } } = {}
    
    teamMemberIds.forEach(memberId => {
      const rowId = `${gridType}_${memberId}`
      gridData[rowId] = { id: rowId }
    })
    
    fields?.forEach(field => {
      // Parse field name: gridType_rowId_columnKey
      const parts = field.field_name.split('_')
      if (parts.length >= 3) {
        const rowId = parts.slice(0, -1).join('_') // Everything except the last part
        const columnKey = parts[parts.length - 1] // Last part is the column key
        
        if (gridData[rowId]) {
          gridData[rowId][columnKey] = String(field.value || '')
        }
      }
    })
    
    return Object.values(gridData)
    
  } catch (error) {
    logger.error('Error loading grid data', error)
    return teamMemberIds.map(id => ({ id: `${gridType}_${id}` }))
  }
})

export async function saveAdvancingGridData(
  orgSlug: string,
  sessionId: string,
  showId: string,
  gridType: 'team' | 'arrival_flight' | 'departure_flight',
  gridData: Array<{ id: string; [key: string]: string | number | boolean }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer()
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get org_id from session
    const { data: session, error: sessionError } = await supabase
      .from('advancing_sessions')
      .select('org_id')
      .eq('id', sessionId)
      .single()
      
    if (sessionError || !session) {
      return { success: false, error: 'Session not found' }
    }

    // OPTIMIZED: Fetch ALL existing fields for this grid type at once
    const { data: existingFields } = await supabase
      .from('advancing_fields')
      .select('id, field_name')
      .eq('session_id', sessionId)
      .like('field_name', `${gridType}_%`)

    // Create lookup map for O(1) access
    const existingMap = new Map(
      existingFields?.map(f => [f.field_name, f.id]) || []
    )

    // Prepare batch operations
    const toInsert: Array<{
      org_id: string
      session_id: string
      section: string
      field_name: string
      field_type: string
      value: Json
      party_type: 'from_us' | 'from_you'
      sort_order: number
      created_by: string
    }> = []
    
    const toUpdate: Array<{ id: string; value: Json }> = []

    // Process each row of grid data
    for (const row of gridData) {
      for (const [columnKey, value] of Object.entries(row)) {
        if (columnKey === 'id' || !value) continue
        
        // Extract person ID from row.id
        const rowIdStr = String(row.id)
        const gridTypePrefix = `${gridType}_`
        const personId = rowIdStr.startsWith(gridTypePrefix) 
          ? rowIdStr.substring(gridTypePrefix.length)
          : rowIdStr
        
        const fieldName = `${gridType}_${personId}_${columnKey}`
        const section = gridType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        
        const existingId = existingMap.get(fieldName)
        
        if (existingId) {
          // Add to update batch
          toUpdate.push({ id: existingId, value: String(value) })
        } else {
          // Add to insert batch
          toInsert.push({
            org_id: session.org_id,
            session_id: sessionId,
            section,
            field_name: fieldName,
            field_type: 'text',
            value: String(value),
            party_type: 'from_you',
            sort_order: 1000,
            created_by: user.id
          })
        }
      }
    }

    // OPTIMIZED: Batch insert (single query instead of N)
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('advancing_fields')
        .insert(toInsert)
      
      if (error) {
        logger.error('Batch insert error', error)
        return { success: false, error: error.message }
      }
    }

    // OPTIMIZED: Batch update - process in chunks of 100
    if (toUpdate.length > 0) {
      const chunkSize = 100
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const chunk = toUpdate.slice(i, i + chunkSize)
        
        // Use individual updates but in parallel
        const updatePromises = chunk.map(u => 
          supabase
            .from('advancing_fields')
            .update({ value: u.value })
            .eq('id', u.id)
        )
        
        const results = await Promise.all(updatePromises)
        const errors = results.filter(r => r.error).map(r => r.error)
        
        if (errors.length > 0) {
          logger.error('Batch update errors', errors)
          return { success: false, error: `Failed to update ${errors.length} fields` }
        }
      }
    }
    
    // Generate schedule items if this is flight data
    if (gridType.includes('flight')) {
      try {
        await generateScheduleFromAdvancing(orgSlug, showId, sessionId)
      } catch (error) {
        logger.error('Failed to generate schedule from grid data', error)
        // Don't fail the save if schedule generation fails
      }
    }
    
    revalidatePath(`/${orgSlug}/shows/${showId}/advancing/${sessionId}`)
    return { success: true }
    
  } catch (error) {
    logger.error('Error saving grid data', error)
    return { success: false, error: 'Failed to save grid data' }
  }
}

// Access Code Verification (for external collaborators)
export async function verifyAccessCode(
  accessCode: string
): Promise<{ success: boolean; sessionId?: string; showId?: string; error?: string }> {
  const supabase = await getSupabaseServer()
  
  const accessCodeHash = crypto.createHash('sha256').update(accessCode).digest('hex')
  
  const { data: session, error } = await supabase
    .from('advancing_sessions')
    .select('id, show_id, expires_at')
    .eq('access_code_hash', accessCodeHash)
    .single()
    
  if (error || !session) {
    return { success: false, error: 'Invalid access code' }
  }
  
  // Check if session has expired
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return { success: false, error: 'Access code has expired' }
  }
  
  return { success: true, sessionId: session.id, showId: session.show_id }
}