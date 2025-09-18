'use server'

import { createClient } from '@/app/utils/supabase/server'
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