/**
 * Diagnostic test: coverage of ImportData mapping for real PDFs.
 * Prints which fields are filled vs default, and highlights gaps
 * like multi-leg flights collapsing to one entry.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractText } from '@/lib/import/text-extraction';
import { buildChunksForSection, type ImportSource } from '@/lib/import/chunking';
import { extractFactsFromChunk } from '../fact-extraction';
import { resolveImportFacts } from '../resolution';
import { applyResolutionsToImportData } from '../orchestrator';
import type { ExtractedFact, ImportFact } from '../types';
import { createEmptyImportData, type ImportData } from '@/components/import/types';

const PDF_DIR = path.join(__dirname, 'pdfs');
const TEST_JOB_ID = 'coverage-test-job';

interface Coverage {
  path: string;
  value: unknown;
  isDefault: boolean;
  isFilled: boolean;
}

interface SectionReport {
  section: string;
  fields: Coverage[];
}

const TEST_PDFS = [
  'Dashboard _ Manage Booking _ Flights _ Turkish Airlines.pdf',
  'Son of Son @ Sohho, Dubai - 31.12.2024.pdf',
  'Son of Son @ Isle of Summer, MǬnchen - 10.05.2025.pdf',
  '8e72bd26-3a09-42d9-8482-fe5839b1b101.pdf',
];

// Helpers
function makeImportSourceFromPdf(fileName: string): ImportSource | null {
  const filePath = path.join(PDF_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return extractText({
    fileName,
    mimeType: 'application/pdf',
    buffer,
  }).then((result) => ({
    id: `source-${fileName.replace(/[^a-z0-9]/gi, '-')}`,
    fileName,
    mimeType: 'application/pdf',
    rawText: result.text,
  })).catch(() => null);
}

async function loadSources(): Promise<ImportSource[]> {
  const sources: ImportSource[] = [];
  for (const file of TEST_PDFS) {
    const src = await makeImportSourceFromPdf(file);
    if (src) sources.push(src);
  }
  return sources;
}

async function extractFactsFromSource(source: ImportSource, jobId: string, previousFacts: ExtractedFact[] = []): Promise<{ facts: ExtractedFact[]; warnings: string[] }> {
  const allFacts: ExtractedFact[] = [];
  const allWarnings: string[] = [];
  const batches = buildChunksForSection('general', [source], 1000); // section ignored, we just need chunks
  let runningPrev = [...previousFacts];

  for (const chunk of batches) {
    const result = await extractFactsFromChunk({
      job_id: jobId,
      source_id: source.id,
      source_file_name: source.fileName,
      chunk_index: chunk.chunkIndex,
      chunk_text: chunk.text,
      previous_facts: runningPrev.slice(-20),
      message_index: chunk.chunkIndex,
    });
    allFacts.push(...result.facts);
    if (result.warnings) allWarnings.push(...result.warnings);
    runningPrev = [...runningPrev, ...result.facts];
  }

  return { facts: allFacts, warnings: allWarnings };
}

function convertToImportFacts(extracted: ExtractedFact[]): ImportFact[] {
  return extracted.map((fact, index) => ({
    ...fact,
    id: `fact-${index}-${fact.fact_type}-${Date.now()}`,
    job_id: TEST_JOB_ID,
    is_selected: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })) as ImportFact[];
}

function buildCoverage(data: ImportData): SectionReport[] {
  const defaults = createEmptyImportData();
  const reports: SectionReport[] = [];

  const pushField = (section: string, pathName: string, value: unknown, defaultValue: unknown) => {
    const isDefault = value === defaultValue || value === '' || value === undefined || value === null;
    reports.push({
      section,
      fields: [
        {
          path: pathName,
          value,
          isDefault,
          isFilled: !isDefault,
        },
      ],
    });
  };

  const addField = (section: string, pathName: string, value: unknown, defaultValue: unknown, map: Map<string, Coverage[]>) => {
    const isDefault = value === defaultValue || value === '' || value === undefined || value === null;
    const cov: Coverage = { path: pathName, value, isDefault, isFilled: !isDefault };
    const arr = map.get(section) || [];
    arr.push(cov);
    map.set(section, arr);
  };

  const sections = new Map<string, Coverage[]>();

  // General
  const g = data.general;
  const gd = defaults.general;
  addField('general', 'artist', g.artist, gd.artist, sections);
  addField('general', 'eventName', g.eventName, gd.eventName, sections);
  addField('general', 'venue', g.venue, gd.venue, sections);
  addField('general', 'date', g.date, gd.date, sections);
  addField('general', 'setTime', g.setTime, gd.setTime, sections);
  addField('general', 'city', g.city, gd.city, sections);
  addField('general', 'country', g.country, gd.country, sections);

  // Deal
  const d = data.deal;
  const dd = defaults.deal;
  addField('deal', 'fee', d.fee, dd.fee, sections);
  addField('deal', 'paymentTerms', d.paymentTerms, dd.paymentTerms, sections);
  addField('deal', 'dealType', d.dealType, dd.dealType, sections);
  addField('deal', 'currency', d.currency, dd.currency, sections);
  addField('deal', 'notes', d.notes, dd.notes, sections);

  // Hotels
  data.hotels.forEach((h, idx) => {
    const def = defaults.hotels[0] || {};
    addField(`hotels[${idx}]`, 'name', h.name, def.name, sections);
    addField(`hotels[${idx}]`, 'address', h.address, def.address, sections);
    addField(`hotels[${idx}]`, 'city', h.city, def.city, sections);
    addField(`hotels[${idx}]`, 'country', h.country, def.country, sections);
    addField(`hotels[${idx}]`, 'checkInDate', h.checkInDate, def.checkInDate, sections);
    addField(`hotels[${idx}]`, 'checkOutDate', h.checkOutDate, def.checkOutDate, sections);
  });
  if (data.hotels.length === 0) {
    addField('hotels', 'none', '', '', sections);
  }

  // Food
  data.food.forEach((f, idx) => {
    const def = defaults.food[0] || {};
    addField(`food[${idx}]`, 'name', f.name, def.name, sections);
    addField(`food[${idx}]`, 'notes', f.notes, def.notes, sections);
  });
  if (data.food.length === 0) {
    addField('food', 'none', '', '', sections);
  }

  // Flights
  data.flights.forEach((f, idx) => {
    const def = defaults.flights[0] || {};
    addField(`flights[${idx}]`, 'airline', f.airline, def.airline, sections);
    addField(`flights[${idx}]`, 'flightNumber', f.flightNumber, def.flightNumber, sections);
    addField(`flights[${idx}]`, 'fromCity', f.fromCity, def.fromCity, sections);
    addField(`flights[${idx}]`, 'fromAirport', f.fromAirport, def.fromAirport, sections);
    addField(`flights[${idx}]`, 'departureTime', f.departureTime, def.departureTime, sections);
    addField(`flights[${idx}]`, 'toCity', f.toCity, def.toCity, sections);
    addField(`flights[${idx}]`, 'toAirport', f.toAirport, def.toAirport, sections);
    addField(`flights[${idx}]`, 'arrivalTime', f.arrivalTime, def.arrivalTime, sections);
  });
  if (data.flights.length === 0) {
    addField('flights', 'none', '', '', sections);
  }

  // Activities
  data.activities.forEach((a, idx) => {
    const def = defaults.activities[0] || {};
    addField(`activities[${idx}]`, 'name', a.name, def.name, sections);
    addField(`activities[${idx}]`, 'notes', a.notes, def.notes, sections);
  });
  if (data.activities.length === 0) {
    addField('activities', 'none', '', '', sections);
  }

  // Contacts
  data.contacts.forEach((c, idx) => {
    const def = defaults.contacts[0] || {};
    addField(`contacts[${idx}]`, 'name', c.name, def.name, sections);
    addField(`contacts[${idx}]`, 'email', c.email, def.email, sections);
    addField(`contacts[${idx}]`, 'phone', c.phone, def.phone, sections);
    addField(`contacts[${idx}]`, 'role', c.role, def.role, sections);
  });
  if (data.contacts.length === 0) {
    addField('contacts', 'none', '', '', sections);
  }

  // Technical
  const t = data.technical;
  const td = defaults.technical;
  addField('technical', 'equipment', t.equipment, td.equipment, sections);
  addField('technical', 'other', t.other, td.other, sections);

  return Array.from(sections.entries()).map(([section, fields]) => ({
    section,
    fields,
  }));
}

function printCoverage(report: SectionReport[]): void {
  const lines: string[] = [];
  for (const section of report) {
    lines.push(`=== ${section.section.toUpperCase()} ===`);
    section.fields.forEach((f) => {
      const status = f.isFilled ? '[FILLED]' : '[DEFAULT]';
      lines.push(`- ${f.path}: ${JSON.stringify(f.value)} ${status}`);
    });
    lines.push('');
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

describe('Mapping Coverage (semantic pipeline)', () => {
  if (!process.env.OPENAI_API_KEY) {
    it.skip('skipped because OPENAI_API_KEY is not set', () => {});
    return;
  }

  it(
    'runs semantic pipeline on real PDFs and reports field coverage',
    async () => {
      const sources = await loadSources();
      expect(sources.length).toBeGreaterThan(0);

      const extracted: ExtractedFact[] = [];
      let prev: ExtractedFact[] = [];
      for (const src of sources) {
        const { facts } = await extractFactsFromSource(src, TEST_JOB_ID, prev);
        extracted.push(...facts);
        prev = [...prev, ...facts];
      }

      const importFacts = convertToImportFacts(extracted);
      const resolutionResult = await resolveImportFacts({
        job_id: TEST_JOB_ID,
        facts: importFacts,
      });

      const selectedFacts: ImportFact[] = importFacts.map((f) => ({
        ...f,
        is_selected: resolutionResult.selected_fact_ids.includes(f.id),
      }));

      const importData = applyResolutionsToImportData(
        resolutionResult.resolutions,
        selectedFacts
      );

      const report = buildCoverage(importData);
      printCoverage(report);

      // Critical expectations
      expect(importData.general.artist).not.toBe('');
      expect(importData.general.eventName).not.toBe('');
      expect(importData.general.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(importData.general.city.toLowerCase()).toContain('dubai');
      expect(importData.general.country.toLowerCase()).toContain('uae');

      // Flights should consolidate into two Turkish Airlines legs
      expect(importData.flights.length).toBe(2);
      const mappedNumbers = importData.flights.map((f) => f.flightNumber.toUpperCase());
      expect(mappedNumbers).toEqual(expect.arrayContaining(['TK67', 'TK1793']));
      const tk67 = importData.flights.find((f) => f.flightNumber.toUpperCase() === 'TK67');
      const tk1793 = importData.flights.find((f) => f.flightNumber.toUpperCase() === 'TK1793');
      expect(tk67?.airline || '').toMatch(/turkish/i);
      expect(tk1793?.airline || '').toMatch(/turkish/i);
      expect(tk67?.fromCity || '').toMatch(/denpasar|bali/i);
      expect(tk1793?.fromCity || tk1793?.toCity || '').not.toBe('');
      expect(tk67?.departureTime || '').not.toBe('');
      expect(tk1793?.departureTime || '').not.toBe('');

      // Hotel should carry room text (name or notes)
      expect(importData.hotels.length).toBeGreaterThan(0);
      expect(importData.hotels[0].name || importData.hotels[0].notes).not.toBe('');

      // Food / Catering summary should be present
      expect(importData.food.length).toBeGreaterThan(0);
      expect(importData.food[0].notes).not.toBe('');

      // Activities / transfers summary
      expect(importData.activities.length).toBeGreaterThan(0);
      expect(importData.activities[0].notes).not.toBe('');

      // Technical rider summary
      expect(importData.technical.equipment).not.toBe('');
    },
    180000
  );
});
