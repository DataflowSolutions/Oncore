import { notFound, redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { BillingDebugForm } from './BillingDebugForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BillingDebugPageProps {
  params: { org: string }
}

export default async function BillingDebugPage({ params }: BillingDebugPageProps) {
  const supabase = await getSupabaseServer()
  const resolvedParams = await params
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/sign-in')
  }

  // Load the organization by slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', resolvedParams.org)
    .single()

  if (orgError || !org) {
    notFound()
  }

  // Check if user is an owner of this org
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    // Only owners can access billing debug
    notFound()
  }

  // Get current subscription
  const { data: subscription } = await supabase
    .from('org_subscriptions')
    .select(`
      *,
      billing_plans (
        id,
        name,
        description,
        price_cents,
        max_artists,
        max_members,
        max_collaborators,
        features
      )
    `)
    .eq('org_id', org.id)
    .single()

  // Get all available plans
  const { data: plans } = await supabase
    .from('billing_plans')
    .select('*')
    .order('price_cents')

  // Get seat usage
  const { data: seatUsage } = await supabase
    .from('org_seat_usage')
    .select('*')
    .eq('org_id', org.id)
    .single()

  return (
    <div className="mb-16 mt-4">
      <h1 className="text-2xl font-bold text-foreground mb-6">Billing Debug (Owner Only)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-foreground"><strong>Plan:</strong> {subscription.billing_plans?.name}</span>
                  <Badge variant={subscription.status === 'active' ? 'default' : subscription.status === 'trialing' ? 'secondary' : 'destructive'}>
                    {subscription.status}
                  </Badge>
                </div>
                <p className="text-foreground"><strong>Price:</strong> ${(subscription.billing_plans?.price_cents || 0) / 100}/month</p>
                <p className="text-foreground"><strong>Period:</strong> {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : 'N/A'} - {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}</p>
                
                <div className="mt-4">
                  <h3 className="font-medium mb-2 text-foreground">Plan Limits:</h3>
                  <ul className="text-sm space-y-1 text-foreground/80">
                    <li>Artists: {subscription.billing_plans?.max_artists || 'Unlimited'}</li>
                    <li>Members: {subscription.billing_plans?.max_members || 'Unlimited'}</li>
                    <li>Collaborators: {subscription.billing_plans?.max_collaborators || 'Unlimited'}</li>
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-foreground/50">No active subscription</p>
            )}
          </CardContent>
        </Card>

        {/* Seat Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {seatUsage ? (
              <div className="space-y-2">
                <p className="text-foreground"><strong>Artists:</strong> {seatUsage.artists_used}</p>
                <p className="text-foreground"><strong>Members:</strong> {seatUsage.members_used}</p>
                <p className="text-foreground"><strong>Collaborators:</strong> {seatUsage.collaborators_used}</p>
              </div>
            ) : (
              <p className="text-foreground/50">No usage data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debug Plan Assignment */}
      <Card className="mt-6 border-yellow-500 bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="text-lg text-yellow-400">🧪 Debug: Assign Plan</CardTitle>
          <p className="text-sm text-yellow-300">
            This is a temporary debug interface. In production, users will subscribe through Stripe.
          </p>
        </CardHeader>
        <CardContent>
          {plans && <BillingDebugForm orgId={org.id} plans={plans} />}
        </CardContent>
      </Card>
    </div>
  )
}