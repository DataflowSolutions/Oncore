"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { logger } from '@/lib/logger'

interface QueryResult {
  data: unknown;
  error: unknown;
}

export default function DebugPage() {
  const [user, setUser] = useState<User | null>(null);
  const [orgMembers, setOrgMembers] = useState<QueryResult | null>(null);
  const [organizations, setOrganizations] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    async function checkDatabase() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(user);

        if (!user) {
          setError("Not logged in");
          return;
        }

        // Check org_members
        const { data: membersData, error: membersError } = await supabase
          .from('org_members')
          .select('*')
          .eq('user_id', user.id);
        
        logger.info('org_members query result', { membersData, membersError });
        setOrgMembers({ data: membersData, error: membersError });

        // Check organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*');
        
        logger.info('organizations query result', { orgsData, orgsError });
        setOrganizations({ data: orgsData, error: orgsError });

        // Try the join query
        const { data: joinData, error: joinError } = await supabase
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
        
        logger.info('join query result', { joinData, joinError });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        logger.error('Debug error', err);
      }
    }

    checkDatabase();
  }, [supabase]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Database Debug Page</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Current User</h2>
          <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
            {user ? JSON.stringify({
              id: user.id,
              email: user.email,
              created_at: user.created_at
            }, null, 2) : 'Not logged in'}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">org_members Query</h2>
          <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
            {orgMembers ? JSON.stringify(orgMembers, null, 2) : 'Loading...'}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">organizations Query</h2>
          <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
            {organizations ? JSON.stringify(organizations, null, 2) : 'Loading...'}
          </pre>
        </div>

        {error && (
          <div className="border border-red-500 p-4 rounded bg-red-50">
            <h2 className="font-semibold mb-2 text-red-700">Error</h2>
            <pre className="text-xs overflow-auto">{error}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
