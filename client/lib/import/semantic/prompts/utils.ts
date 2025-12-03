/**
 * Fact Type Documentation Generator
 * 
 * Dynamically generates fact type lists from the type mapping to keep prompts in sync with code.
 */

import { FACT_TYPE_TO_IMPORT_FIELD } from '../types';

/**
 * Dynamically generate fact type list from the type mapping.
 * This keeps the prompt in sync with the code-level fact mapping.
 */
export function generateFactTypeList(): string {
    const typeCategories = new Map<string, string[]>();

    for (const factType of Object.keys(FACT_TYPE_TO_IMPORT_FIELD)) {
        // Skip 'other' - it's a catch-all
        if (factType === 'other') continue;

        // Extract category (prefix before underscore)
        const category = factType.split('_')[0];

        if (!typeCategories.has(category)) {
            typeCategories.set(category, []);
        }
        typeCategories.get(category)!.push(factType);
    }

    // Format as bullet list grouped by category
    const lines: string[] = [];

    for (const [category, types] of Array.from(typeCategories.entries()).sort()) {
        const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
        lines.push(`${categoryTitle}:`);

        for (const type of types.sort()) {
            // Convert snake_case to human-readable
            const label = type.split('_').slice(1).join(' ');
            lines.push(`  - ${type} (${label})`);
        }
        lines.push('');
    }

    return lines.join('\n');
}
