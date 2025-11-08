import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://alzfpysmlxinthfrbjll.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsemZweXNtbHhpbnRoZnJiamxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQyMzc4MiwiZXhwIjoyMDc2OTk5NzgyfQ.DpswRgxYjLZLQsaqbfIg6PwRGwI0fbInppXAOomILZg';

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('Testing organization creation flow in production...\n');

// Get current user (simulate being authenticated)
const testUserId = '123e4567-e89b-12d3-a456-426614174000'; // Fake UUID for testing

console.log('Step 1: Testing if we can INSERT into organizations...');
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .insert({
    name: 'Test Org',
    slug: 'test-org-' + Date.now(),
    created_by: testUserId
  })
  .select()
  .single();

if (orgError) {
  console.error('❌ Cannot insert organization:', orgError);
} else {
  console.log('✅ Organization created:', org);
  
  console.log('\nStep 2: Testing if we can INSERT into org_members...');
  const { data: member, error: memberError } = await supabase
    .from('org_members')
    .insert({
      org_id: org.id,
      user_id: testUserId,
      role: 'owner'
    })
    .select()
    .single();
  
  if (memberError) {
    console.error('❌ Cannot insert org_member:', memberError);
  } else {
    console.log('✅ Org member created:', member);
  }
  
  // Cleanup
  console.log('\nCleaning up test data...');
  await supabase.from('org_members').delete().eq('org_id', org.id);
  await supabase.from('organizations').delete().eq('id', org.id);
  console.log('✅ Cleanup complete');
}
