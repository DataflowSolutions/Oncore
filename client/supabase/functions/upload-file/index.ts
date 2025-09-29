// @ts-nocheck
// This file runs in Deno environment, not Node.js
// TypeScript errors are expected and can be ignored
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Configuration from environment
    const MAX_FILE_SIZE_MB = parseInt(Deno.env.get('MAX_FILE_SIZE_MB') || '50')
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    const ALLOWED_BUCKETS = ['files', 'avatars', 'documents']

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const orgId = formData.get('orgId') as string
    const showId = formData.get('showId') as string | null
    const sessionId = formData.get('sessionId') as string | null
    const documentId = formData.get('documentId') as string | null
    const fieldId = formData.get('fieldId') as string | null
    const partyType = formData.get('partyType') as string | null
    const bucket = formData.get('bucket') as string || 'files'

    // Validate required parameters
    if (!file || !orgId) {
      return new Response(
        JSON.stringify({ error: 'File and orgId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ 
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
          maxSizeBytes: MAX_FILE_SIZE_BYTES,
          actualSizeBytes: file.size
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate bucket
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid bucket. Allowed buckets: ${ALLOWED_BUCKETS.join(', ')}`,
          allowedBuckets: ALLOWED_BUCKETS
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format for IDs (prevent injection)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    if (!uuidRegex.test(orgId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid orgId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate optional UUIDs
    const optionalIds = { showId, sessionId, documentId, fieldId }
    for (const [key, value] of Object.entries(optionalIds)) {
      if (value && !uuidRegex.test(value)) {
        return new Response(
          JSON.stringify({ error: `Invalid ${key} format` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate party type if provided
    if (partyType && !['from_us', 'from_you'].includes(partyType)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid partyType. Must be "from_us" or "from_you"',
          allowedValues: ['from_us', 'from_you']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reject unreferenced parameters (detect potential misuse)
    const allowedParams = new Set([
      'file', 'orgId', 'showId', 'sessionId', 'documentId', 
      'fieldId', 'partyType', 'bucket'
    ])
    
    const providedParams = Array.from(formData.keys())
    const unexpectedParams = providedParams.filter((param: string) => !allowedParams.has(param))
    
    if (unexpectedParams.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: `Unexpected parameters: ${unexpectedParams.join(', ')}`,
          allowedParameters: Array.from(allowedParams)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = sessionId 
      ? `${sessionId}/${fileName}`
      : `${orgId}/${fileName}`

    // Call our RPC to get enforced metadata and validate permissions
    const { data: uploadData, error: rpcError } = await supabaseClient.rpc(
      'app_upload_file_enforced',
      {
        bucket_name: bucket,
        file_path: filePath,
        p_org_id: orgId,
        p_show_id: showId,
        p_session_id: sessionId,
        p_document_id: documentId,
        p_field_id: fieldId,
        p_party_type: partyType,
        p_original_name: file.name,
        p_content_type: file.type,
        p_size_bytes: file.size,
      }
    )

    if (rpcError) {
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upload file to storage with ENFORCED metadata from RPC
    const { error: uploadError } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, file, {
        metadata: uploadData.metadata, // This is now enforced!
        upsert: false
      })

    if (uploadError) {
      // If storage upload fails, clean up the database record
      await supabaseClient.from('files').delete().eq('id', uploadData.file_id)
      
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the successful upload
    await supabaseClient.rpc('app_log_activity', {
      p_org_id: orgId,
      p_action: 'upload',
      p_resource_type: 'file',
      p_resource_id: uploadData.file_id,
      p_details: {
        file_name: file.name,
        file_size: file.size,
        bucket: bucket,
        session_id: sessionId,
        party_type: partyType,
        edge_function_enforced: true
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileId: uploadData.file_id,
        filePath: filePath,
        metadataEnforced: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})