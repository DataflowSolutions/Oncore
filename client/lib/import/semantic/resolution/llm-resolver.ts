/**
 * LLM-based Semantic Resolution
 * 
 * Uses OpenAI GPT to perform semantic reasoning over facts and determine
 * canonical resolutions. Falls back to rule-based resolution on failure.
 */

import { logger } from '@/lib/logger';
import type {
    ImportFact,
    FactResolution,
    ImportFactType,
    ReasoningStep,
} from '../types';
import { RESOLUTION_SYSTEM_PROMPT, RESOLUTION_USER_PROMPT } from '../prompts/resolution-prompts';

// =============================================================================
// LLM Client
// =============================================================================

interface LLMResponse {
    content: string | null;
    error?: string;
}

async function callResolutionLLM(
    systemPrompt: string,
    userPrompt: string
): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return { content: null, error: 'OPENAI_API_KEY not set' };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const message = await response.text();
            return { content: null, error: `LLM HTTP error: ${response.status} ${message}` };
        }

        const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = json.choices?.[0]?.message?.content ?? null;
        return { content };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown LLM error';
        return { content: null, error: message };
    }
}

// =============================================================================
// LLM Response Parsing
// =============================================================================

interface RawResolutionFromLLM {
    fact_type?: string;
    fact_domain?: string | null;
    selected_fact_id?: string | null;
    state?: string;
    reason?: string;
    final_value_text?: string;
    final_value_number?: number;
    final_value_date?: string;
    reasoning_trace?: ReasoningStep[];
}

function parseLLMResolutions(
    content: string,
    facts: ImportFact[]
): FactResolution[] {
    try {
        const parsed = JSON.parse(content);
        const rawResolutions: RawResolutionFromLLM[] = parsed.resolutions || [];

        // Build a set of valid fact IDs for validation
        const validFactIds = new Set(facts.map(f => f.id));

        return rawResolutions.map((raw): FactResolution => {
            // Validate selected_fact_id exists
            const selectedId = raw.selected_fact_id && validFactIds.has(raw.selected_fact_id)
                ? raw.selected_fact_id
                : null;

            const state = (raw.state as any) || 'missing';

            return {
                fact_type: raw.fact_type as ImportFactType || 'other',
                fact_domain: raw.fact_domain || undefined,
                selected_fact_id: selectedId,
                state,
                reason: raw.reason || 'No reason provided',
                final_value_text: raw.final_value_text,
                final_value_number: raw.final_value_number,
                final_value_date: raw.final_value_date,
                reasoning_trace: raw.reasoning_trace,
            };
        });
    } catch (error) {
        logger.error('Failed to parse LLM resolution response', { error, content });
        return [];
    }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve facts using LLM semantic reasoning
 */
export async function resolveFactsWithLLM(
    facts: ImportFact[],
    jobId: string
): Promise<{ resolutions: FactResolution[]; error?: string }> {
    // Prepare facts summary for LLM
    const factsSummary = facts.map(f => ({
        id: f.id,
        message_index: f.message_index,
        fact_type: f.fact_type,
        fact_domain: f.fact_domain,
        value_text: f.value_text,
        value_number: f.value_number,
        status: f.status,
        speaker_role: f.speaker_role,
        confidence: f.confidence,
        raw_snippet: f.raw_snippet?.substring(0, 200),
    }));

    const userPrompt = RESOLUTION_USER_PROMPT.replace(
        '{facts_json}',
        JSON.stringify(factsSummary, null, 2)
    );

    // Call LLM
    const llmResponse = await callResolutionLLM(RESOLUTION_SYSTEM_PROMPT, userPrompt);

    if (llmResponse.error || !llmResponse.content) {
        const error = llmResponse.error || 'empty response';
        logger.warn('LLM resolution failed', { job_id: jobId, error });
        return { resolutions: [], error };
    }

    // Parse response
    const resolutions = parseLLMResolutions(llmResponse.content, facts);
    
    logger.info('LLM resolution complete', {
        job_id: jobId,
        resolutions_count: resolutions.length,
    });

    return { resolutions };
}
