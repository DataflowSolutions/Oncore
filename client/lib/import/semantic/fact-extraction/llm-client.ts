/**
 * LLM Client for Fact Extraction
 */

import { logger } from '@/lib/logger';

export interface LLMResponse {
    content: string | null;
    error?: string;
}

// Track last LLM call time to rate-limit ourselves
let lastLLMCallTime = 0;
const MIN_DELAY_BETWEEN_CALLS_MS = 2000; // 2 seconds between calls to avoid rate limits

export async function callFactExtractionLLM(
    systemPrompt: string,
    userPrompt: string
): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return { content: '{"facts": []}', error: 'OPENAI_API_KEY not set' };
    }

    // Self-rate-limit: wait if we called LLM too recently
    const now = Date.now();
    const timeSinceLastCall = now - lastLLMCallTime;
    if (timeSinceLastCall < MIN_DELAY_BETWEEN_CALLS_MS && lastLLMCallTime > 0) {
        const waitTime = MIN_DELAY_BETWEEN_CALLS_MS - timeSinceLastCall;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastLLMCallTime = Date.now();

    const maxRetries = 3;
    let lastError = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Use gpt-4o-mini for extraction (cheaper, faster, sufficient for fact extraction)
            // Resolution uses the full gpt-4o model for more complex reasoning
            const model = process.env.OPENAI_EXTRACTION_MODEL || 'gpt-4o-mini';
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0, // Zero temperature for deterministic extraction
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const message = await response.text();
                
                // Handle rate limiting with exponential backoff + jitter
                if (response.status === 429) {
                    if (attempt < maxRetries) {
                        // Parse retry-after from response if available
                        let waitTime = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
                        const retryMatch = message.match(/try again in ([\d.]+)s/i);
                        if (retryMatch) {
                            waitTime = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500;
                        }
                        const jitter = Math.random() * 500;
                        waitTime += jitter;
                        
                        logger.warn(`Extraction LLM rate limited, waiting ${Math.round(waitTime)}ms`, {
                            attempt: attempt + 1,
                            maxRetries,
                        });
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                }
                
                lastError = `LLM HTTP ${response.status}: ${message}`;
                if (attempt === maxRetries) {
                    return { content: '{"facts": []}', error: lastError };
                }
                continue;
            }

            const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const content = json.choices?.[0]?.message?.content ?? '{"facts": []}';
            
            if (attempt > 0) {
                logger.info('Extraction LLM succeeded after retry', { attempts: attempt + 1 });
            }
            
            return { content };
        } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown LLM error';
            
            if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt + 1) * 1000 + Math.random() * 500;
                logger.warn(`Extraction LLM failed, retrying in ${Math.round(waitTime)}ms`, {
                    error: lastError,
                    attempt: attempt + 1,
                    maxRetries,
                });
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
        }
    }

    return { content: '{"facts": []}', error: lastError || 'LLM call failed after all retries' };
}
