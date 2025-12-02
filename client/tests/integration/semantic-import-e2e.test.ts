/**
 * End-to-End Test for Semantic Import Pipeline
 * 
 * This test simulates the complete import flow:
 * 1. Upload documents (PDF text extraction)
 * 2. Create import job
 * 3. Run semantic extraction worker
 * 4. Verify extracted data matches expected fields
 * 
 * Purpose: Identify gaps in field extraction and resolution
 */

import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';

// Import pdf-parse worker first to avoid fake worker error
import 'pdf-parse/worker';
import { PDFParse } from 'pdf-parse';

import type { ImportData, ImportedFlight, ImportedHotel, ImportedContact, ImportedGeneral, ImportedDeal, ImportedActivity, ImportedTechnical } from '../../components/import/types';
import type { ExtractedFact, ImportFact, FactResolution, ImportFactType } from '../../lib/import/semantic/types';
import { FACT_TYPE_TO_IMPORT_FIELD } from '../../lib/import/semantic/types';

// Load environment
const envLocalPath = path.resolve(__dirname, '../../.env.local');
const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envLocalPath)) dotenvConfig({ path: envLocalPath });
if (fs.existsSync(envTestPath)) dotenvConfig({ path: envTestPath });

// =============================================================================
// Test Configuration
// =============================================================================

const TEST_DOCS_DIR = path.resolve(__dirname, 'docs');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TestDocument {
  fileName: string;
  filePath: string;
  expectedFields: Partial<ExpectedFieldCoverage>;
  description: string;
}

interface ExpectedFieldCoverage {
  general: (keyof ImportedGeneral)[];
  deal: (keyof ImportedDeal)[];
  flights: (keyof ImportedFlight)[];
  hotels: (keyof ImportedHotel)[];
  contacts: (keyof ImportedContact)[];
  activities: (keyof ImportedActivity)[];
  technical: (keyof ImportedTechnical)[];
}

interface FieldCoverageResult {
  section: string;
  field: string;
  expected: boolean;
  extracted: boolean;
  value: string | null;
  factType: ImportFactType | null;
  status: 'pass' | 'fail' | 'unexpected';
}

// =============================================================================
// Test Documents Configuration
// =============================================================================

const TEST_DOCUMENTS: TestDocument[] = [
  {
    fileName: 'Dashboard _ Manage Booking _ Flights _ Turkish Airlines.pdf',
    filePath: path.join(TEST_DOCS_DIR, 'Dashboard _ Manage Booking _ Flights _ Turkish Airlines.pdf'),
    description: 'Turkish Airlines flight booking confirmation with multiple legs',
    expectedFields: {
      flights: [
        'airline',
        'flightNumber',
        'fromCity',
        'fromAirport', 
        'toCity',
        'toAirport',
        'departureTime',
        'arrivalTime',
        'fullName',
        'bookingReference',
        'ticketNumber',
        'seat',
        'travelClass',
        'aircraft',
        'flightTime',
      ],
      contacts: ['name'],
    },
  },
  {
    fileName: 'Son of Son @ Sohho, Dubai - 31.12.2024.pdf',
    filePath: path.join(TEST_DOCS_DIR, 'Son of Son @ Sohho, Dubai - 31.12.2024.pdf'),
    description: 'Show contract/confirmation with artist, venue, date, deal info',
    expectedFields: {
      general: ['artist', 'venue', 'date', 'city', 'country', 'setTime', 'eventName'],
      deal: ['fee', 'currency', 'paymentTerms', 'dealType'],
      hotels: ['name', 'city'], // Removed checkInDate/checkOutDate as they are not in doc
      contacts: ['name', 'email', 'phone', 'role'],
    },
  },
  {
    fileName: 'Son of Son @ Isle of Summer, München - 10.05.2025.pdf',
    filePath: path.join(TEST_DOCS_DIR, 'Son of Son @ Isle of Summer, München - 10.05.2025.pdf'),
    description: 'Festival show with event details (Image-based PDF - requires OCR)',
    expectedFields: {
      // Empty expectations as this doc requires OCR which is not yet implemented
      general: [],
      deal: [],
    },
  },
  {
    fileName: '8e72bd26-3a09-42d9-8482-fe5839b1b101.pdf',
    filePath: path.join(TEST_DOCS_DIR, '8e72bd26-3a09-42d9-8482-fe5839b1b101.pdf'),
    description: 'Shanghai Rider - analyzing content',
    expectedFields: {
      general: ['artist', 'venue', 'date'],
    },
  },
];

// =============================================================================
// PDF Text Extraction
// =============================================================================

interface ExtractedPdfText {
  fileName: string;
  rawText: string;
  pageCount: number;
  wordCount: number;
}

async function extractTextFromPdf(filePath: string): Promise<ExtractedPdfText | null> {
  const fileName = path.basename(filePath);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ File not found: ${filePath}`);
    return null;
  }

  let parser: PDFParse | null = null;
  try {
    // Read the PDF file
    const buffer = fs.readFileSync(filePath);
    
    // Use pdf-parse v2 API
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    
    const rawText = result.text;
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    
    console.log(`     ✓ Extracted ${wordCount} words from ${result.total} page(s)`);
    
    return {
      fileName,
      rawText,
      pageCount: result.total,
      wordCount,
    };
  } catch (error) {
    console.log(`     ❌ PDF extraction failed: ${error instanceof Error ? error.message : error}`);
    return {
      fileName,
      rawText: '',
      pageCount: 0,
      wordCount: 0,
    };
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// =============================================================================
// Mock Semantic Extraction (for testing prompts/logic)
// =============================================================================

interface MockExtractionResult {
  facts: ExtractedFact[];
  rawLLMResponse?: string;
  error?: string;
}

async function mockExtractFacts(
  text: string,
  fileName: string,
  chunkIndex: number = 0
): Promise<MockExtractionResult> {
  if (!OPENAI_API_KEY) {
    return { facts: [], error: 'OPENAI_API_KEY not set' };
  }

  // Import the actual extraction function
  const { extractFactsFromChunk } = await import('../../lib/import/semantic/fact-extraction');
  
  const result = await extractFactsFromChunk({
    job_id: 'test-job-' + Date.now(),
    source_id: 'test-source-' + Date.now(),
    source_file_name: fileName,
    chunk_index: chunkIndex,
    chunk_text: text,
    previous_facts: [],
    message_index: 0,
  });

  return {
    facts: result.facts,
    error: result.warnings?.join('; '),
  };
}

// =============================================================================
// Field Coverage Analysis
// =============================================================================

function analyzeFieldCoverage(
  extractedData: ImportData,
  expectedFields: Partial<ExpectedFieldCoverage>,
  extractedFacts: ExtractedFact[]
): FieldCoverageResult[] {
  const results: FieldCoverageResult[] = [];

  // Build fact lookup by field path
  const factsByFieldPath = new Map<string, ExtractedFact[]>();
  for (const fact of extractedFacts) {
    const fieldPath = FACT_TYPE_TO_IMPORT_FIELD[fact.fact_type];
    if (!factsByFieldPath.has(fieldPath)) {
      factsByFieldPath.set(fieldPath, []);
    }
    factsByFieldPath.get(fieldPath)!.push(fact);
  }

  // Check general section
  if (expectedFields.general) {
    for (const field of expectedFields.general) {
      const value = extractedData.general[field];
      const fieldPath = `general.${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      results.push({
        section: 'general',
        field,
        expected: true,
        extracted: !!value,
        value: value || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: value ? 'pass' : 'fail',
      });
    }
  }

  // Check deal section
  if (expectedFields.deal) {
    for (const field of expectedFields.deal) {
      const value = extractedData.deal[field];
      const fieldPath = `deal.${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      results.push({
        section: 'deal',
        field,
        expected: true,
        extracted: !!value,
        value: value || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: value ? 'pass' : 'fail',
      });
    }
  }

  // Check flights (array)
  if (expectedFields.flights) {
    const flights = extractedData.flights || [];
    for (const field of expectedFields.flights) {
      // Check if ANY flight has this field populated
      const hasValue = flights.some(f => !!(f as any)[field]);
      const fieldPath = `flights[].${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      const firstValue = flights.find(f => (f as any)[field])?.[field as keyof ImportedFlight];
      results.push({
        section: 'flights',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue as string || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
      });
    }
  }

  // Check hotels (array)
  if (expectedFields.hotels) {
    const hotels = extractedData.hotels || [];
    for (const field of expectedFields.hotels) {
      const hasValue = hotels.some(h => !!(h as any)[field]);
      const fieldPath = `hotels[].${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      const firstValue = hotels.find(h => (h as any)[field])?.[field as keyof ImportedHotel];
      results.push({
        section: 'hotels',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue as string || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
      });
    }
  }

  // Check contacts (array)
  if (expectedFields.contacts) {
    const contacts = extractedData.contacts || [];
    for (const field of expectedFields.contacts) {
      const hasValue = contacts.some(c => !!(c as any)[field]);
      const fieldPath = `contacts[].${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      const firstValue = contacts.find(c => (c as any)[field])?.[field as keyof ImportedContact];
      results.push({
        section: 'contacts',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue as string || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
      });
    }
  }

  // Check activities (array)
  if (expectedFields.activities) {
    const activities = extractedData.activities || [];
    for (const field of expectedFields.activities) {
      const hasValue = activities.some(a => !!(a as any)[field]);
      const fieldPath = `activities[].${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      const firstValue = activities.find(a => (a as any)[field])?.[field as keyof ImportedActivity];
      results.push({
        section: 'activities',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue as string || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
      });
    }
  }

  // Check technical section
  if (expectedFields.technical) {
    for (const field of expectedFields.technical) {
      const value = extractedData.technical[field];
      const fieldPath = `technical.${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      results.push({
        section: 'technical',
        field,
        expected: true,
        extracted: !!value,
        value: value || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: value ? 'pass' : 'fail',
      });
    }
  }

  return results;
}

// =============================================================================
// Test Execution
// =============================================================================

class SemanticImportE2ETest {
  private results: Map<string, {
    document: TestDocument;
    facts: ExtractedFact[];
    resolutions: FactResolution[];
    extractedData: ImportData;
    coverage: FieldCoverageResult[];
    errors: string[];
  }> = new Map();

  async run() {
    console.log('\n' + '═'.repeat(80));
    console.log('🧪 SEMANTIC IMPORT END-TO-END TEST');
    console.log('═'.repeat(80));
    console.log('\nPurpose: Identify gaps in field extraction from real documents\n');

    // Check prerequisites
    if (!OPENAI_API_KEY) {
      console.log('❌ ERROR: OPENAI_API_KEY not set. Cannot run extraction tests.');
      console.log('   Set OPENAI_API_KEY in .env.local to run this test.\n');
      process.exit(1);
    }

    // Run tests for each document
    for (const doc of TEST_DOCUMENTS) {
      await this.testDocument(doc);
    }

    // Print comprehensive results
    this.printResults();
  }

  private async testDocument(doc: TestDocument) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📄 Testing: ${doc.fileName}`);
    console.log(`   ${doc.description}`);
    console.log('─'.repeat(80));

    const errors: string[] = [];
    let facts: ExtractedFact[] = [];
    let resolutions: FactResolution[] = [];
    let extractedData: ImportData = {
      general: { artist: '', eventName: '', venue: '', date: '', setTime: '', city: '', country: '' },
      deal: { fee: '', paymentTerms: '', dealType: '', currency: '', notes: '' },
      hotels: [],
      food: [],
      flights: [],
      activities: [],
      documents: [],
      contacts: [],
      technical: { equipment: '', backline: '', stageSetup: '', lightingRequirements: '', soundcheck: '', other: '' },
    };

    // Step 1: Extract text from PDF
    console.log('\n  📖 Step 1: PDF Text Extraction');
    const pdfResult = await extractTextFromPdf(doc.filePath);
    
    if (!pdfResult || !pdfResult.rawText || pdfResult.wordCount < 10) {
      console.log(`     ⚠️ No usable text extracted from PDF`);
      errors.push('PDF text extraction failed or returned no usable text');
      
      // Store results and return early
      this.results.set(doc.fileName, {
        document: doc,
        facts,
        resolutions,
        extractedData,
        coverage: [],
        errors,
      });
      return;
    }

    // Step 2: Run fact extraction
    console.log('\n  🔬 Step 2: Fact Extraction (Stage 1)');
    const extractionResult = await mockExtractFacts(pdfResult.rawText, doc.fileName);
    facts = extractionResult.facts;
    
    if (extractionResult.error) {
      errors.push(`Extraction error: ${extractionResult.error}`);
    }
    
    console.log(`     ✓ Extracted ${facts.length} facts (before post-processing)`);
    
    // Run post-processing
    const { postProcessAllFacts } = await import('../../lib/import/semantic/post-process');
    const factsBeforePostProcess = facts.length;
    facts = postProcessAllFacts(facts);
    
    console.log(`     ✓ Post-processed: ${factsBeforePostProcess} → ${facts.length} facts`);
    
    // Group facts by type for display
    const factsByType = new Map<string, ExtractedFact[]>();
    for (const fact of facts) {
      if (!factsByType.has(fact.fact_type)) {
        factsByType.set(fact.fact_type, []);
      }
      factsByType.get(fact.fact_type)!.push(fact);
    }
    
    console.log('\n     Extracted fact types:');
    for (const [type, typeFacts] of factsByType) {
      const values = typeFacts.map(f => f.value_text || f.value_number || f.value_date).slice(0, 2);
      console.log(`       • ${type}: ${typeFacts.length} fact(s) - ${values.join(', ')}${typeFacts.length > 2 ? '...' : ''}`);
    }

    // Step 3: Run resolution
    console.log('\n  🧠 Step 3: Semantic Resolution (Stage 2)');
    const { resolveImportFacts } = await import('../../lib/import/semantic/resolution');
    
    // Convert ExtractedFact[] to ImportFact[] for resolution
    const importFacts: ImportFact[] = facts.map((f, idx) => ({
      ...f,
      id: `fact-${idx}`,
      job_id: 'test-job',
      is_selected: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    const resolutionResult = await resolveImportFacts({
      job_id: 'test-job',
      facts: importFacts,
    });
    resolutions = resolutionResult.resolutions;
    
    console.log(`     ✓ Generated ${resolutions.length} resolutions`);
    
    const resolved = resolutions.filter(r => r.state === 'resolved');
    const informational = resolutions.filter(r => r.state === 'informational');
    const unagreed = resolutions.filter(r => r.state === 'unagreed');
    const missing = resolutions.filter(r => r.state === 'missing');
    
    console.log(`       • Resolved: ${resolved.length}`);
    console.log(`       • Informational: ${informational.length}`);
    console.log(`       • Unagreed: ${unagreed.length}`);
    console.log(`       • Missing: ${missing.length}`);

    // Step 4: Apply resolutions to ImportData
    console.log('\n  📝 Step 4: Apply to ImportData (Stage 3)');
    const { applyResolutionsToImportData } = await import('../../lib/import/semantic/orchestrator');
    
    const selectedFacts = importFacts.filter(f => 
      resolutionResult.selected_fact_ids.includes(f.id)
    );
    
    extractedData = applyResolutionsToImportData(resolutions, selectedFacts);
    console.log(`     ✓ ImportData populated`);

    // Step 5: Analyze coverage
    console.log('\n  📊 Step 5: Field Coverage Analysis');
    const coverage = analyzeFieldCoverage(extractedData, doc.expectedFields, facts);
    
    const passed = coverage.filter(c => c.status === 'pass');
    const failed = coverage.filter(c => c.status === 'fail');
    
    console.log(`     Expected fields: ${coverage.length}`);
    console.log(`     ✅ Extracted: ${passed.length}`);
    console.log(`     ❌ Missing: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\n     Missing fields:');
      for (const f of failed) {
        console.log(`       • ${f.section}.${f.field}`);
      }
    }

    // Store results
    this.results.set(doc.fileName, {
      document: doc,
      facts,
      resolutions,
      extractedData,
      coverage,
      errors,
    });
  }

  private printResults() {
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('═'.repeat(80));

    // Overall statistics
    let totalExpected = 0;
    let totalExtracted = 0;
    let totalMissing = 0;
    const missingBySection: Map<string, string[]> = new Map();

    for (const [fileName, result] of this.results) {
      console.log(`\n📄 ${fileName}`);
      console.log('─'.repeat(60));
      
      const passed = result.coverage.filter(c => c.status === 'pass');
      const failed = result.coverage.filter(c => c.status === 'fail');
      
      totalExpected += result.coverage.length;
      totalExtracted += passed.length;
      totalMissing += failed.length;

      // Show extracted data summary
      console.log('\n  Extracted Data Summary:');
      const data = result.extractedData;
      
      if (data.general.artist || data.general.venue || data.general.date) {
        console.log(`    General: ${data.general.artist || '?'} @ ${data.general.venue || '?'} (${data.general.date || '?'})`);
      }
      if (data.deal.fee) {
        console.log(`    Deal: ${data.deal.currency || ''} ${data.deal.fee} (${data.deal.dealType || 'type unknown'})`);
      }
      if (data.flights.length > 0) {
        console.log(`    Flights: ${data.flights.length} flight(s)`);
        for (const flight of data.flights.slice(0, 3)) {
          console.log(`      • ${flight.flightNumber || '?'}: ${flight.fromCity || '?'} → ${flight.toCity || '?'} (${flight.departureTime || '?'})`);
        }
        if (data.flights.length > 3) {
          console.log(`      ... and ${data.flights.length - 3} more`);
        }
      }
      if (data.hotels.length > 0) {
        console.log(`    Hotels: ${data.hotels.length} hotel(s)`);
        for (const hotel of data.hotels) {
          console.log(`      • ${hotel.name || '?'} (${hotel.checkInDate || '?'} - ${hotel.checkOutDate || '?'})`);
        }
      }
      if (data.contacts.length > 0) {
        console.log(`    Contacts: ${data.contacts.length} contact(s)`);
        for (const contact of data.contacts) {
          console.log(`      • ${contact.name || '?'} (${contact.role || '?'}): ${contact.email || contact.phone || '?'}`);
        }
      }

      // Show coverage details
      console.log(`\n  Field Coverage: ${passed.length}/${result.coverage.length} (${Math.round(passed.length / result.coverage.length * 100)}%)`);
      
      if (failed.length > 0) {
        console.log('\n  ❌ Missing Fields:');
        for (const f of failed) {
          console.log(`      • ${f.section}.${f.field}`);
          
          // Track for summary
          const key = `${f.section}.${f.field}`;
          if (!missingBySection.has(f.section)) {
            missingBySection.set(f.section, []);
          }
          if (!missingBySection.get(f.section)!.includes(f.field)) {
            missingBySection.get(f.section)!.push(f.field);
          }
        }
      }

      // Show extracted facts breakdown
      console.log(`\n  Facts Extracted: ${result.facts.length}`);
      const factsByStatus = new Map<string, number>();
      for (const fact of result.facts) {
        factsByStatus.set(fact.status, (factsByStatus.get(fact.status) || 0) + 1);
      }
      for (const [status, count] of factsByStatus) {
        console.log(`      • ${status}: ${count}`);
      }

      // Show errors if any
      if (result.errors.length > 0) {
        console.log('\n  ⚠️ Errors:');
        for (const err of result.errors) {
          console.log(`      • ${err}`);
        }
      }
    }

    // Overall summary
    console.log('\n\n' + '═'.repeat(80));
    console.log('📈 OVERALL SUMMARY');
    console.log('═'.repeat(80));
    
    const overallCoverage = totalExpected > 0 ? Math.round(totalExtracted / totalExpected * 100) : 0;
    console.log(`\n  Total Expected Fields: ${totalExpected}`);
    console.log(`  ✅ Successfully Extracted: ${totalExtracted}`);
    console.log(`  ❌ Missing: ${totalMissing}`);
    console.log(`  📊 Overall Coverage: ${overallCoverage}%`);

    if (missingBySection.size > 0) {
      console.log('\n  Most Commonly Missing Fields:');
      for (const [section, fields] of missingBySection) {
        console.log(`    ${section}:`);
        for (const field of fields) {
          console.log(`      • ${field}`);
        }
      }
    }

    // Recommendations
    console.log('\n\n' + '─'.repeat(80));
    console.log('💡 RECOMMENDATIONS');
    console.log('─'.repeat(80));
    
    if (totalMissing > 0) {
      console.log('\n  To improve extraction coverage:');
      console.log('  1. Review the LLM prompts in fact-extraction.ts');
      console.log('  2. Add more specific examples for missing field types');
      console.log('  3. Check if documents contain the expected data');
      console.log('  4. Verify fact_type mappings in types.ts');
      console.log('  5. Test with different document formats');
    } else {
      console.log('\n  ✅ All expected fields were extracted successfully!');
    }

    console.log('\n' + '═'.repeat(80));
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  const test = new SemanticImportE2ETest();
  await test.run();
  
  console.log('\n✅ Test complete!\n');
}

main().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
