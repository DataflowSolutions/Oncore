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
const TEST_RESULTS_DIR = path.resolve(__dirname, 'results');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TestResult {
  document: string;
  timestamp: string;
  facts: ExtractedFact[];
  resolutions: FactResolution[];
  extractedData: ImportData;
  coverage: FieldCoverageResult[];
  errors: string[];
  stats: {
    factsExtracted: number;
    factsPostProcessed: number;
    resolutionsGenerated: number;
    resolvedCount: number;
    informationalCount: number;
    unagreedCount: number;
    missingCount: number;
    expectedFields: number;
    extractedFields: number;
    missingFields: number;
    coveragePercent: number;
  };
}

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
  food: string[]; // Using string[] since ImportedFood has optional fields
  contacts: (keyof ImportedContact)[];
  activities: string[]; // Using string[] since ImportedActivity has optional fields
  technical: (keyof ImportedTechnical)[];
  documents: string[]; // Using string[] since ImportedDocument has optional fields
}

interface FieldCoverageResult {
  section: string;
  field: string;
  expected: boolean;
  extracted: boolean;
  value: string | null;
  factType: ImportFactType | null;
  status: 'pass' | 'fail' | 'unexpected';
  coveragePercent?: number; // For array fields (flights, hotels, etc.)
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
      general: ['artist', 'eventName', 'venue', 'date', 'setTime', 'city', 'country'],
      deal: ['fee', 'paymentTerms', 'dealType', 'currency', 'notes'],
      // Only test fields extracted by LLM - API enrichment fields verified separately
      flights: [
        'flightNumber', 'date', 'fullName', 'ticketNumber', 'bookingReference', 
        'seat', 'travelClass', 'notes'
      ],
      hotels: ['name', 'address', 'city', 'country', 'checkInDate', 'checkInTime', 'checkOutDate', 'checkOutTime', 'bookingReference', 'phone', 'email', 'notes'],
      food: ['name', 'address', 'city', 'country', 'bookingReference', 'phone', 'email', 'notes', 'serviceDate', 'serviceTime', 'guestCount'],
      contacts: ['name', 'phone', 'email', 'role'],
      activities: ['name', 'location', 'startTime', 'endTime', 'notes', 'hasDestination', 'destinationName', 'destinationLocation'],
      technical: ['equipment', 'backline', 'stageSetup', 'lightingRequirements', 'soundcheck', 'other'],
    },
  },
  {
    fileName: 'Son of Son @ Sohho, Dubai - 31.12.2024.pdf',
    filePath: path.join(TEST_DOCS_DIR, 'Son of Son @ Sohho, Dubai - 31.12.2024.pdf'),
    description: 'Show contract/confirmation with artist, venue, date, deal info',
    expectedFields: {
      general: ['artist', 'eventName', 'venue', 'date', 'setTime', 'city', 'country'],
      deal: ['fee', 'paymentTerms', 'dealType', 'currency', 'notes'],
      // Only test fields extracted by LLM - API enrichment fields verified separately
      flights: [
        'flightNumber', 'date', 'fullName', 'ticketNumber', 'bookingReference', 
        'seat', 'travelClass', 'notes'
      ],
      hotels: ['name', 'address', 'city', 'country', 'checkInDate', 'checkInTime', 'checkOutDate', 'checkOutTime', 'bookingReference', 'phone', 'email', 'notes'],
      food: ['name', 'address', 'city', 'country', 'bookingReference', 'phone', 'email', 'notes', 'serviceDate', 'serviceTime', 'guestCount'],
      contacts: ['name', 'phone', 'email', 'role'],
      activities: ['name', 'location', 'startTime', 'endTime', 'notes', 'hasDestination', 'destinationName', 'destinationLocation'],
      technical: ['equipment', 'backline', 'stageSetup', 'lightingRequirements', 'soundcheck', 'other'],
    },
  },
  {
    fileName: 'Son of Son @ Isle of Summer, München - 10.05.2025.pdf',
    filePath: path.join(TEST_DOCS_DIR, 'Son of Son @ Isle of Summer, München - 10.05.2025.pdf'),
    description: 'Festival show with event details (Image-based PDF - requires OCR)',
    expectedFields: {
      general: ['artist', 'eventName', 'venue', 'date', 'setTime', 'city', 'country'],
      deal: ['fee', 'paymentTerms', 'dealType', 'currency', 'notes'],
      // Only test fields extracted by LLM - API enrichment fields verified separately
      flights: [
        'flightNumber', 'date', 'fullName', 'ticketNumber', 'bookingReference', 
        'seat', 'travelClass', 'notes'
      ],
      hotels: ['name', 'address', 'city', 'country', 'checkInDate', 'checkInTime', 'checkOutDate', 'checkOutTime', 'bookingReference', 'phone', 'email', 'notes'],
      food: ['name', 'address', 'city', 'country', 'bookingReference', 'phone', 'email', 'notes', 'serviceDate', 'serviceTime', 'guestCount'],
      contacts: ['name', 'phone', 'email', 'role'],
      activities: ['name', 'location', 'startTime', 'endTime', 'notes', 'hasDestination', 'destinationName', 'destinationLocation'],
      technical: ['equipment', 'backline', 'stageSetup', 'lightingRequirements', 'soundcheck', 'other'],
      documents: ['fileName', 'fileSize', 'category'],
    },
  },
  {
    fileName: '8e72bd26-3a09-42d9-8482-fe5839b1b101.pdf',
    filePath: path.join(TEST_DOCS_DIR, '8e72bd26-3a09-42d9-8482-fe5839b1b101.pdf'),
    description: 'Shanghai Rider - full schema validation',
    expectedFields: {
      general: ['artist', 'eventName', 'venue', 'date', 'setTime', 'city', 'country'],
      deal: ['fee', 'paymentTerms', 'dealType', 'currency', 'notes'],
      // Only test fields extracted by LLM - API enrichment fields verified separately
      flights: [
        'flightNumber', 'date', 'fullName', 'ticketNumber', 'bookingReference', 
        'seat', 'travelClass', 'notes'
      ],
      hotels: ['name', 'address', 'city', 'country', 'checkInDate', 'checkInTime', 'checkOutDate', 'checkOutTime', 'bookingReference', 'phone', 'email', 'notes'],
      food: ['name', 'address', 'city', 'country', 'bookingReference', 'phone', 'email', 'notes', 'serviceDate', 'serviceTime', 'guestCount'],
      contacts: ['name', 'phone', 'email', 'role'],
      activities: ['name', 'location', 'startTime', 'endTime', 'notes', 'hasDestination', 'destinationName', 'destinationLocation'],
      technical: ['equipment', 'backline', 'stageSetup', 'lightingRequirements', 'soundcheck', 'other'],
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
      
      // Calculate coverage percent: how many flights have this field populated
      const populatedCount = flights.filter(f => !!(f as any)[field]).length;
      const coveragePercent = flights.length > 0 ? Math.round((populatedCount / flights.length) * 100) : 0;
      
      results.push({
        section: 'flights',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue as string || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
        coveragePercent,
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
      
      // Calculate coverage percent: how many hotels have this field populated
      const populatedCount = hotels.filter(h => !!(h as any)[field]).length;
      const coveragePercent = hotels.length > 0 ? Math.round((populatedCount / hotels.length) * 100) : 0;
      
      results.push({
        section: 'hotels',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue as string || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
        coveragePercent,
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
      
      // Calculate coverage percent: how many contacts have this field populated
      const populatedCount = contacts.filter(c => !!(c as any)[field]).length;
      const coveragePercent = contacts.length > 0 ? Math.round((populatedCount / contacts.length) * 100) : 0;
      
      results.push({
        section: 'contacts',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue as string || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
        coveragePercent,
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
      
      // Calculate coverage percent: how many activities have this field populated
      const populatedCount = activities.filter(a => !!(a as any)[field]).length;
      const coveragePercent = activities.length > 0 ? Math.round((populatedCount / activities.length) * 100) : 0;
      
      results.push({
        section: 'activities',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue as string || null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
        coveragePercent,
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

  // Check food (array)
  if (expectedFields.food) {
    const food = extractedData.food || [];
    for (const field of expectedFields.food) {
      const hasValue = food.some(f => !!(f as any)[field]);
      const fieldPath = `food[].${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      const firstItem = food.find(f => (f as any)[field]);
      const firstValue = firstItem ? (firstItem as any)[field] : null;
      
      // Calculate coverage percent: how many food items have this field populated
      const populatedCount = food.filter(f => !!(f as any)[field]).length;
      const coveragePercent = food.length > 0 ? Math.round((populatedCount / food.length) * 100) : 0;
      
      results.push({
        section: 'food',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue ? String(firstValue) : null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
        coveragePercent,
      });
    }
  }

  // Check documents (array)
  if (expectedFields.documents) {
    const documents = extractedData.documents || [];
    for (const field of expectedFields.documents) {
      const hasValue = documents.some(d => !!(d as any)[field]);
      const fieldPath = `documents[].${field}`;
      const facts = factsByFieldPath.get(fieldPath) || [];
      const firstItem = documents.find(d => (d as any)[field]);
      const firstValue = firstItem ? (firstItem as any)[field] : null;
      
      // Calculate coverage percent: how many documents have this field populated
      const populatedCount = documents.filter(d => !!(d as any)[field]).length;
      const coveragePercent = documents.length > 0 ? Math.round((populatedCount / documents.length) * 100) : 0;
      
      results.push({
        section: 'documents',
        field,
        expected: true,
        extracted: hasValue,
        value: firstValue ? String(firstValue) : null,
        factType: facts.length > 0 ? facts[0].fact_type : null,
        status: hasValue ? 'pass' : 'fail',
        coveragePercent,
      });
    }
  }

  return results;
}

// =============================================================================
// Test Results Export
// =============================================================================

function saveTestResults(results: TestResult[], timestamp: string): string {
  // Ensure results directory exists
  if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
  }

  // Create filename with timestamp
  const fileName = `test-results-${timestamp}.json`;
  const filePath = path.join(TEST_RESULTS_DIR, fileName);

  // Calculate summary stats
  const summary = {
    timestamp,
    totalDocuments: results.length,
    totalFacts: results.reduce((sum, r) => sum + r.stats.factsExtracted, 0),
    totalResolutions: results.reduce((sum, r) => sum + r.stats.resolutionsGenerated, 0),
    totalExpectedFields: results.reduce((sum, r) => sum + r.stats.expectedFields, 0),
    totalExtractedFields: results.reduce((sum, r) => sum + r.stats.extractedFields, 0),
    totalMissingFields: results.reduce((sum, r) => sum + r.stats.missingFields, 0),
    overallCoveragePercent: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.stats.coveragePercent, 0) / results.length)
      : 0,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    
    // Coverage by section
    coverageBySection: calculateSectionCoverage(results),
  };

  // Create output structure
  const output = {
    summary,
    results,
  };

  // Write to file
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');

  return filePath;
}

function calculateSectionCoverage(results: TestResult[]): Record<string, { expected: number; extracted: number; percent: number }> {
  const sectionStats = new Map<string, { expected: number; extracted: number }>();
  
  for (const result of results) {
    for (const field of result.coverage) {
      if (!sectionStats.has(field.section)) {
        sectionStats.set(field.section, { expected: 0, extracted: 0 });
      }
      const stats = sectionStats.get(field.section)!;
      stats.expected++;
      if (field.extracted) {
        stats.extracted++;
      }
    }
  }
  
  const output: Record<string, { expected: number; extracted: number; percent: number }> = {};
  for (const [section, stats] of sectionStats) {
    output[section] = {
      ...stats,
      percent: stats.expected > 0 ? Math.round((stats.extracted / stats.expected) * 100) : 0,
    };
  }
  
  return output;
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
  
  private testResults: TestResult[] = [];
  private timestamp: string = '';

  async run() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
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
    const flightEnrichment = await import('../../lib/import/semantic/flight-enrichment');
    const { getFlightEnrichmentService } = flightEnrichment;
    type ExtractedFlightKey = flightEnrichment.ExtractedFlightKey;
    
    const selectedFacts = importFacts.filter(f => 
      resolutionResult.selected_fact_ids.includes(f.id)
    );
    
    extractedData = applyResolutionsToImportData(resolutions, selectedFacts);
    console.log(`     ✓ ImportData populated`);

    // Step 4.5: Flight Enrichment (API lookup for airports, times, etc.)
    if (extractedData.flights && extractedData.flights.length > 0) {
      console.log(`\n  ✈️  Step 4.5: Enriching ${extractedData.flights.length} flight(s)`);
      
      const flightEnrichmentService = getFlightEnrichmentService();
      
      // Convert ImportedFlight[] to ExtractedFlightKey[] for enrichment
      const flightKeys: ExtractedFlightKey[] = extractedData.flights.map(flight => ({
        flightNumber: flight.flightNumber || '',
        date: flight.date,
        passengerName: flight.fullName,
        ticketNumber: flight.ticketNumber,
        bookingReference: flight.bookingReference,
        seat: flight.seat,
        travelClass: flight.travelClass,
        notes: flight.notes,
      }));

      // Enrich all flights
      const enrichedFlights = await flightEnrichmentService.enrichFlights(flightKeys);

      // Merge enriched data back into flights
      extractedData.flights = extractedData.flights.map((flight, index) => {
        const enriched = enrichedFlights[index];

        if (enriched.enrichmentStatus === 'success') {
          console.log(`     ✓ Enriched ${enriched.flightNumber}: ${enriched.fromCity} → ${enriched.toCity}`);
          return {
            ...flight,
            // API-enriched fields (only set if successfully enriched)
            airline: enriched.airline || flight.airline,
            fromAirport: enriched.fromAirport || flight.fromAirport,
            fromCity: enriched.fromCity || flight.fromCity,
            toAirport: enriched.toAirport || flight.toAirport,
            toCity: enriched.toCity || flight.toCity,
            departureTime: enriched.departureTime || flight.departureTime,
            arrivalTime: enriched.arrivalTime || flight.arrivalTime,
            flightTime: enriched.flightTime || flight.flightTime,
            aircraft: enriched.aircraft || flight.aircraft,
          };
        }

        // Enrichment failed - keep original data (keys only)
        if (enriched.enrichmentStatus === 'failed') {
          console.log(`     ⚠️  Enrichment failed for ${flight.flightNumber}: ${enriched.enrichmentError}`);
        }

        return flight;
      });

      const successCount = enrichedFlights.filter(f => f.enrichmentStatus === 'success').length;
      console.log(`     ✓ Enrichment complete: ${successCount}/${enrichedFlights.length} successful`);
    }

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

    // Collect test result
    const testResult: TestResult = {
      document: doc.fileName,
      timestamp: new Date().toISOString(),
      facts,
      resolutions,
      extractedData,
      coverage,
      errors,
      stats: {
        factsExtracted: facts.length,
        factsPostProcessed: facts.length,
        resolutionsGenerated: resolutions.length,
        resolvedCount: resolved.length,
        informationalCount: informational.length,
        unagreedCount: unagreed.length,
        missingCount: missing.length,
        expectedFields: coverage.length,
        extractedFields: passed.length,
        missingFields: failed.length,
        coveragePercent: coverage.length > 0 ? Math.round(passed.length / coverage.length * 100) : 0,
      },
    };
    
    this.testResults.push(testResult);

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
        for (const hotel of data.hotels.slice(0, 2)) {
          console.log(`      • ${hotel.name || '?'} (${hotel.checkInDate || '?'} - ${hotel.checkOutDate || '?'})`);
        }
        if (data.hotels.length > 2) {
          console.log(`      ... and ${data.hotels.length - 2} more`);
        }
      }
      if (data.food.length > 0) {
        console.log(`    Food: ${data.food.length} item(s)`);
        for (const food of data.food.slice(0, 2)) {
          console.log(`      • ${food.name || '?'} (${food.city || '?'}) - ${food.serviceDate || '?'}`);
        }
        if (data.food.length > 2) {
          console.log(`      ... and ${data.food.length - 2} more`);
        }
      }
      if (data.activities.length > 0) {
        console.log(`    Activities: ${data.activities.length} item(s)`);
        for (const activity of data.activities.slice(0, 2)) {
          console.log(`      • ${activity.name || '?'} at ${activity.location || '?'} (${activity.startTime || '?'})`);
        }
        if (data.activities.length > 2) {
          console.log(`      ... and ${data.activities.length - 2} more`);
        }
      }
      if (data.contacts.length > 0) {
        console.log(`    Contacts: ${data.contacts.length} contact(s)`);
        for (const contact of data.contacts.slice(0, 2)) {
          console.log(`      • ${contact.name || '?'} (${contact.role || '?'}): ${contact.email || contact.phone || '?'}`);
        }
        if (data.contacts.length > 2) {
          console.log(`      ... and ${data.contacts.length - 2} more`);
        }
      }
      if (data.documents.length > 0) {
        console.log(`    Documents: ${data.documents.length} document(s)`);
        for (const doc of data.documents.slice(0, 2)) {
          console.log(`      • ${doc.fileName || '?'} (${doc.category || '?'})`);
        }
        if (data.documents.length > 2) {
          console.log(`      ... and ${data.documents.length - 2} more`);
        }
      }
      if (data.technical.equipment || data.technical.backline || data.technical.other) {
        console.log(`    Technical: ${[data.technical.equipment, data.technical.backline, data.technical.other].filter(Boolean).join(', ') || 'None'}`);
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

    // Coverage breakdown by section across all documents
    console.log('\n  Coverage by Section (across all documents):');
    const sectionStats = new Map<string, { expected: number; extracted: number }>();
    
    for (const result of this.results.values()) {
      for (const field of result.coverage) {
        if (!sectionStats.has(field.section)) {
          sectionStats.set(field.section, { expected: 0, extracted: 0 });
        }
        const stats = sectionStats.get(field.section)!;
        stats.expected++;
        if (field.extracted) {
          stats.extracted++;
        }
      }
    }
    
    // Sort by coverage percentage
    const sortedSections = Array.from(sectionStats.entries())
      .map(([section, stats]) => ({
        section,
        ...stats,
        percent: stats.expected > 0 ? Math.round((stats.extracted / stats.expected) * 100) : 0,
      }))
      .sort((a, b) => b.percent - a.percent);
    
    for (const { section, extracted, expected, percent } of sortedSections) {
      const emoji = percent >= 75 ? '✅' : percent >= 50 ? '⚠️' : '❌';
      console.log(`    ${emoji} ${section.padEnd(12)}: ${extracted}/${expected} (${percent}%)`);
    }

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

    // Save test results to JSON
    console.log('\n💾 Saving test results...');
    const resultsPath = saveTestResults(this.testResults, this.timestamp);
    console.log(`   ✓ Results saved to: ${resultsPath}`);
    console.log(`   📊 View detailed results in JSON format\n`);
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
