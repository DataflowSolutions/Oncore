import { notFound, redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { BillingDebugForm } from "./BillingDebugForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BillingDebugPageProps {
  params: { org: string };
}

export default async function BillingDebugPage({
  params,
}: BillingDebugPageProps) {
  const supabase = await getSupabaseServer();
  const resolvedParams = await params;

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  // Load the organization by slug using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org, error: orgError } = await (supabase as any).rpc(
    "get_org_by_slug",
    {
      p_slug: resolvedParams.org,
    }
  );

  if (orgError || !org) {
    notFound();
  }

  // Check if user is an owner of this org using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any).rpc("get_org_membership", {
    p_org_id: org.id,
  });

  if (!membership || membership.role !== "owner") {
    // Only owners can access billing debug
    notFound();
  }

  // Get current subscription
  const { data: subscription } = await supabase
    .from("org_subscriptions")
    .select(
      `
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
    `
    )
    .eq("org_id", org.id)
    .single();

  // Get all available plans
  const { data: plans } = await supabase
    .from("billing_plans")
    .select("*")
    .order("price_cents");

  // Get seat usage
  const { data: seatUsage } = await supabase
    .from("org_seat_usage")
    .select("*")
    .eq("org_id", org.id)
    .single();

  return (
    <div className="mb-16 mt-4">
      <h1 className="text-3xl font-extrabold text-foreground mb-6">
        Billing Debug — Owner Tools
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Subscription</CardTitle>
            <div className="text-sm text-foreground/70">
              Organization:{" "}
              <strong className="text-foreground">{org.name}</strong>
            </div>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-foreground">
                      <strong>Plan:</strong> {subscription.billing_plans?.name}
                    </span>
                    <Badge
                      variant={
                        subscription.status === "active"
                          ? "default"
                          : subscription.status === "trialing"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {subscription.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p className="text-foreground">
                    <strong>Price:</strong> $
                    {(subscription.billing_plans?.price_cents || 0) / 100}/month
                  </p>
                  <p className="text-foreground">
                    <strong>Period:</strong>{" "}
                    {subscription.current_period_start
                      ? new Date(
                          subscription.current_period_start
                        ).toLocaleDateString()
                      : "N/A"}{" "}
                    -{" "}
                    {subscription.current_period_end
                      ? new Date(
                          subscription.current_period_end
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>

                <div className="mt-3">
                  <h3 className="font-medium mb-2 text-foreground">
                    Plan Limits
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1 rounded-md bg-muted text-sm text-foreground/90">
                      Artists:{" "}
                      {subscription.billing_plans?.max_artists ?? "Unlimited"}
                    </div>
                    <div className="px-3 py-1 rounded-md bg-muted text-sm text-foreground/90">
                      Members:{" "}
                      {subscription.billing_plans?.max_members ?? "Unlimited"}
                    </div>
                    <div className="px-3 py-1 rounded-md bg-muted text-sm text-foreground/90">
                      Collaborators:{" "}
                      {subscription.billing_plans?.max_collaborators ??
                        "Unlimited"}
                    </div>
                  </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted rounded-md text-center">
                    <div className="text-sm text-foreground/70">Artists</div>
                    <div className="text-lg font-semibold text-foreground">
                      {seatUsage.artists_used}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-center">
                    <div className="text-sm text-foreground/70">Members</div>
                    <div className="text-lg font-semibold text-foreground">
                      {seatUsage.members_used}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-center">
                    <div className="text-sm text-foreground/70">
                      Collaborators
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      {seatUsage.collaborators_used}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-foreground/50">No usage data</p>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Debug Plan Assignment */}
      <Card className="mt-6 w-full">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="text-lg">🧪 Debug Tools</CardTitle>
              <p className="text-sm text-foreground/70">
                Temporary debug interface — in production users subscribe
                through Stripe.
              </p>
            </div>
            <div className="text-sm text-foreground/60">
              Theme: site default
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans ? (
              <BillingDebugForm orgId={org.id} plans={plans} />
            ) : (
              <p className="text-foreground/50">Plans not available</p>
            )}

            <div className="pt-2 text-sm text-foreground/70">
              Use these tools only for testing. Actions here may affect billing
              records in development.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
