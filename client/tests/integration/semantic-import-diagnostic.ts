/**
 * Semantic Import Field Coverage Diagnostic
 * 
 * This script analyzes an existing import job to identify:
 * 1. What facts were extracted
 * 2. What facts were selected
 * 3. What fields are populated vs missing
 * 4. Where the extraction/resolution pipeline is failing
 * 
 * Usage: 
 *   npx tsx tests/integration/semantic-import-diagnostic.ts [jobId]
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';

// Load environment
const envLocalPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) dotenvConfig({ path: envLocalPath });

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// =============================================================================
// Types
// =============================================================================

interface ImportFact {
  id: string;
  job_id: string;
  fact_type: string;
  fact_domain: string | null;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_datetime: string | null;
  status: string;
  is_selected: boolean;
  source_file_name: string;
  source_scope: string | null;
  speaker_role: string;
  confidence: number;
  raw_snippet: string;
  message_index: number;
  chunk_index: number;
}

interface ImportResolution {
  id: string;
  job_id: string;
  fact_type: string;
  fact_domain: string | null;
  resolution_state: string;
  resolution_reason: string;
  selected_fact_id: string | null;
  final_value_text: string | null;
  final_value_number: number | null;
  final_value_date: string | null;
}

interface ImportJob {
  id: string;
  status: string;
  extraction_stage: string | null;
  raw_sources: any[];
  extracted: any;
  confidence_map: any;
  created_at: string;
}

// =============================================================================
// Fact Type Categories
// =============================================================================

const FACT_TYPE_CATEGORIES = {
  general: [
    'general_artist', 'general_eventName', 'general_venue', 'general_date',
    'general_setTime', 'general_city', 'general_country'
  ],
  deal: [
    'deal_fee', 'deal_paymentTerms', 'deal_dealType', 'deal_currency', 'deal_notes'
  ],
  flight: [
    'flight_airline', 'flight_flightNumber', 'flight_aircraft', 'flight_fullName',
    'flight_bookingReference', 'flight_ticketNumber', 'flight_fromCity',
    'flight_fromAirport', 'flight_departureTime', 'flight_toCity',
    'flight_toAirport', 'flight_arrivalTime', 'flight_seat', 'flight_travelClass',
    'flight_flightTime', 'flight_direction', 'flight_notes'
  ],
  hotel: [
    'hotel_name', 'hotel_address', 'hotel_city', 'hotel_country',
    'hotel_checkInDate', 'hotel_checkInTime', 'hotel_checkOutDate',
    'hotel_checkOutTime', 'hotel_bookingReference', 'hotel_phone',
    'hotel_email', 'hotel_notes'
  ],
  food: [
    'food_name', 'food_address', 'food_city', 'food_country',
    'food_bookingReference', 'food_phone', 'food_email', 'food_notes',
    'food_serviceDate', 'food_serviceTime', 'food_guestCount'
  ],
  activity: [
    'activity_name', 'activity_location', 'activity_startTime', 'activity_endTime',
    'activity_notes', 'activity_hasDestination', 'activity_destinationName',
    'activity_destinationLocation'
  ],
  contact: [
    'contact_name', 'contact_phone', 'contact_email', 'contact_role'
  ],
  technical: [
    'technical_equipment', 'technical_backline', 'technical_stageSetup',
    'technical_lightingRequirements', 'technical_soundcheck', 'technical_other'
  ],
};

// =============================================================================
// Analysis Functions
// =============================================================================

async function getLatestImportJob(): Promise<string | null> {
  const { data, error } = await supabase
    .from('import_jobs')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) return null;
  return data.id;
}

async function getImportJob(jobId: string): Promise<ImportJob | null> {
  const { data, error } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (error) {
    console.error('Error fetching job:', error);
    return null;
  }
  return data;
}

async function getImportFacts(jobId: string): Promise<ImportFact[]> {
  const { data, error } = await supabase
    .from('import_facts')
    .select('*')
    .eq('job_id', jobId)
    .order('message_index', { ascending: true })
    .order('chunk_index', { ascending: true });
  
  if (error) {
    console.error('Error fetching facts:', error);
    return [];
  }
  return data || [];
}

async function getImportResolutions(jobId: string): Promise<ImportResolution[]> {
  const { data, error } = await supabase
    .from('import_resolutions')
    .select('*')
    .eq('job_id', jobId);
  
  if (error) {
    console.error('Error fetching resolutions:', error);
    return [];
  }
  return data || [];
}

function analyzeFactCoverage(facts: ImportFact[], resolutions: ImportResolution[]) {
  const factsByType = new Map<string, ImportFact[]>();
  const selectedByType = new Map<string, ImportFact>();
  const resolutionByType = new Map<string, ImportResolution>();
  
  // Group facts by type
  for (const fact of facts) {
    if (!factsByType.has(fact.fact_type)) {
      factsByType.set(fact.fact_type, []);
    }
    factsByType.get(fact.fact_type)!.push(fact);
    
    if (fact.is_selected) {
      selectedByType.set(fact.fact_type, fact);
    }
  }
  
  // Group resolutions by type
  for (const res of resolutions) {
    resolutionByType.set(res.fact_type, res);
  }
  
  return { factsByType, selectedByType, resolutionByType };
}

// =============================================================================
// Main Diagnostic
// =============================================================================

async function runDiagnostic(jobId?: string) {
  console.log('\n' + '═'.repeat(80));
  console.log('🔍 SEMANTIC IMPORT DIAGNOSTIC');
  console.log('═'.repeat(80));

  // Get job ID
  if (!jobId) {
    jobId = await getLatestImportJob();
    if (!jobId) {
      console.log('❌ No import jobs found');
      return;
    }
    console.log(`\nUsing latest job: ${jobId}`);
  } else {
    console.log(`\nAnalyzing job: ${jobId}`);
  }

  // Get job details
  const job = await getImportJob(jobId);
  if (!job) {
    console.log('❌ Job not found');
    return;
  }

  console.log('\n' + '─'.repeat(80));
  console.log('📋 JOB STATUS');
  console.log('─'.repeat(80));
  console.log(`  Status: ${job.status}`);
  console.log(`  Extraction Stage: ${job.extraction_stage || 'N/A'}`);
  console.log(`  Created: ${job.created_at}`);
  
  if (job.raw_sources) {
    console.log(`\n  Source Documents:`);
    for (const src of job.raw_sources) {
      const wordCount = src.rawText?.split(/\s+/).length || 0;
      console.log(`    • ${src.fileName} (${wordCount} words)`);
    }
  }

  // Get facts and resolutions
  const facts = await getImportFacts(jobId);
  const resolutions = await getImportResolutions(jobId);
  
  console.log('\n' + '─'.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('─'.repeat(80));
  console.log(`  Total Facts Extracted: ${facts.length}`);
  console.log(`  Facts Selected: ${facts.filter(f => f.is_selected).length}`);
  console.log(`  Resolutions: ${resolutions.length}`);

  const { factsByType, selectedByType, resolutionByType } = analyzeFactCoverage(facts, resolutions);

  // Analyze by category
  console.log('\n' + '─'.repeat(80));
  console.log('📈 COVERAGE BY CATEGORY');
  console.log('─'.repeat(80));

  for (const [category, expectedTypes] of Object.entries(FACT_TYPE_CATEGORIES)) {
    console.log(`\n  ${category.toUpperCase()}:`);
    
    let extracted = 0;
    let selected = 0;
    const missing: string[] = [];
    
    for (const type of expectedTypes) {
      const typeFacts = factsByType.get(type) || [];
      const hasSelected = selectedByType.has(type);
      const resolution = resolutionByType.get(type);
      
      if (typeFacts.length > 0) {
        extracted++;
        const icon = hasSelected ? '✅' : '⚠️';
        const value = typeFacts[0].value_text || typeFacts[0].value_number || typeFacts[0].value_date || '?';
        const shortValue = String(value).substring(0, 40);
        console.log(`    ${icon} ${type}: ${typeFacts.length} fact(s), selected=${hasSelected}`);
        console.log(`       Value: "${shortValue}"${String(value).length > 40 ? '...' : ''}`);
        
        if (resolution) {
          console.log(`       Resolution: ${resolution.resolution_state} - ${resolution.resolution_reason?.substring(0, 50)}...`);
        }
        
        if (hasSelected) selected++;
      } else {
        missing.push(type);
      }
    }
    
    console.log(`\n    Summary: ${extracted}/${expectedTypes.length} extracted, ${selected}/${expectedTypes.length} selected`);
    
    if (missing.length > 0) {
      console.log(`    ❌ Missing: ${missing.join(', ')}`);
    }
  }

  // Show extracted data fields
  if (job.extracted) {
    console.log('\n' + '─'.repeat(80));
    console.log('📝 EXTRACTED DATA (IMPORTDATA)');
    console.log('─'.repeat(80));
    
    const data = job.extracted;
    
    // General
    console.log('\n  GENERAL:');
    for (const [key, value] of Object.entries(data.general || {})) {
      const icon = value ? '✅' : '❌';
      console.log(`    ${icon} ${key}: ${value || '(empty)'}`);
    }
    
    // Deal
    console.log('\n  DEAL:');
    for (const [key, value] of Object.entries(data.deal || {})) {
      const icon = value ? '✅' : '❌';
      console.log(`    ${icon} ${key}: ${value || '(empty)'}`);
    }
    
    // Flights
    console.log(`\n  FLIGHTS: ${(data.flights || []).length} item(s)`);
    for (const flight of (data.flights || []).slice(0, 3)) {
      const populatedFields = Object.entries(flight).filter(([k, v]) => v && !k.startsWith('_')).length;
      console.log(`    • ${flight.flightNumber || '?'}: ${flight.fromCity || '?'} → ${flight.toCity || '?'}`);
      console.log(`      Departure: ${flight.departureTime || '?'} | Arrival: ${flight.arrivalTime || '?'}`);
      console.log(`      Passenger: ${flight.fullName || '?'} | PNR: ${flight.bookingReference || '?'}`);
      console.log(`      Populated fields: ${populatedFields}/17`);
    }
    if ((data.flights || []).length > 3) {
      console.log(`    ... and ${data.flights.length - 3} more flights`);
    }
    
    // Hotels
    console.log(`\n  HOTELS: ${(data.hotels || []).length} item(s)`);
    for (const hotel of (data.hotels || [])) {
      const populatedFields = Object.entries(hotel).filter(([k, v]) => v && !k.startsWith('_')).length;
      console.log(`    • ${hotel.name || '?'} (${hotel.city || '?'})`);
      console.log(`      Check-in: ${hotel.checkInDate || '?'} | Check-out: ${hotel.checkOutDate || '?'}`);
      console.log(`      Populated fields: ${populatedFields}/13`);
    }
    
    // Contacts
    console.log(`\n  CONTACTS: ${(data.contacts || []).length} item(s)`);
    for (const contact of (data.contacts || []).slice(0, 5)) {
      const populatedFields = Object.entries(contact).filter(([k, v]) => v && !k.startsWith('_')).length;
      console.log(`    • ${contact.name || '?'} (${contact.role || '?'}): ${contact.email || contact.phone || '?'}`);
      console.log(`      Populated fields: ${populatedFields}/4`);
    }
    if ((data.contacts || []).length > 5) {
      console.log(`    ... and ${data.contacts.length - 5} more contacts`);
    }
  }

  // Identify issues
  console.log('\n' + '─'.repeat(80));
  console.log('🔧 IDENTIFIED ISSUES');
  console.log('─'.repeat(80));

  const issues: string[] = [];
  
  // Check for facts extracted but not selected
  const extractedButNotSelected = facts.filter(f => !f.is_selected);
  if (extractedButNotSelected.length > 0) {
    const byType = new Map<string, number>();
    for (const f of extractedButNotSelected) {
      byType.set(f.fact_type, (byType.get(f.fact_type) || 0) + 1);
    }
    console.log(`\n  ⚠️ Facts extracted but not selected (${extractedButNotSelected.length}):`);
    for (const [type, count] of [...byType.entries()].slice(0, 10)) {
      console.log(`     • ${type}: ${count}`);
    }
  }

  // Check for wrong statuses
  const questionFacts = facts.filter(f => f.status === 'question' || f.status === 'rejected');
  if (questionFacts.length > 0) {
    console.log(`\n  ⚠️ Facts with non-selectable status: ${questionFacts.length}`);
    for (const f of questionFacts.slice(0, 5)) {
      console.log(`     • ${f.fact_type}: status='${f.status}'`);
    }
  }

  // Check resolution states
  const unagreedResolutions = resolutions.filter(r => r.resolution_state === 'unagreed');
  if (unagreedResolutions.length > 0) {
    console.log(`\n  ⚠️ Unagreed resolutions (${unagreedResolutions.length}):`);
    for (const r of unagreedResolutions.slice(0, 10)) {
      console.log(`     • ${r.fact_type}: ${r.resolution_reason?.substring(0, 60)}...`);
    }
  }

  // Check for missing flight fields
  if (job.extracted?.flights?.length > 0) {
    const expectedFlightFields = [
      'airline', 'flightNumber', 'fromCity', 'fromAirport', 'departureTime',
      'toCity', 'toAirport', 'arrivalTime', 'fullName', 'bookingReference',
      'ticketNumber', 'seat', 'travelClass', 'aircraft'
    ];
    const missingFlightFields = new Map<string, number>();
    
    for (const flight of job.extracted.flights) {
      for (const field of expectedFlightFields) {
        if (!flight[field]) {
          missingFlightFields.set(field, (missingFlightFields.get(field) || 0) + 1);
        }
      }
    }
    
    if (missingFlightFields.size > 0) {
      console.log(`\n  ⚠️ Missing flight fields across ${job.extracted.flights.length} flight(s):`);
      for (const [field, count] of [...missingFlightFields.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`     • ${field}: missing in ${count}/${job.extracted.flights.length} flights`);
      }
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SUMMARY & RECOMMENDATIONS');
  console.log('═'.repeat(80));

  const totalExpected = Object.values(FACT_TYPE_CATEGORIES).flat().length;
  const totalExtracted = factsByType.size;
  const totalSelected = selectedByType.size;
  const coveragePercent = Math.round((totalSelected / totalExpected) * 100);

  console.log(`\n  Expected fact types: ${totalExpected}`);
  console.log(`  Extracted: ${totalExtracted} (${Math.round((totalExtracted / totalExpected) * 100)}%)`);
  console.log(`  Selected: ${totalSelected} (${coveragePercent}%)`);

  if (coveragePercent < 50) {
    console.log('\n  💡 Recommendations:');
    console.log('     1. Check if PDFs are extracting text properly (not scanned images)');
    console.log('     2. Review fact-extraction.ts prompts for missing fields');
    console.log('     3. Verify status assignment logic (should be "final" for confirmations)');
    console.log('     4. Check resolution.ts for correct handling of informational facts');
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

// =============================================================================
// Entry Point
// =============================================================================

const jobId = process.argv[2];
runDiagnostic(jobId).catch(console.error);
