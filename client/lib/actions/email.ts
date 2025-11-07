'use server'

import { logger } from '@/lib/logger'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { parseForwardedEmail } from '@/lib/services/email-parser'

const parseEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  from: z.string().email().optional(),
  orgId: z.string().uuid(),
})

export async function parseEmail(data: z.infer<typeof parseEmailSchema>) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Authentication required' }
  }

  const validation = parseEmailSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    }
  }

  const { subject, body, from, orgId } = validation.data

  try {
    // Verify user has access to this org
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', session.user.id)
      .single()

    if (!membership) {
      return { success: false, error: 'Access denied to this organization' }
    }

    // Parse the email content
    const emailContent = `Subject: ${subject}\n\nFrom: ${from || 'Unknown'}\n\n${body}`
    const parsed = await parseForwardedEmail(emailContent)

    // Store the parsed email for review
    const { data: emailRecord, error: emailError } = await supabase
      .from('parsed_emails')
      .insert({
        org_id: orgId,
        subject,
        from_email: from,
        raw_content: body,
        parsed_data: parsed,
        status: 'pending_review',
      })
      .select()
      .single()

    if (emailError) {
      throw emailError
    }

    return {
      success: true,
      data: {
        emailId: emailRecord.id,
        ...parsed,
      },
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error('Email parsing error', err)
    return {
      success: false,
      error: err.message || 'Failed to parse email',
    }
  }
}

const confirmParsedEmailSchema = z.object({
  emailId: z.string().uuid(),
  showData: z.object({
    title: z.string(),
    date: z.string(),
    venueId: z.string().uuid().optional(),
    fee: z.union([z.string(), z.number()]).optional().transform(val => {
      // Convert string to number if needed
      if (val === undefined || val === null || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    }),
    feeCurrency: z.string().default('USD').optional(),
    notes: z.string().optional(),
  }),
  createVenue: z.boolean().default(false),
  venueData: z.object({
    name: z.string(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    capacity: z.number().optional(),
  }).optional(),
})

export async function confirmParsedEmail(
  data: z.infer<typeof confirmParsedEmailSchema>
) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'Authentication required' }
  }

  const validation = confirmParsedEmailSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    }
  }

  const { emailId, showData, createVenue, venueData } = validation.data

  try {
    // Get the parsed email
    const { data: parsedEmail, error: emailError } = await supabase
      .from('parsed_emails')
      .select('org_id')
      .eq('id', emailId)
      .single()

    if (emailError || !parsedEmail) {
      throw new Error('Parsed email not found')
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', parsedEmail.org_id)
      .eq('user_id', session.user.id)
      .single()

    if (!membership) {
      return { success: false, error: 'Access denied' }
    }

    let venueId = showData.venueId

    // Create venue if needed
    if (createVenue && venueData) {
      const { data: newVenue, error: venueError } = await supabase
        .from('venues')
        .insert({
          org_id: parsedEmail.org_id,
          name: venueData.name,
          address: venueData.address,
          city: venueData.city,
          state: venueData.state,
          capacity: venueData.capacity,
        })
        .select()
        .single()

      if (venueError) {
        throw venueError
      }

      venueId = newVenue.id
    }

    // Create the show
    const { data: show, error: showError } = await supabase
      .from('shows')
      .insert({
        org_id: parsedEmail.org_id,
        title: showData.title,
        date: showData.date,
        venue_id: venueId,
        fee: showData.fee,
        fee_currency: showData.feeCurrency || 'USD',
        notes: showData.notes,
        status: 'confirmed',
      })
      .select()
      .single()

    if (showError) {
      throw showError
    }

    // Mark parsed email as confirmed
    await supabase
      .from('parsed_emails')
      .update({ status: 'confirmed' })
      .eq('id', emailId)

    return {
      success: true,
      data: {
        showId: show.id,
        venueId,
      },
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error('Error confirming parsed email', err)
    return {
      success: false,
      error: err.message || 'Failed to create show from email',
    }
  }
}
