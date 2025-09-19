import { notFound, redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { checkOrgBilling, shouldShowBillingGate } from "@/lib/billing";
import {
  BillingGate,
  SubscriptionBanner,
} from "@/components/billing/BillingGate";
import TabNavigation from "./components/TabNavigation";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: { org: string };
}

export default async function TourLayout({ children, params }: OrgLayoutProps) {
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

  // Load the organization by slug
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", resolvedParams.org)
    .single();

  if (orgError || !org) {
    notFound();
  }

  // Check if user is a member of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Check billing status
  const billingStatus = await checkOrgBilling(org.id);

  // Show billing gate if subscription is inactive (except for billing-debug page)
  if (
    billingStatus &&
    shouldShowBillingGate(billingStatus) &&
    !resolvedParams.org.includes("billing-debug")
  ) {
    return <BillingGate billingStatus={billingStatus} orgName={org.name} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Show subscription banner for trials or issues */}
      {billingStatus && <SubscriptionBanner billingStatus={billingStatus} />}

      <div className="pt-10 lg:flex justify-end mb-4 hidden">
        <TabNavigation
          orgSlug={resolvedParams.org}
          userRole={membership.role}
        />
      </div>

      <div>{children}</div>
    </div>
  );
}
