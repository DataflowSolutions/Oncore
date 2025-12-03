/**
 * LLM Client for Fact Extraction
 */

export interface LLMResponse {
    content: string | null;
    error?: string;
}

export async function callFactExtractionLLM(
    systemPrompt: string,
    userPrompt: string
): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return { content: '{"facts": []}', error: 'OPENAI_API_KEY not set' };
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
                temperature: 0, // Zero temperature for deterministic extraction
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const message = await response.text();
            return { content: '{"facts": []}', error: `LLM HTTP error: ${response.status} ${message}` };
        }

        const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = json.choices?.[0]?.message?.content ?? '{"facts": []}';
        return { content };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown LLM error';
        return { content: '{"facts": []}', error: message };
    }
}
