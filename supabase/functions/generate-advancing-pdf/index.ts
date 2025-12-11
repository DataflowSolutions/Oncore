import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getSupabaseWithAuth } from '../_shared/supabase.ts'
import { createErrorResponse, corsHeaders } from '../_shared/responses.ts'
import { logger } from '../_shared/logger.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('Missing authorization header')
    }

    const { sessionId } = await req.json()
    if (!sessionId) {
      return createErrorResponse('Missing sessionId parameter')
    }

    const supabase = getSupabaseWithAuth(authHeader)

    // Fetch advancing session with all related data
    const { data: session, error } = await supabase
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
            state,
            country
          )
        ),
        hospitality (*),
        technical (*),
        production (*)
      `)
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return createErrorResponse('Session not found', error?.message)
    }

    // Generate HTML for PDF (using simple template)
    const html = generateAdvancingHTML(session)

    // For now, return HTML. In production, you'd use a PDF library like jsPDF or Puppeteer
    // Note: Deno Edge Functions have limitations for heavy PDF generation
    // Consider using a Next.js API route for complex PDF generation instead
    
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    })
  } catch (err) {
    logger.error('PDF generation error', err)
    return createErrorResponse(
      'Failed to generate PDF',
      err instanceof Error ? err.message : 'Unknown error'
    )
  }
})

function generateAdvancingHTML(session: any): string {
  const show = session.shows
  const venue = show?.venues
  const hospitality = session.hospitality?.[0]
  const technical = session.technical?.[0]

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Advancing - ${show?.title || 'Unknown Show'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { color: #333; border-bottom: 2px solid #000; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .section { margin-bottom: 30px; }
    .field { margin-bottom: 10px; }
    .label { font-weight: bold; color: #555; }
    .value { color: #000; }
  </style>
</head>
<body>
  <h1>Advancing Information</h1>
  
  <div class="section">
    <h2>Show Details</h2>
    <div class="field">
      <span class="label">Title:</span>
      <span class="value">${show?.title || 'N/A'}</span>
    </div>
    <div class="field">
      <span class="label">Date:</span>
      <span class="value">${show?.date ? new Date(show.date).toLocaleDateString() : 'N/A'}</span>
    </div>
  </div>

  <div class="section">
    <h2>Venue Information</h2>
    <div class="field">
      <span class="label">Name:</span>
      <span class="value">${venue?.name || 'N/A'}</span>
    </div>
    <div class="field">
      <span class="label">Location:</span>
      <span class="value">${venue?.city || 'N/A'}, ${venue?.state || 'N/A'}, ${venue?.country || 'N/A'}</span>
    </div>
  </div>

  ${hospitality ? `
  <div class="section">
    <h2>Hospitality</h2>
    <div class="field">
      <span class="label">Guest Count:</span>
      <span class="value">${hospitality.guest_count || 'N/A'}</span>
    </div>
    <div class="field">
      <span class="label">Catering:</span>
      <span class="value">${hospitality.catering ? JSON.stringify(hospitality.catering) : 'N/A'}</span>
    </div>
  </div>
  ` : ''}

  ${technical ? `
  <div class="section">
    <h2>Technical Requirements</h2>
    <div class="field">
      <span class="label">Stage:</span>
      <span class="value">${technical.stage_details || 'N/A'}</span>
    </div>
    <div class="field">
      <span class="label">Sound:</span>
      <span class="value">${technical.sound_details || 'N/A'}</span>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <p style="color: #999; font-size: 12px; margin-top: 50px;">
      Generated on ${new Date().toLocaleString()}
    </p>
  </div>
</body>
</html>
  `.trim()
}
