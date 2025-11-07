import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getSupabaseClient, verifyAuth } from '../_shared/supabase.ts'
import { createErrorResponse, createSuccessResponse, corsHeaders } from '../_shared/responses.ts'
import { logger } from '../_shared/logger.ts'

// Using Resend (recommended for Deno Edge Functions)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailRequest {
  to: string | string[]
  subject: string
  type: 'invitation' | 'notification' | 'advancing-shared' | 'digest'
  data: Record<string, any>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('Missing authorization header', 401)
    }

    // Verify the request is from an authenticated user
    const user = await verifyAuth(authHeader)
    if (!user) {
      return createErrorResponse('Unauthorized - invalid or expired token', 401)
    }

    const emailRequest: EmailRequest = await req.json()
    const { to, subject, type, data } = emailRequest

    if (!to || !subject || !type) {
      return createErrorResponse('Missing required fields: to, subject, type', 400)
    }

    // Use service role client for database operations (we've verified the user is authenticated)
    const supabase = getSupabaseClient()

    // Generate email HTML based on type
    const html = generateEmailHTML(type, data)

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Oncore <noreply@oncore.app>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('Resend error', { error })
      return createErrorResponse('Failed to send email', error)
    }

    const result = await response.json()

    // Log email sent (using service role client, but tracking which user triggered it)
    await supabase.from('email_logs').insert({
      recipient: Array.isArray(to) ? to.join(',') : to,
      subject,
      type,
      status: 'sent',
      provider_id: result.id,
      sent_by: user.id, // Track which user requested the email
    })

    return createSuccessResponse({ sent: true, id: result.id })
  } catch (err) {
    logger.error('Email sending error', err)
    return createErrorResponse(
      'Failed to send email',
      err instanceof Error ? err.message : 'Unknown error',
      500
    )
  }
})

function generateEmailHTML(type: string, data: Record<string, any>): string {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #000; color: #fff; padding: 20px; text-align: center; }
      .content { padding: 30px 20px; background: #f9f9f9; }
      .button { 
        display: inline-block; 
        padding: 12px 24px; 
        background: #000; 
        color: #fff; 
        text-decoration: none; 
        border-radius: 4px; 
        margin: 20px 0;
      }
      .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
    </style>
  `

  switch (type) {
    case 'invitation':
      return `
<!DOCTYPE html>
<html>
<head>${baseStyles}</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You've been invited to Oncore</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>${data.inviterName || 'Someone'} has invited you to join <strong>${data.orgName || 'their organization'}</strong> on Oncore.</p>
      <p>Oncore helps touring artists and crews manage advancing sessions, communicate with venues, and streamline show preparation.</p>
      <a href="${data.inviteLink}" class="button">Accept Invitation</a>
      <p>This invitation expires in 7 days.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Oncore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `.trim()

    case 'advancing-shared':
      return `
<!DOCTYPE html>
<html>
<head>${baseStyles}</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Advancing Session Shared</h1>
    </div>
    <div class="content">
      <p>Hi ${data.venueName || 'there'},</p>
      <p><strong>${data.showTitle || 'A show'}</strong> on ${data.showDate || 'TBD'}</p>
      <p>${data.artistName || 'The artist'} has shared an advancing session with you for the upcoming show.</p>
      <p>View and update the advancing information using the link below:</p>
      <a href="${data.accessLink}" class="button">View Advancing Session</a>
      <p>If you have any questions, please reply to this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Oncore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `.trim()

    case 'notification':
      return `
<!DOCTYPE html>
<html>
<head>${baseStyles}</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.title || 'Notification'}</h1>
    </div>
    <div class="content">
      <p>${data.message || 'You have a new notification from Oncore.'}</p>
      ${data.actionLink ? `<a href="${data.actionLink}" class="button">${data.actionText || 'View Details'}</a>` : ''}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Oncore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `.trim()

    case 'digest':
      return `
<!DOCTYPE html>
<html>
<head>${baseStyles}</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Weekly Digest</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>
      <p>Here's what's happening with your shows this week:</p>
      <ul>
        ${data.shows?.map((show: any) => `
          <li><strong>${show.title}</strong> - ${show.date} at ${show.venue}</li>
        `).join('') || '<li>No upcoming shows</li>'}
      </ul>
      <a href="${data.dashboardLink || 'https://oncore.app/dashboard'}" class="button">View Dashboard</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Oncore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `.trim()

    default:
      return `
<!DOCTYPE html>
<html>
<head>${baseStyles}</head>
<body>
  <div class="container">
    <div class="content">
      <p>${data.message || 'You have received a message from Oncore.'}</p>
    </div>
  </div>
</body>
</html>
      `.trim()
  }
}
