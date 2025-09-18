import { getSupabaseServer } from './supabase/server'

// RPC response types
interface BillingStatusRPC {
  is_active: boolean
  status: string
  plan_id: string
  days_until_expiry: number | null
  requires_immediate_action: boolean
  grace_period_ends: string | null
}

interface LimitCheckRPC {
  allowed: boolean
  current_usage: number
  limit: number
  remaining: number
  check_type: string
  plan_name: string
  requires_upgrade: boolean
}

export interface BillingStatus {
  isActive: boolean
  status: string
  planId: string
  daysUntilExpiry: number | null
  requiresImmediateAction: boolean
  planName?: string
  gracePeriodEnds?: string | null
}

export interface LimitCheck {
  allowed: boolean
  currentUsage: number
  limit: number
  remaining: number
  checkType: string
  planName: string
  requiresUpgrade: boolean
}

/**
 * Check if an org has an active subscription (SSR-safe)
 */
export async function checkOrgBilling(orgId: string): Promise<BillingStatus | null> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .rpc('org_subscription_status', { p_org: orgId })
  
  if (error) {
    console.error('Failed to check org billing status:', error)
    return null
  }

  // If no subscription exists, provide default "trial" status for new orgs
  if (!data) {
    return {
      isActive: true, // New orgs get a trial period
      status: 'trial',
      planId: 'solo_artist', // Default trial plan
      daysUntilExpiry: 7, // 7-day trial
      requiresImmediateAction: false,
      gracePeriodEnds: null
    }
  }

  // Type assertion for RPC return data
  const billingData = data as unknown as BillingStatusRPC
  return {
    isActive: billingData.is_active,
    status: billingData.status,
    planId: billingData.plan_id,
    daysUntilExpiry: billingData.days_until_expiry,
    requiresImmediateAction: billingData.requires_immediate_action,
    gracePeriodEnds: billingData.grace_period_ends
  }
}

/**
 * Get comprehensive billing dashboard data (SSR-safe)
 */
export async function getOrgBillingDashboard(orgId: string) {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .rpc('org_billing_dashboard', { p_org_id: orgId })
  
  if (error) {
    console.error('Failed to get billing dashboard:', error)
    return null
  }

  return data
}

/**
 * Check specific limits before actions (SSR-safe)
 */
export async function checkOrgLimits(
  orgId: string, 
  checkType: 'members' | 'collaborators' | 'artists',
  additionalCount: number = 1
): Promise<LimitCheck | null> {
  const supabase = await getSupabaseServer()
  
  const { data, error } = await supabase
    .rpc('check_org_limits_detailed', {
      p_org_id: orgId,
      p_check_type: checkType,
      p_additional_count: additionalCount
    })
  
  if (error || !data) {
    console.error('Failed to check org limits:', error)
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

/**
 * Helper to determine if billing gate should be shown
 */
export function shouldShowBillingGate(billingStatus: BillingStatus | null): boolean {
  return billingStatus ? !billingStatus.isActive : true
}