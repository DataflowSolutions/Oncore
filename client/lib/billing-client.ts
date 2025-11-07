import { createClient } from '@/lib/supabase/client'
import { LimitCheck } from '@/lib/billing'
import { logger } from '@/lib/logger'

// RPC response type for client-side
interface LimitCheckRPC {
  allowed: boolean
  current_usage: number
  limit: number
  remaining: number
  check_type: string
  plan_name: string
  requires_upgrade: boolean
}

/**
 * Client-side utility to check org limits
 */
export async function checkOrgLimitsClient(
  orgId: string, 
  checkType: 'members' | 'collaborators' | 'artists',
  additionalCount: number = 1
): Promise<LimitCheck | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .rpc('check_org_limits_detailed', {
      p_org_id: orgId,
      p_check_type: checkType,
      p_additional_count: additionalCount
    })
  
  if (error || !data) {
    logger.error('Failed to check org limits', error)
    return null
  }

  // Type assertion for RPC return data
  const limitData = data as unknown as LimitCheckRPC
  return {
    allowed: limitData.allowed,
    currentUsage: limitData.current_usage,
    limit: limitData.limit,
    remaining: limitData.remaining,
    checkType: limitData.check_type,
    planName: limitData.plan_name,
    requiresUpgrade: limitData.requires_upgrade
  }
}