/**
 * Fact Extraction User Prompts
 */

export function getFactExtractionUserPrompt(variables: {
    source_file_name: string;
    chunk_index: number;
    chunk_text: string;
}): string {
    return `You will receive a chunk of text from a document. Extract explicit factual claims and output them as JSON "facts".

Document name: "${variables.source_file_name}"
Chunk index: ${variables.chunk_index}

TEXT TO ANALYZE:
---
${variables.chunk_text}
---

Return JSON with extracted facts following the schema defined in the system prompt.`;
}
