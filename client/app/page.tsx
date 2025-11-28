import { getSupabaseServer } from "@/lib/supabase/server";
import { WelcomeHero } from "@/components/home/WelcomeHero";
import { HomePageClient } from "@/components/home/HomePageClient";
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

// Shape returned by the RPC function
interface OrganizationFromRPC {
  org_id: string;
  name: string;
  slug: string;
  role: string;
  status: string;
}

// Server component - prefetches data on the server for instant load
export default async function Home() {
  const supabase = await getSupabaseServer();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in - show welcome hero (public page)
  if (!user) {
    return <WelcomeHero />;
  }

  // User is logged in - prefetch their organizations
  const queryClient = new QueryClient()
  
  // Prefetch user organizations on the server using RPC
  await queryClient.prefetchQuery({
    queryKey: queryKeys.userOrganizations(user.id),
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_user_organizations');

      if (error) throw error;
      return (data || []) as OrganizationFromRPC[];
    },
  })

  // Hydrate the client component with prefetched data
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomePageClient userEmail={user.email ?? ''} userId={user.id} />
    </HydrationBoundary>
  );
}
