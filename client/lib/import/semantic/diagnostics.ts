/**
 * Semantic Import Pipeline Diagnostics
 * 
 * Structured logging and debugging utilities for full observability
 * into how facts flow through the extraction → resolution → application pipeline.
 * 
 * Toggle with IMPORT_DEBUG=true
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ExtractedFact, ImportFact, FactResolution } from './types';
import type { ImportData } from '@/components/import/types';

// =============================================================================
// Configuration
// =============================================================================

const IMPORT_DEBUG = process.env.IMPORT_DEBUG === 'true';
const DEBUG_DIR = process.env.IMPORT_DEBUG_DIR || '/tmp/import-debug';

/**
 * Check if diagnostics are enabled
 */
export function isDiagnosticsEnabled(): boolean {
  return IMPORT_DEBUG;
}

// =============================================================================
// File System Helpers
// =============================================================================

/**
 * Ensure debug directory exists for a job
 */
function ensureDebugDir(jobId: string): string {
  if (!IMPORT_DEBUG) return '';
  
  const jobDir = path.join(DEBUG_DIR, jobId);
  
  try {
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    return jobDir;
  } catch (error) {
    console.warn('[IMPORT_DEBUG] Failed to create debug directory', { jobId, error });
    return '';
  }
}

/**
 * Write JSON dump to file
 */
function writeDump(jobId: string, filename: string, data: any): void {
  if (!IMPORT_DEBUG) return;
  
  const jobDir = ensureDebugDir(jobId);
  if (!jobDir) return;
  
  const filePath = path.join(jobDir, filename);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[IMPORT_DEBUG] Debug dump written', { jobId, file: filename, path: filePath });
  } catch (error) {
    console.warn('[IMPORT_DEBUG] Failed to write debug dump', { jobId, filename, error });
  }
}

// =============================================================================
// Stage 0: Chunk Visibility
// =============================================================================

export interface ChunkDebugInfo {
  stage: 'chunk';
  source_id: string;
  source_file_name: string;
  chunk_index: number;
  word_count: number;
  char_count: number;
  preview: string;
  timestamp: string;
}

/**
 * Log chunk processing details
 */
export function logChunk(
  sourceId: string,
  sourceFileName: string,
  chunkIndex: number,
  text: string
): void {
  if (!IMPORT_DEBUG) return;
  
  const words = text.split(/\s+/).filter(Boolean);
  const preview = text.substring(0, 300).replace(/\n/g, ' ').trim();
  
  const info: ChunkDebugInfo = {
    stage: 'chunk',
    source_id: sourceId,
    source_file_name: sourceFileName,
    chunk_index: chunkIndex,
    word_count: words.length,
    char_count: text.length,
    preview: preview + (text.length > 300 ? '...' : ''),
    timestamp: new Date().toISOString(),
  };
  
  console.log('[IMPORT_DEBUG] Chunk processing', info);
}

// =============================================================================
// Stage 1: Fact Extraction (Raw vs Normalized)
// =============================================================================

export interface FactDebugInfo {
  fact_type: string;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_time?: string;
  value_datetime?: string;
  raw_snippet: string;
  confidence: number;
  status: string;
  speaker_role: string;
  extraction_reason?: string;
  fact_domain?: string;
}

/**
 * Log raw LLM response before normalization
 */
export function logRawLLMResponse(
  jobId: string,
  sourceId: string,
  chunkIndex: number,
  rawResponse: string
): void {
  if (!IMPORT_DEBUG) return;
  
  console.log('[IMPORT_DEBUG] Raw LLM response', {
    stage: 'extraction_raw',
    job_id: jobId,
    source_id: sourceId,
    chunk_index: chunkIndex,
    response_length: rawResponse.length,
    timestamp: new Date().toISOString(),
  });
  
  // Dump to file
  const filename = `stage1-raw-${sourceId}-chunk${chunkIndex}.json`;
  writeDump(jobId, filename, {
    source_id: sourceId,
    chunk_index: chunkIndex,
    raw_response: rawResponse,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Dump extracted facts with analysis
 */
export function dumpFacts(
  stage: string,
  jobId: string,
  facts: ExtractedFact[]
): void {
  if (!IMPORT_DEBUG) return;
  
  const factsByType = new Map<string, ExtractedFact[]>();
  const otherFacts: Array<ExtractedFact & { analysis?: string }> = [];
  
  for (const fact of facts) {
    if (!factsByType.has(fact.fact_type)) {
      factsByType.set(fact.fact_type, []);
    }
    factsByType.get(fact.fact_type)!.push(fact);
    
    // Analyze 'other' facts
    if (fact.fact_type === 'other') {
      const analysis = analyzeWhyOther(fact);
      otherFacts.push({ ...fact, analysis });
    }
  }
  
  const summary = {
    stage,
    job_id: jobId,
    total_facts: facts.length,
    by_type: Object.fromEntries(
      Array.from(factsByType.entries()).map(([type, typeFacts]) => [
        type,
        {
          count: typeFacts.length,
          samples: typeFacts.slice(0, 3).map(f => ({
            value: f.value_text || f.value_number || f.value_date,
            snippet: f.raw_snippet?.substring(0, 100),
          })),
        },
      ])
    ),
    other_facts_analysis: otherFacts.length > 0 ? {
      count: otherFacts.length,
      reasons: otherFacts.map(f => ({
        value_text: f.value_text,
        raw_snippet: f.raw_snippet?.substring(0, 150),
        why_other: f.analysis,
      })),
    } : null,
    timestamp: new Date().toISOString(),
  };
  
  console.log('Facts dump', {
    stage,
    job_id: jobId,
    total: facts.length,
    other_count: otherFacts.length,
  });
  
  // Write detailed dump
  const filename = `${stage}.json`;
  writeDump(jobId, filename, {
    summary,
    all_facts: facts.map(f => ({
      fact_type: f.fact_type,
      value_text: f.value_text,
      value_number: f.value_number,
      value_date: f.value_date,
      value_time: f.value_time,
      value_datetime: f.value_datetime,
      raw_snippet: f.raw_snippet,
      confidence: f.confidence,
      status: f.status,
      speaker_role: f.speaker_role,
      extraction_reason: f.extraction_reason,
      fact_domain: f.fact_domain,
      source_id: f.source_id,
      chunk_index: f.chunk_index,
    })),
  });
}

/**
 * Analyze why a fact ended up as 'other'
 */
function analyzeWhyOther(fact: ExtractedFact): string {
  const text = fact.value_text || '';
  const snippet = fact.raw_snippet || '';
  
  const reasons: string[] = [];
  
  // Check for common patterns that should have been typed
  if (/^[A-Z]{2}\d{2,4}$/.test(text)) {
    reasons.push('looks_like_flight_number');
  }
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    reasons.push('looks_like_time');
  }
  if (/^[A-Z]{3}$/.test(text)) {
    reasons.push('looks_like_iata_code');
  }
  if (/^\d{8,}$/.test(text)) {
    reasons.push('looks_like_ticket_number');
  }
  if (/economy|business|first class/i.test(text)) {
    reasons.push('looks_like_travel_class');
  }
  if (/@/.test(text)) {
    reasons.push('looks_like_email');
  }
  if (/^\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4}$/.test(text)) {
    reasons.push('looks_like_date');
  }
  
  if (reasons.length === 0) {
    reasons.push('no_obvious_pattern');
  }
  
  return reasons.join(', ');
}

// =============================================================================
// Post-Processing Audit Trail
// =============================================================================

export interface PostProcessChange {
  action: 'upgrade' | 'skip' | 'derive';
  rule: string;
  from_type: string;
  to_type: string;
  value_text?: string;
  raw_snippet: string;
  reason?: string;
}

const postProcessChanges: PostProcessChange[] = [];

/**
 * Log a fact type upgrade during post-processing
 */
export function logPostProcessUpgrade(
  rule: string,
  fromType: string,
  toType: string,
  valueText: string | undefined,
  snippet: string
): void {
  if (!IMPORT_DEBUG) return;
  
  const change: PostProcessChange = {
    action: 'upgrade',
    rule,
    from_type: fromType,
    to_type: toType,
    value_text: valueText,
    raw_snippet: snippet?.substring(0, 150) || '',
  };
  
  postProcessChanges.push(change);
  
  console.log('Post-process upgrade', {
    stage: 'post_process',
    action: 'upgrade',
    rule,
    from: fromType,
    to: toType,
    snippet: snippet?.substring(0, 100),
  });
}

/**
 * Log a fact that stayed as 'other'
 */
export function logPostProcessSkip(
  fact: ExtractedFact,
  reason: string
): void {
  if (!IMPORT_DEBUG) return;
  
  const change: PostProcessChange = {
    action: 'skip',
    rule: 'no-rule-matched',
    from_type: 'other',
    to_type: 'other',
    value_text: fact.value_text,
    raw_snippet: fact.raw_snippet?.substring(0, 150) || '',
    reason,
  };
  
  postProcessChanges.push(change);
}

/**
 * Dump post-processing changes
 */
export function dumpPostProcessing(jobId: string): void {
  if (!IMPORT_DEBUG || postProcessChanges.length === 0) return;
  
  const summary = {
    total_changes: postProcessChanges.length,
    upgrades: postProcessChanges.filter(c => c.action === 'upgrade').length,
    skips: postProcessChanges.filter(c => c.action === 'skip').length,
    derives: postProcessChanges.filter(c => c.action === 'derive').length,
    by_rule: {} as Record<string, number>,
  };
  
  for (const change of postProcessChanges) {
    summary.by_rule[change.rule] = (summary.by_rule[change.rule] || 0) + 1;
  }
  
  console.log('Post-processing summary', {
    stage: 'post_process',
    job_id: jobId,
    ...summary,
  });
  
  writeDump(jobId, 'post-process.json', {
    summary,
    changes: postProcessChanges,
    timestamp: new Date().toISOString(),
  });
  
  // Clear for next run
  postProcessChanges.length = 0;
}

// =============================================================================
// Stage 2: Resolution Debug
// =============================================================================

export interface ResolutionDebugInfo {
  fact_type: string;
  fact_domain?: string;
  state: string;
  selected_fact_id: string | null;
  reason: string;
  rule_path: 'llm' | 'rules' | 'validation';
  selected_value?: any;
  issues?: string[];
}

/**
 * Log resolution decision
 */
export function logResolution(
  resolution: FactResolution,
  selectedFact: ImportFact | null,
  rulePath: 'llm' | 'rules' | 'validation'
): void {
  if (!IMPORT_DEBUG) return;
  
  const issues: string[] = [];
  
  // Detect anomalies
  if (resolution.state === 'resolved' && !resolution.final_value_text && !resolution.final_value_number && !resolution.final_value_date) {
    issues.push('resolved_but_no_value');
  }
  
  if (resolution.state === 'informational' && !resolution.selected_fact_id && !resolution.final_value_text) {
    issues.push('informational_with_no_fact_or_value');
  }
  
  if (resolution.selected_fact_id && !selectedFact) {
    issues.push('selected_fact_not_found');
  }
  
  const info: ResolutionDebugInfo = {
    fact_type: resolution.fact_type,
    fact_domain: resolution.fact_domain,
    state: resolution.state,
    selected_fact_id: resolution.selected_fact_id,
    reason: resolution.reason,
    rule_path: rulePath,
    selected_value: resolution.final_value_text || resolution.final_value_number || resolution.final_value_date,
    issues: issues.length > 0 ? issues : undefined,
  };
  
  if (issues.length > 0) {
    console.warn('Resolution anomaly detected', {
      stage: 'resolution',
      ...info,
    });
  } else {
    console.log('Resolution decision', {
      stage: 'resolution',
      ...info,
    });
  }
}

/**
 * Dump all resolutions
 */
export function dumpResolutions(
  jobId: string,
  resolutions: FactResolution[],
  allFacts: ImportFact[]
): void {
  if (!IMPORT_DEBUG) return;
  
  const factsById = new Map(allFacts.map(f => [f.id, f]));
  
  const summary = {
    total: resolutions.length,
    by_state: {} as Record<string, number>,
    anomalies: [] as any[],
  };
  
  for (const res of resolutions) {
    summary.by_state[res.state] = (summary.by_state[res.state] || 0) + 1;
    
    // Check for anomalies
    if (res.state === 'resolved' && !res.final_value_text && !res.final_value_number && !res.final_value_date) {
      summary.anomalies.push({
        type: 'resolved_but_no_value',
        fact_type: res.fact_type,
        reason: res.reason,
      });
    }
    
    if (res.selected_fact_id && !factsById.has(res.selected_fact_id)) {
      summary.anomalies.push({
        type: 'selected_fact_missing',
        fact_type: res.fact_type,
        selected_fact_id: res.selected_fact_id,
      });
    }
  }
  
  console.log('Resolutions summary', {
    stage: 'resolution',
    job_id: jobId,
    ...summary,
  });
  
  writeDump(jobId, 'stage2-resolution.json', {
    summary,
    resolutions: resolutions.map(r => ({
      fact_type: r.fact_type,
      fact_domain: r.fact_domain,
      state: r.state,
      selected_fact_id: r.selected_fact_id,
      reason: r.reason,
      final_value_text: r.final_value_text,
      final_value_number: r.final_value_number,
      final_value_date: r.final_value_date,
      confidence: r.confidence,
    })),
    timestamp: new Date().toISOString(),
  });
}

// =============================================================================
// Stage 3: Application Analyzer
// =============================================================================

export interface ApplicationDebugInfo {
  fact_type: string;
  target_path: string;
  action: 'applied' | 'skipped';
  value?: any;
  reason?: string;
}

const applicationActions: ApplicationDebugInfo[] = [];

/**
 * Log fact application to ImportData
 */
export function logFactApplication(
  factType: string,
  targetPath: string,
  action: 'applied' | 'skipped',
  value?: any,
  reason?: string
): void {
  if (!IMPORT_DEBUG) return;
  
  const info: ApplicationDebugInfo = {
    fact_type: factType,
    target_path: targetPath,
    action,
    value,
    reason,
  };
  
  applicationActions.push(info);
  
  if (action === 'skipped') {
    console.log('Fact application skipped', {
      stage: 'application',
      ...info,
    });
  }
}

/**
 * Dump application results and final ImportData
 */
export function dumpApplication(
  jobId: string,
  importData: ImportData
): void {
  if (!IMPORT_DEBUG) return;
  
  const summary = {
    total_actions: applicationActions.length,
    applied: applicationActions.filter(a => a.action === 'applied').length,
    skipped: applicationActions.filter(a => a.action === 'skipped').length,
    skip_reasons: {} as Record<string, number>,
  };
  
  for (const action of applicationActions) {
    if (action.action === 'skipped' && action.reason) {
      summary.skip_reasons[action.reason] = (summary.skip_reasons[action.reason] || 0) + 1;
    }
  }
  
  console.log('Application summary', {
    stage: 'application',
    job_id: jobId,
    ...summary,
  });
  
  writeDump(jobId, 'stage3-application.json', {
    summary,
    actions: applicationActions,
    timestamp: new Date().toISOString(),
  });
  
  writeDump(jobId, 'stage3-importdata.json', {
    import_data: importData,
    timestamp: new Date().toISOString(),
  });
  
  // Clear for next run
  applicationActions.length = 0;
}

// =============================================================================
// Missing Field Explainer
// =============================================================================

export interface MissingFieldExplanation {
  field_path: string;
  related_facts: Array<{
    fact_type: string;
    value: any;
    snippet: string;
  }>;
  reasons: string[];
}

/**
 * Analyze why a field is missing
 */
export function explainMissingField(
  fieldPath: string,
  facts: ExtractedFact[],
  resolutions: FactResolution[]
): MissingFieldExplanation {
  const relatedFacts: Array<{ fact_type: string; value: any; snippet: string }> = [];
  const reasons: string[] = [];
  
  // Find facts that might relate to this field
  const fieldName = fieldPath.split('.').pop() || '';
  const section = fieldPath.split('.')[0] || '';
  
  for (const fact of facts) {
    const snippet = fact.raw_snippet?.toLowerCase() || '';
    const value = fact.value_text || fact.value_number || fact.value_date;
    
    // Check if snippet or value contains field-related keywords
    if (snippet.includes(fieldName.toLowerCase()) || 
        (typeof value === 'string' && value.toLowerCase().includes(fieldName.toLowerCase()))) {
      relatedFacts.push({
        fact_type: fact.fact_type,
        value,
        snippet: fact.raw_snippet?.substring(0, 150) || '',
      });
    }
  }
  
  // Check if there was a resolution for this field
  const expectedFactType = `${section}_${fieldName}` as any;
  const resolution = resolutions.find(r => r.fact_type === expectedFactType);
  
  if (!resolution) {
    reasons.push('no_facts_extracted_for_this_type');
  } else if (resolution.state === 'missing') {
    reasons.push('resolution_state_missing');
  } else if (resolution.state === 'unagreed') {
    reasons.push('resolution_state_unagreed_not_applied');
  } else if (resolution.state === 'informational' && !resolution.selected_fact_id && !resolution.final_value_text) {
    reasons.push('informational_but_no_value');
  } else if (resolution.state === 'resolved' && !resolution.final_value_text && !resolution.final_value_number && !resolution.final_value_date) {
    reasons.push('resolved_but_value_empty');
  }
  
  // Check for misclassified facts
  if (relatedFacts.length > 0 && relatedFacts.every(f => f.fact_type === 'other')) {
    reasons.push('related_facts_classified_as_other');
  }
  
  if (relatedFacts.length === 0) {
    reasons.push('no_related_text_found_in_source');
  }
  
  return {
    field_path: fieldPath,
    related_facts: relatedFacts,
    reasons,
  };
}

/**
 * Print missing field analysis to console
 */
export function printMissingFieldAnalysis(
  fieldPath: string,
  explanation: MissingFieldExplanation
): void {
  if (!IMPORT_DEBUG) return;
  
  console.log(`\n❌ ${fieldPath}`);
  
  if (explanation.related_facts.length > 0) {
    console.log('  Related facts:');
    for (const fact of explanation.related_facts) {
      console.log(`    • ${fact.fact_type}: "${fact.value}"`);
      console.log(`      snippet: "${fact.snippet}"`);
    }
  } else {
    console.log('  No related facts found');
  }
  
  if (explanation.reasons.length > 0) {
    console.log('  Reasons:');
    for (const reason of explanation.reasons) {
      console.log(`    - ${reason}`);
    }
  }
}
