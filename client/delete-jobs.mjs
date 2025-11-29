import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('Deleting all import jobs...\n');

const { data, error } = await supabase
  .from('import_jobs')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ All import jobs deleted');
}
