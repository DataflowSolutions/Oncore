import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://alzfpysmlxinthfrbjll.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsemZweXNtbHhpbnRoZnJiamxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQyMzc4MiwiZXhwIjoyMDc2OTk5NzgyfQ.DpswRgxYjLZLQsaqbfIg6PwRGwI0fbInppXAOomILZg';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'public' },
  global: { headers: { 'X-Client-Info': '@supabase/supabase-js/2.0.0' } },
});

console.log('Checking current role and RLS settings...\n');

// Check current role
const { data: role, error: roleError } = await supabase.rpc('exec_sql', {
  query: 'SELECT current_user, current_role;'
});

console.log('Current role:', role || roleError);

// Check if RLS is enabled
const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
  query: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations';`
});

console.log('\nOrganizations RLS status:', rlsStatus || rlsError);

// Check policies
const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
  query: `SELECT policyname, roles::text[], cmd FROM pg_policies WHERE tablename = 'organizations' ORDER BY policyname;`
});

console.log('\nOrganizations policies:', policies || policiesError);
