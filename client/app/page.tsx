import { getSupabaseServer } from "@/lib/supabase/server";
import { WelcomeHero } from "@/components/home/WelcomeHero";
import { HomePageClient } from "@/components/home/HomePageClient";
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface UserOrganization {
  role: string;
  created_at: string;
  organizations: Organization;
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
  
  // Prefetch user organizations on the server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.userOrganizations(user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          role,
          created_at,
          organizations (
            id,
            name,
            slug,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []) as UserOrganization[];
    },
  })

  // Hydrate the client component with prefetched data
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomePageClient userEmail={user.email ?? ''} userId={user.id} />
    </HydrationBoundary>
  );
}
