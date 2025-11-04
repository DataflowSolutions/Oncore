import { notFound, redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
// import { checkOrgBilling, shouldShowBillingGate } from "@/lib/billing";
// import {BillingGate, SubscriptionBanner,} from "@/components/billing/BillingGate";
import DynamicSidebar from "@/components/navigation/DynamicSidebar";
import { TopBar } from "@/components/navigation/TopBar";

// Optimize: Cache layout data briefly to prevent re-fetching on every navigation
export const revalidate = 30 // Revalidate every 30 seconds
export const dynamic = 'force-dynamic' // Always get fresh auth data

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
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

  // First get the org
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", resolvedParams.org)
    .single();

  if (orgError || !org) {
    console.log('❌ [Layout] Org not found:', resolvedParams.org, orgError?.message);
    notFound();
  }

  // Then get the membership for THIS specific org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role, org_id")
    .eq("user_id", user.id)
    .eq("org_id", org.id)
    .single();

  // Verify membership exists
  if (!membership) {
    console.log('❌ [Layout] User is not a member of org:', org.slug);
    notFound();
  }
  
  console.log('✅ [Layout] User has access to org:', org.slug, 'with role:', membership.role);

  // Check billing status
  // const billingStatus = await checkOrgBilling(org.id);

  // Show billing gate if subscription is inactive (except for billing-debug page)
  // if (
  //   billingStatus &&
  //   shouldShowBillingGate(billingStatus) &&
  //   !resolvedParams.org.includes("billing-debug")
  // ) {
  //   return <BillingGate billingStatus={billingStatus} orgName={org.name} />;
  // }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Show subscription banner for trials or issues */}
      {/* {billingStatus && <SubscriptionBanner billingStatus={billingStatus} />} */}

      {/* Dynamic Sidebar with Context-Aware Navigation */}
      <DynamicSidebar
        orgSlug={resolvedParams.org}
        orgId={org.id}
        userRole={membership.role}
      />

      {/* Main Content Area */}
      <div className="lg:ml-64 min-h-screen">
        {/* Top Navigation Bar */}
        <TopBar />

        <div className="py-6 lg:p-8 pt-6 lg:pt-6">{children}</div>
      </div>
    </div>
  );
}
