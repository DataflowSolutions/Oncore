"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { WelcomeHero } from "@/components/home/WelcomeHero";
import { UserHeader } from "@/components/home/UserHeader";
import { OrganizationsList } from "@/components/home/OrganizationsList";
import { logger } from '@/lib/logger'

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

export default function Home() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  const loadUserOrganizations = useCallback(async (userId: string) => {
    try {
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
        .eq('user_id', userId);

      if (error) throw error;
      setOrganizations(data as UserOrganization[]);
    } catch (error) {
      logger.error('Error loading organizations', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserOrganizations(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadUserOrganizations(session.user.id);
        } else {
          setOrganizations([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserOrganizations, supabase.auth]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show welcome hero
  if (!user) {
    return <WelcomeHero />;
  }

  // Logged in - show user dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <UserHeader email={user.email ?? ''} />
        <OrganizationsList organizations={organizations} />
      </div>
    </div>
  );
}
