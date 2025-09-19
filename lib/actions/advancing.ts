'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { Database, Json } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

type AdvancingSession = Database['public']['Tables']['advancing_sessions']['Row']
type AdvancingField = Database['public']['Tables']['advancing_fields']['Row']
type AdvancingFieldUpdate = Database['public']['Tables']['advancing_fields']['Update']
type AdvancingComment = Database['public']['Tables']['advancing_comments']['Row']
type AdvancingDocument = Database['public']['Tables']['advancing_documents']['Row']

// Session Management
export async function getAdvancingSessions(orgSlug: string) {
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
    console.error('Error fetching advancing sessions:', error)
    return []
  }
  
  return data || []
}

export async function getAdvancingSession(sessionId: string): Promise<AdvancingSession | null> {
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
    console.error('Error fetching advancing session:', error)
    return null
  }
  
  return data
}

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

  // Hash the access code if provided
  let accessCodeHash = null
  if (sessionData.accessCode) {
    accessCodeHash = crypto.createHash('sha256').update(sessionData.accessCode).digest('hex')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  const { data, error } = await supabase
    .from('advancing_sessions')
    .insert({
      org_id: org.id,
      show_id: sessionData.showId,
      title: sessionData.title,
      access_code_hash: accessCodeHash,
      expires_at: sessionData.expiresAt || null,
      created_by: user.id
    })
    .select()
    .single()
    
  if (error) {
    console.error('Error creating advancing session:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/advancing`)
  return { success: true, data }
}

// Field Management
export async function getAdvancingFields(sessionId: string): Promise<AdvancingField[]> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .from('advancing_fields')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })
    
  if (error) {
    console.error('Error fetching advancing fields:', error)
    return []
  }
  
  return data || []
}

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
    .select('org_id')
    .eq('id', sessionId)
    .single()
    
  if (sessionError || !session) {
    return { success: false, error: 'Session not found' }
  }

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
    console.error('Error creating advancing field:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/advancing/${sessionId}`)
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
    console.error('Error updating advancing field:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/advancing/${sessionId}`)
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
    console.error('Error fetching advancing comments:', error)
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
  
  // Get org_id from session
  const { data: session, error: sessionError } = await supabase
    .from('advancing_sessions')
    .select('org_id')
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
    console.error('Error creating advancing comment:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/advancing/${sessionId}`)
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
    console.error('Error fetching advancing documents:', error)
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

  // Get org_id from session
  const { data: session, error: sessionError } = await supabase
    .from('advancing_sessions')
    .select('org_id')
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
    console.error('Error creating advancing document:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/${orgSlug}/advancing/${sessionId}`)
  return { success: true, data }
}

// Access Code Verification (for external collaborators)
export async function verifyAccessCode(
  accessCode: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const supabase = await getSupabaseServer()
  
  const accessCodeHash = crypto.createHash('sha256').update(accessCode).digest('hex')
  
  const { data: session, error } = await supabase
    .from('advancing_sessions')
    .select('id, expires_at')
    .eq('access_code_hash', accessCodeHash)
    .single()
    
  if (error || !session) {
    return { success: false, error: 'Invalid access code' }
  }
  
  // Check if session has expired
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return { success: false, error: 'Access code has expired' }
  }
  
  return { success: true, sessionId: session.id }
}