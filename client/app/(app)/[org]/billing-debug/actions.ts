'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function assignPlanDebug(orgId: string, planId: string, trialDays: number = 7) {
  try {
    const supabase = await getSupabaseServer()
    
    // Call the RPC function we created
    const { error } = await supabase
      .rpc('app_assign_plan_debug', {
        p_org_id: orgId,
        p_plan_id: planId,
        p_trial_days: trialDays
      })

    if (error) {
      console.error('Failed to assign plan:', error)
      throw new Error(`Failed to assign plan: ${error.message}`)
    }

    // Revalidate the billing debug page to show updated data
    revalidatePath(`/billing-debug`)
    
    return { success: true }
    
  } catch (error) {
    console.error('Error assigning plan:', error)
    throw error
  }
}