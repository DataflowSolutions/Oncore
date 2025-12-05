/**
 * Stage 1: Candidate Fact Extraction
 * 
 * This module extracts candidate facts from source text chunks.
 * It does NOT make final decisions - it extracts ALL potential facts
 * with their negotiation status and context.
 */

import { logger } from '@/lib/logger';
import { logRawLLMResponse } from '../diagnostics';
import { PROMPTS } from '../prompts';
import type { ExtractedFact, FactExtractionRequest, FactExtractionResult } from '../types';

import { callFactExtractionLLM } from './llm-client';
import { parseLLMFacts } from './validation';
import { inferSourceScopeFromFilename } from './normalization';
import { upgradeFactStatusesFromFilename } from './upgrades';

/**
 * Extract candidate facts from a text chunk.
 * This is Stage 1 of the semantic import pipeline.
 */
export async function extractFactsFromChunk(
    request: FactExtractionRequest
): Promise<FactExtractionResult> {
    logger.info('Fact extraction starting', {
        job_id: request.job_id,
        source_id: request.source_id,
        chunk_index: request.chunk_index,
        text_length: request.chunk_text.length,
        text_preview: request.chunk_text.slice(0, 100).replace(/\n/g, ' '),
    });

    // Generate prompts from centralized prompt module
    // Default to 'general' if no section specified (backward compatibility)
    const currentSection = request.current_section || 'general';
    const systemPrompt = PROMPTS.factExtraction.system(currentSection);
    const userPrompt = PROMPTS.factExtraction.user({
        source_file_name: request.source_file_name,
        chunk_index: request.chunk_index,
        chunk_text: request.chunk_text,
        current_section: request.current_section,
    });

    // Call LLM
    const llmResponse = await callFactExtractionLLM(systemPrompt, userPrompt);

    const warnings: string[] = [];

    if (llmResponse.error) {
        warnings.push(`LLM error: ${llmResponse.error}`);
    }

    // Diagnostic: Log raw LLM response before parsing
    if (llmResponse.content) {
        logRawLLMResponse(
            request.job_id,
            request.source_id,
            request.chunk_index,
            llmResponse.content
        );
    }

    // Parse facts
    let facts = parseLLMFacts(llmResponse.content || '{"facts": []}', request);

    // Tag facts with their section
    facts = facts.map(fact => ({
        ...fact,
        section: request.current_section,
    }));

    // Apply filename-based source_scope fallback when model did not set one
    const inferredScope = inferSourceScopeFromFilename(request.source_file_name);
    facts = facts.map(fact => ({
        ...fact,
        source_scope: fact.source_scope && fact.source_scope !== 'unknown'
            ? fact.source_scope
            : inferredScope,
    }));

    // Safety net: upgrade fact statuses based on filename patterns
    // This catches cases where the LLM misclassifies confirmation documents
    facts = upgradeFactStatusesFromFilename(facts, request.source_file_name);

    logger.info('Fact extraction complete', {
        job_id: request.job_id,
        source_id: request.source_id,
        chunk_index: request.chunk_index,
        facts_extracted: facts.length,
        warnings: warnings.length,
    });

    return { facts, warnings };
}

/**
 * Extract facts from all chunks of a source.
 * Maintains context across chunks for better counter-offer detection.
 */
export async function extractFactsFromSource(
    job_id: string,
    source_id: string,
    source_file_name: string,
    chunks: { index: number; text: string }[]
): Promise<FactExtractionResult> {
    const allFacts: ExtractedFact[] = [];
    const allWarnings: string[] = [];
    let previousFacts: ExtractedFact[] = [];

    for (const chunk of chunks) {
        const result = await extractFactsFromChunk({
            job_id,
            source_id,
            source_file_name,
            chunk_index: chunk.index,
            chunk_text: chunk.text,
            previous_facts: previousFacts,
            message_index: chunk.index, // Use chunk index as message index for now
        });

        allFacts.push(...result.facts);
        if (result.warnings) {
            allWarnings.push(...result.warnings);
        }

        // Keep last 20 facts for context
        previousFacts = [...previousFacts, ...result.facts].slice(-20);
    }

    return {
        facts: allFacts,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
    };
}
