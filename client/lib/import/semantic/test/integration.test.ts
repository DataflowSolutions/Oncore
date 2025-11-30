/**
 * Integration Test: Real-World Semantic Import Pipeline
 * 
 * This test suite uses actual PDF files to stress test the complete
 * semantic import pipeline from PDF extraction through to final ImportData.
 * 
 * Test PDFs:
 * - Turkish Airlines flight booking confirmation
 * - Show contract/offer documents (Son of Son @ venues)
 * - Other booking documents
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractText } from '@/lib/import/text-extraction';
import { buildChunksForSection, type ImportSource } from '@/lib/import/chunking';
import { extractFactsFromChunk } from '../fact-extraction';
import { resolveImportFacts } from '../resolution';
import type { ExtractedFact, ImportFact, FactResolution } from '../types';
import { isSelectableStatus, isFinalizableStatus } from '../types';

// =============================================================================
// Test Setup
// =============================================================================

const PDF_DIR = path.join(__dirname, 'pdfs');
const TEST_JOB_ID = 'integration-test-job';

interface TestPDF {
  fileName: string;
  filePath: string;
  expectedDocType: 'flight_confirmation' | 'show_offer' | 'contract' | 'unknown';
  expectedFactTypes?: string[];
}

const TEST_PDFS: TestPDF[] = [
  {
    fileName: 'Dashboard _ Manage Booking _ Flights _ Turkish Airlines.pdf',
    filePath: path.join(PDF_DIR, 'Dashboard _ Manage Booking _ Flights _ Turkish Airlines.pdf'),
    expectedDocType: 'flight_confirmation',
    expectedFactTypes: ['flight_number', 'flight_departure', 'flight_arrival'],
  },
  {
    fileName: 'Son of Son @ Isle of Summer, München - 10.05.2025.pdf',
    filePath: path.join(PDF_DIR, 'Son of Son @ Isle of Summer, München - 10.05.2025.pdf'),
    expectedDocType: 'show_offer',
    expectedFactTypes: ['artist_name', 'venue_name', 'event_date'],
  },
  {
    fileName: 'Son of Son @ Sohho, Dubai - 31.12.2024.pdf',
    filePath: path.join(PDF_DIR, 'Son of Son @ Sohho, Dubai - 31.12.2024.pdf'),
    expectedDocType: 'show_offer',
    expectedFactTypes: ['artist_name', 'venue_name', 'event_date'],
  },
  {
    fileName: '8e72bd26-3a09-42d9-8482-fe5839b1b101.pdf',
    filePath: path.join(PDF_DIR, '8e72bd26-3a09-42d9-8482-fe5839b1b101.pdf'),
    expectedDocType: 'unknown',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

async function loadPDFAsSource(pdf: TestPDF): Promise<ImportSource | null> {
  try {
    const buffer = fs.readFileSync(pdf.filePath);
    const result = await extractText({
      fileName: pdf.fileName,
      mimeType: 'application/pdf',
      buffer,
    });
    
    if (result.error || !result.text) {
      console.warn(`Failed to extract text from ${pdf.fileName}: ${result.error}`);
      return null;
    }
    
    return {
      id: `source-${pdf.fileName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
      fileName: pdf.fileName,
      mimeType: 'application/pdf',
      rawText: result.text,
    };
  } catch (error) {
    console.error(`Error loading PDF ${pdf.fileName}:`, error);
    return null;
  }
}

async function extractFactsFromSource(
  source: ImportSource,
  jobId: string,
  previousFacts: ExtractedFact[] = []
): Promise<{ facts: ExtractedFact[]; warnings: string[] }> {
  const allFacts: ExtractedFact[] = [];
  const allWarnings: string[] = [];
  
  // Build chunks (1000 words per chunk)
  const words = source.rawText.split(/\s+/).filter(Boolean);
  const chunks: { index: number; text: string }[] = [];
  
  for (let i = 0; i < words.length; i += 1000) {
    chunks.push({
      index: chunks.length,
      text: words.slice(i, i + 1000).join(' '),
    });
  }
  
  // Ensure at least one chunk
  if (chunks.length === 0) {
    chunks.push({ index: 0, text: source.rawText });
  }
  
  let runningPreviousFacts = [...previousFacts];
  
  for (const chunk of chunks) {
    const result = await extractFactsFromChunk({
      job_id: jobId,
      source_id: source.id,
      source_file_name: source.fileName,
      chunk_index: chunk.index,
      chunk_text: chunk.text,
      previous_facts: runningPreviousFacts.slice(-20),
      message_index: chunk.index,
    });
    
    allFacts.push(...result.facts);
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
    
    runningPreviousFacts = [...runningPreviousFacts, ...result.facts];
  }
  
  return { facts: allFacts, warnings: allWarnings };
}

function convertToImportFacts(extractedFacts: ExtractedFact[]): ImportFact[] {
  return extractedFacts.map((fact, index) => ({
    ...fact,
    id: `fact-${index}-${fact.fact_type}-${Date.now()}`,
    job_id: TEST_JOB_ID,
    is_selected: false,
  }));
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Integration: Real PDF Processing', () => {
  let sources: ImportSource[] = [];
  let allExtractedFacts: ExtractedFact[] = [];
  let allImportFacts: ImportFact[] = [];
  let resolutionResult: { resolutions: FactResolution[]; selected_fact_ids: string[]; warnings?: string[] } | null = null;

  beforeAll(async () => {
    // Load all PDFs
    console.log('\n📂 Loading PDFs from:', PDF_DIR);
    
    for (const pdf of TEST_PDFS) {
      if (!fs.existsSync(pdf.filePath)) {
        console.warn(`⚠️  PDF not found: ${pdf.filePath}`);
        continue;
      }
      
      const source = await loadPDFAsSource(pdf);
      if (source) {
        sources.push(source);
        console.log(`✓ Loaded: ${pdf.fileName} (${source.rawText.length} chars)`);
      }
    }
    
    expect(sources.length).toBeGreaterThan(0);
  }, 60000); // 60s timeout for PDF loading

  describe('Stage 1: Fact Extraction', () => {
    it('should extract facts from all PDFs', async () => {
      console.log('\n🔬 Stage 1: Extracting facts from', sources.length, 'sources...');
      
      let previousFacts: ExtractedFact[] = [];
      
      for (const source of sources) {
        console.log(`  → Processing: ${source.fileName}`);
        const { facts, warnings } = await extractFactsFromSource(source, TEST_JOB_ID, previousFacts);
        
        console.log(`    ✓ Extracted ${facts.length} facts`);
        if (warnings.length > 0) {
          console.log(`    ⚠️  ${warnings.length} warnings`);
        }
        
        allExtractedFacts.push(...facts);
        previousFacts = [...previousFacts, ...facts];
      }
      
      console.log(`\n📊 Total facts extracted: ${allExtractedFacts.length}`);
      
      // Should extract at least some facts
      expect(allExtractedFacts.length).toBeGreaterThan(0);
    }, 120000); // 2 min timeout for API calls

    it('should extract flight facts from Turkish Airlines confirmation', async () => {
      const flightSource = sources.find(s => s.fileName.includes('Turkish Airlines'));
      if (!flightSource) {
        console.log('⚠️  Turkish Airlines PDF not loaded, skipping');
        return;
      }
      
      const flightFacts = allExtractedFacts.filter(f => 
        f.source_file_name?.includes('Turkish Airlines')
      );
      
      console.log(`\n✈️  Flight confirmation facts: ${flightFacts.length}`);
      
      // Log fact types found
      const factTypes = [...new Set(flightFacts.map(f => f.fact_type))];
      console.log('   Fact types:', factTypes.join(', '));
      
      // Should have flight-related facts
      const hasFlightFacts = flightFacts.some(f => 
        f.fact_type.includes('flight') || 
        f.fact_type === 'travel_cost' ||
        f.fact_type === 'contact_name'
      );
      
      expect(hasFlightFacts).toBe(true);
      
      // Flight confirmation facts should be 'final' or 'info', not 'offer'
      const flightDetailFacts = flightFacts.filter(f => f.fact_type.includes('flight'));
      for (const fact of flightDetailFacts) {
        console.log(`   ${fact.fact_type}: "${fact.value_text}" [${fact.status}]`);
        // Should NOT be marked as 'offer' for a confirmation
        expect(['final', 'info', 'accepted']).toContain(fact.status);
      }
    });

    it('should extract show/event facts from offer documents', async () => {
      const showFacts = allExtractedFacts.filter(f => 
        f.source_file_name?.includes('Son of Son')
      );
      
      console.log(`\n🎤 Show offer facts: ${showFacts.length}`);
      
      // Log unique fact types
      const factTypes = [...new Set(showFacts.map(f => f.fact_type))];
      console.log('   Fact types:', factTypes.join(', '));
      
      // Should have event-related facts
      const hasEventFacts = showFacts.some(f => 
        ['event_date', 'venue_name', 'venue_city', 'artist_name', 'artist_fee'].includes(f.fact_type)
      );
      
      expect(hasEventFacts).toBe(true);
    });

    it('should assign appropriate statuses based on document type', () => {
      // Count status distribution
      const statusCounts: Record<string, number> = {};
      for (const fact of allExtractedFacts) {
        statusCounts[fact.status] = (statusCounts[fact.status] || 0) + 1;
      }
      
      console.log('\n📈 Status distribution:');
      for (const [status, count] of Object.entries(statusCounts)) {
        console.log(`   ${status}: ${count}`);
      }
      
      // Should have a mix of statuses, not all 'offer'
      const statusTypes = Object.keys(statusCounts);
      expect(statusTypes.length).toBeGreaterThan(1);
    });
  });

  describe('Stage 2: Semantic Resolution', () => {
    beforeAll(async () => {
      // Convert extracted facts to ImportFacts for resolution
      allImportFacts = convertToImportFacts(allExtractedFacts);
      
      console.log('\n🧠 Stage 2: Resolving', allImportFacts.length, 'facts...');
      
      resolutionResult = await resolveImportFacts({
        job_id: TEST_JOB_ID,
        facts: allImportFacts,
      });
      
      console.log(`\n📊 Resolution results:`);
      console.log(`   Total resolutions: ${resolutionResult.resolutions.length}`);
      console.log(`   Selected facts: ${resolutionResult.selected_fact_ids.length}`);
      if (resolutionResult.warnings?.length) {
        console.log(`   Warnings: ${resolutionResult.warnings.length}`);
      }
    }, 120000);

    it('should produce resolutions for extracted fact types', () => {
      expect(resolutionResult).not.toBeNull();
      expect(resolutionResult!.resolutions.length).toBeGreaterThan(0);
      
      // Log resolution states
      const stateCounts: Record<string, number> = {};
      for (const res of resolutionResult!.resolutions) {
        stateCounts[res.state] = (stateCounts[res.state] || 0) + 1;
      }
      
      console.log('\n📈 Resolution state distribution:');
      for (const [state, count] of Object.entries(stateCounts)) {
        console.log(`   ${state}: ${count}`);
      }
    });

    it('should resolve flight details from confirmation document', () => {
      const flightResolutions = resolutionResult!.resolutions.filter(r => 
        r.fact_type.includes('flight')
      );
      
      console.log('\n✈️  Flight resolutions:');
      for (const res of flightResolutions) {
        console.log(`   ${res.fact_type}: ${res.state} -> ${res.final_value_text || res.final_value_number || '(no value)'}`);
      }
      
      // Flight facts from confirmation should be resolved or informational
      for (const res of flightResolutions) {
        expect(['resolved', 'informational', 'unagreed', 'missing']).toContain(res.state);
      }
    });

    it('should never select rejected or withdrawn facts', () => {
      const selectedIds = new Set(resolutionResult!.selected_fact_ids);
      
      for (const factId of selectedIds) {
        const fact = allImportFacts.find(f => f.id === factId);
        if (fact) {
          // HARD RULE: rejected/withdrawn/question can never be selected
          expect(isSelectableStatus(fact.status)).toBe(true);
        }
      }
    });

    it('should only use resolved state for accepted/final facts', () => {
      const selectedIds = new Set(resolutionResult!.selected_fact_ids);
      
      for (const resolution of resolutionResult!.resolutions) {
        if (resolution.state === 'resolved' && resolution.selected_fact_id) {
          const fact = allImportFacts.find(f => f.id === resolution.selected_fact_id);
          if (fact) {
            // HARD RULE: resolved state requires accepted/final status
            expect(isFinalizableStatus(fact.status)).toBe(true);
          }
        }
      }
    });

    it('should handle cost domains separately', () => {
      const artistFeeRes = resolutionResult!.resolutions.filter(r => r.fact_type === 'artist_fee');
      const venueCostRes = resolutionResult!.resolutions.filter(r => r.fact_type === 'venue_cost');
      
      console.log('\n💰 Cost domain resolutions:');
      console.log(`   artist_fee: ${artistFeeRes.length} resolutions`);
      console.log(`   venue_cost: ${venueCostRes.length} resolutions`);
      
      // If both exist, they should be independent
      if (artistFeeRes.length > 0 && venueCostRes.length > 0) {
        // Values should not cross-contaminate (unless they happen to be equal by coincidence)
        for (const af of artistFeeRes) {
          for (const vc of venueCostRes) {
            // This is a soft check - just log if values match
            if (af.final_value_number && vc.final_value_number && 
                af.final_value_number === vc.final_value_number) {
              console.log(`   ⚠️  Same value for both domains: ${af.final_value_number}`);
            }
          }
        }
      }
    });
  });

  describe('Stage 3: Pipeline Validation', () => {
    it('should have extracted facts from multiple sources', () => {
      const sourcesWithFacts = new Set(allExtractedFacts.map(f => f.source_id));
      console.log(`\n📂 Sources with facts: ${sourcesWithFacts.size}`);
      
      // Should have facts from at least 2 sources
      expect(sourcesWithFacts.size).toBeGreaterThanOrEqual(Math.min(2, sources.length));
    });

    it('should have reasonable confidence scores', () => {
      const confidenceScores = allExtractedFacts.map(f => f.confidence).filter(c => c !== undefined);
      
      if (confidenceScores.length > 0) {
        const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
        const minConfidence = Math.min(...confidenceScores);
        const maxConfidence = Math.max(...confidenceScores);
        
        console.log('\n📊 Confidence scores:');
        console.log(`   Average: ${avgConfidence.toFixed(2)}`);
        console.log(`   Min: ${minConfidence.toFixed(2)}`);
        console.log(`   Max: ${maxConfidence.toFixed(2)}`);
        
        // Confidence should be in valid range
        expect(minConfidence).toBeGreaterThanOrEqual(0);
        expect(maxConfidence).toBeLessThanOrEqual(1);
      }
    });

    it('should produce actionable data', () => {
      // Count how many resolutions have usable values
      const withValues = resolutionResult!.resolutions.filter(r => 
        r.final_value_text || r.final_value_number || r.final_value_date
      );
      
      console.log(`\n✅ Resolutions with values: ${withValues.length}/${resolutionResult!.resolutions.length}`);
      
      // At least some resolutions should have values
      expect(withValues.length).toBeGreaterThan(0);
    });

    it('should log full extraction summary', () => {
      console.log('\n' + '='.repeat(60));
      console.log('📋 FULL EXTRACTION SUMMARY');
      console.log('='.repeat(60));
      
      console.log(`\nSources processed: ${sources.length}`);
      for (const source of sources) {
        console.log(`  • ${source.fileName} (${source.rawText.length} chars)`);
      }
      
      console.log(`\nFacts extracted: ${allExtractedFacts.length}`);
      const factTypeGroups = allExtractedFacts.reduce((acc, f) => {
        acc[f.fact_type] = (acc[f.fact_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      for (const [type, count] of Object.entries(factTypeGroups).sort((a, b) => b[1] - a[1])) {
        console.log(`  • ${type}: ${count}`);
      }
      
      console.log(`\nResolutions: ${resolutionResult!.resolutions.length}`);
      const resolved = resolutionResult!.resolutions.filter(r => r.state === 'resolved');
      const informational = resolutionResult!.resolutions.filter(r => r.state === 'informational');
      const unagreed = resolutionResult!.resolutions.filter(r => r.state === 'unagreed');
      const missing = resolutionResult!.resolutions.filter(r => r.state === 'missing');
      
      console.log(`  • Resolved: ${resolved.length}`);
      console.log(`  • Informational: ${informational.length}`);
      console.log(`  • Unagreed: ${unagreed.length}`);
      console.log(`  • Missing: ${missing.length}`);
      
      if (resolutionResult!.warnings?.length) {
        console.log(`\n⚠️  Warnings: ${resolutionResult!.warnings.length}`);
        for (const warning of resolutionResult!.warnings.slice(0, 5)) {
          console.log(`  • ${warning.substring(0, 100)}...`);
        }
      }
      
      console.log('\n' + '='.repeat(60));
      
      // This test always passes - it's just for logging
      expect(true).toBe(true);
    });
  });
});

describe('Integration: Stress Test - Concurrent Processing', () => {
  it('should handle multiple extractions in parallel', async () => {
    // Load PDFs that exist
    const existingPdfs = TEST_PDFS.filter(pdf => fs.existsSync(pdf.filePath));
    
    if (existingPdfs.length < 2) {
      console.log('⚠️  Need at least 2 PDFs for parallel test, skipping');
      return;
    }
    
    console.log('\n⚡ Stress test: Processing', existingPdfs.length, 'PDFs in parallel...');
    
    const startTime = Date.now();
    
    // Load all PDFs in parallel
    const sourcePromises = existingPdfs.map(pdf => loadPDFAsSource(pdf));
    const sources = (await Promise.all(sourcePromises)).filter(Boolean) as ImportSource[];
    
    console.log(`   PDFs loaded in ${Date.now() - startTime}ms`);
    
    // Extract facts from all sources in parallel (separate API calls)
    const extractionPromises = sources.map((source, idx) => 
      extractFactsFromSource(source, `stress-test-${idx}`, [])
    );
    
    const extractionResults = await Promise.all(extractionPromises);
    
    const totalFacts = extractionResults.reduce((sum, r) => sum + r.facts.length, 0);
    const totalWarnings = extractionResults.reduce((sum, r) => sum + r.warnings.length, 0);
    
    const duration = Date.now() - startTime;
    console.log(`   Total time: ${duration}ms`);
    console.log(`   Total facts: ${totalFacts}`);
    console.log(`   Total warnings: ${totalWarnings}`);
    
    expect(totalFacts).toBeGreaterThan(0);
  }, 180000); // 3 min timeout
});
