import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://alzfpysmlxinthfrbjll.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsemZweXNtbHhpbnRoZnJiamxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQyMzc4MiwiZXhwIjoyMDc2OTk5NzgyfQ.DpswRgxYjLZLQsaqbfIg6PwRGwI0fbInppXAOomILZg';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('Checking "test" organization in production...\n');

// Check if org exists
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .select('*')
  .eq('slug', 'test')
  .single();

if (orgError) {
  console.error('❌ Error fetching org:', orgError);
} else {
  console.log('✅ Organization found:', org);
  
  // Check org_members
  const { data: members, error: membersError } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', org.id);
  
  if (membersError) {
    console.error('❌ Error fetching members:', membersError);
  } else {
    console.log('\n✅ Org members:', members);
    console.log('Member count:', members?.length || 0);
  }
  
  // Check subscription
  const { data: sub, error: subError } = await supabase
    .from('org_subscriptions')
    .select('*')
    .eq('org_id', org.id)
    .single();
  
  if (subError) {
    console.error('\n❌ Error fetching subscription:', subError);
  } else {
    console.log('\n✅ Subscription:', sub);
  }
}
