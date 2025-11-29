import { createClient } from '@supabase/supabase-js';

// Use local Supabase
const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('Checking latest import job...\n');

// Get the latest import job
const { data: jobs, error } = await supabase
  .from('import_jobs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1);

if (error) {
  console.error('❌ Error fetching job:', error);
} else if (!jobs || jobs.length === 0) {
  console.log('❌ No import jobs found');
} else {
  const job = jobs[0];
  console.log('✅ Latest import job:');
  console.log('ID:', job.id);
  console.log('Status:', job.status);
  console.log('Created:', job.created_at);
  console.log('\nRaw sources:');
  if (job.raw_sources && job.raw_sources.length > 0) {
    job.raw_sources.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.fileName} (${s.mimeType})`);
      console.log(`     Text length: ${s.rawText?.length || 0} chars`);
      console.log(`     Preview: ${s.rawText?.substring(0, 100) || '(empty)'}...`);
    });
  } else {
    console.log('  (none)');
  }
  console.log('\nExtracted data sections:', Object.keys(job.extracted_data || {}).join(', ') || '(none)');
  console.log('\nProgress data:', JSON.stringify(job.progress_data, null, 2));
  console.log('\nExtracted data preview:');
  if (job.extracted_data) {
    for (const [section, data] of Object.entries(job.extracted_data)) {
      console.log(`  ${section}:`, Array.isArray(data) ? `${data.length} items` : JSON.stringify(data).substring(0, 100));
    }
  } else {
    console.log('  (none)');
  }
  
  // Check if job is actually pending
  console.log('\n--- Job Analysis ---');
  if (job.status === 'completed' && !job.extracted_data) {
    console.log('⚠️  WARNING: Job marked completed but has NO extracted_data!');
    console.log('    This likely means the job was created but never processed.');
  }
  if (!job.raw_sources || job.raw_sources.length === 0) {
    console.log('⚠️  WARNING: Job has no raw_sources!');
  } else if (job.raw_sources.some(s => !s.rawText || s.rawText.length === 0)) {
    console.log('⚠️  WARNING: Some sources have empty rawText!');
  }
}
