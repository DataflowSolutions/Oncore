'use server'
import { logger } from '@/lib/logger'

import { createClient } from '@/app/utils/supabase/server'
import { parseContractFromURL } from '@/lib/services/contract-parser'
import { z } from 'zod'

const uploadFileSchema = z.object({
  bucket: z.string().default('files'),
  orgId: z.string().uuid(),
  showId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  fieldId: z.string().uuid().optional(),
  partyType: z.enum(['from_us', 'from_you']).optional(),
})

export async function uploadFile(
  file: File,
  params: z.infer<typeof uploadFileSchema>
) {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { error: 'Authentication required' }
  }

  const validation = uploadFileSchema.safeParse(params)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { bucket, orgId, showId, sessionId, documentId, fieldId, partyType } = validation.data

  try {
    // Use Edge Function for enforced metadata uploads
    const formData = new FormData()
    formData.append('file', file)
    formData.append('orgId', orgId)
    formData.append('bucket', bucket)
    
    if (showId) formData.append('showId', showId)
    if (sessionId) formData.append('sessionId', sessionId)
    if (documentId) formData.append('documentId', documentId)
    if (fieldId) formData.append('fieldId', fieldId)
    if (partyType) formData.append('partyType', partyType)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured')
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/upload-file`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }

    const result = await response.json()
    return result

  } catch (error: unknown) {
    const err = error as { message?: string }
    return { error: err.message || 'Failed to upload file' }
  }
}

const parseContractSchema = z.object({
  orgId: z.string().uuid(),
  fileUrl: z.string().url(),
  fileName: z.string(),
})

export async function parseContract(params: z.infer<typeof parseContractSchema>) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { error: 'Authentication required' }
  }

  const validation = parseContractSchema.safeParse(params)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { orgId, fileUrl, fileName } = validation.data

  try {
    // Verify user has access to this org
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', session.user.id)
      .single()

    if (!membership) {
      return { error: 'Access denied to this organization' }
    }

    // Parse the contract
    const parsedData = await parseContractFromURL(fileUrl)

    // Store the parsed contract
    const { data: contractRecord, error: contractError } = await supabase
      .from('parsed_contracts')
      .insert({
        org_id: orgId,
        file_name: fileName,
        file_url: fileUrl,
        parsed_data: parsedData,
        status: 'pending_review',
        confidence: parsedData.confidence || 0,
      })
      .select()
      .single()

    if (contractError) {
      throw contractError
    }

    return {
      success: true,
      data: {
        contractId: contractRecord.id,
        ...parsedData,
      },
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error('Contract parsing error', err)
    return { error: err.message || 'Failed to parse contract' }
  }
}