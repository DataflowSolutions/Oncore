/**
 * Fact Extraction User Prompts
 */

export function getFactExtractionUserPrompt(variables: {
    source_file_name: string;
    chunk_index: number;
    chunk_text: string;
    current_section?: string;
}): string {
    const sectionInstruction = variables.current_section
        ? `\n\n⚠️ SECTION FILTER: Extract ONLY facts belonging to the "${variables.current_section}" section. Ignore facts from other domains.`
        : '';

    return `You will receive a chunk of text from a document. Extract explicit factual claims and output them as JSON "facts".

Document name: "${variables.source_file_name}"
Chunk index: ${variables.chunk_index}${sectionInstruction}

TEXT TO ANALYZE:
---
${variables.chunk_text}
---

Return JSON with extracted facts following the schema defined in the system prompt.`;
}
