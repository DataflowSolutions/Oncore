'use server'

import { createClient } from '@/app/utils/supabase/server'
import { z } from 'zod'

const waitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['artist', 'manager', 'agent', 'venue', 'promoter', 'other']),
  name: z.string().min(1, 'Name is required').optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

export async function addToWaitlist(data: z.infer<typeof waitlistSchema>) {
  const supabase = await createClient()

  const validation = waitlistSchema.safeParse(data)
  if (!validation.success) {
    return { 
      success: false, 
      error: validation.error.issues[0].message 
    }
  }

  const { email, role, name, company, phone, notes } = validation.data

  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return { 
        success: false, 
        error: 'This email is already on the waitlist' 
      }
    }

    // Insert into waitlist
    const { data: waitlistEntry, error } = await supabase
      .from('waitlist')
      .insert({
        email,
        role,
        name,
        company,
        phone,
        notes,
        status: 'pending',
        source: 'website',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Send welcome email (optional - could be handled by a database trigger)
    // await sendWaitlistWelcomeEmail(email, name)

    return { 
      success: true, 
      data: waitlistEntry 
    }

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Waitlist error:', err)
    return { 
      success: false, 
      error: err.message || 'Failed to join waitlist' 
    }
  }
}

export async function getWaitlistStats() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select('role, status', { count: 'exact' })

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      byRole: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    }

    data?.forEach(entry => {
      stats.byRole[entry.role] = (stats.byRole[entry.role] || 0) + 1
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1
    })

    return { success: true, data: stats }

  } catch (error: unknown) {
    const err = error as { message?: string }
    return { 
      success: false, 
      error: err.message || 'Failed to fetch waitlist stats' 
    }
  }
}
