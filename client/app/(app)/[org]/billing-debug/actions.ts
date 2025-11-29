'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'


export async function assignPlanDebug(orgId: string, planId: string) {
  try {
    const supabase = await getSupabaseServer()

    // Call the RPC function we created
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .rpc('app_assign_plan_debug', {
        p_org_id: orgId,
        p_plan: planId
      })

    if (error) {
      logger.error('Failed to assign plan', error)
      throw new Error(`Failed to assign plan: ${error.message}`)
    }

    // Revalidate the billing debug page to show updated data
    revalidatePath(`/billing-debug`)

    return { success: true }

  } catch (error) {
    logger.error('Error assigning plan', error)
    throw error
  }
}