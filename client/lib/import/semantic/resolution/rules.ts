/**
 * Hard Server-Side Rules for Resolution
 * 
 * These rules cannot be overridden by the LLM.
 */

import type { ImportFact, FactResolution, ImportSourceScope } from '../types';
import {
    isSelectableStatus,
    isFinalizableStatus,
    NEVER_SELECTABLE_STATUSES,
} from '../types';

// Source scope priority for provenance weighting (higher = more trusted)
export const SOURCE_SCOPE_PRIORITY: Record<ImportSourceScope, number> = {
    contract_main: 100,
    itinerary: 90,
    confirmation: 85,
    general_info: 50,
    rider_example: 20,
    unknown: 10,
};

export function getSourceScopePriority(scope?: ImportSourceScope): number {
    if (!scope) return SOURCE_SCOPE_PRIORITY.unknown;
    return SOURCE_SCOPE_PRIORITY[scope] ?? SOURCE_SCOPE_PRIORITY.unknown;
}

/**
 * Normalize common date formats to ISO YYYY-MM-DD.
 */
export function normalizeEventDateToISO(input?: string | null): string | null {
    if (!input) return null;
    const raw = input.trim();
    if (!raw) return null;

    // Already ISO-like
    const isoMatch = raw.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        const mm = m.padStart(2, '0');
        const dd = d.padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }

    // DD Mon YYYY or DD Month YYYY
    const monthNames: Record<string, string> = {
        jan: '01', january: '01',
        feb: '02', february: '02',
        mar: '03', march: '03',
        apr: '04', april: '04',
        may: '05',
        jun: '06', june: '06',
        jul: '07', july: '07',
        aug: '08', august: '08',
        sep: '09', sept: '09', september: '09',
        oct: '10', october: '10',
        nov: '11', november: '11',
        dec: '12', december: '12',
    };

    const ddMonY = raw.match(/^(\d{1,2})[\s\.\-\/](\w+)[\s\.\-\/](\d{4})$/);
    if (ddMonY) {
        const [, d, mon, y] = ddMonY;
        const mm = monthNames[mon.toLowerCase()];
        if (mm) {
            const dd = d.padStart(2, '0');
            return `${y}-${mm}-${dd}`;
        }
    }

    // Month DD, YYYY
    const monDdY = raw.match(/^(\w+)[\s]+(\d{1,2}),[\s]*(\d{4})$/);
    if (monDdY) {
        const [, mon, d, y] = monDdY;
        const mm = monthNames[mon.toLowerCase()];
        if (mm) {
            const dd = d.padStart(2, '0');
            return `${y}-${mm}-${dd}`;
        }
    }

    // DD.MM.YYYY
    const dotted = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotted) {
        const [, d, m, y] = dotted;
        const mm = m.padStart(2, '0');
        const dd = d.padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }

    return null;
}

/**
 * Server-side assertion: A fact can be selected.
 * Throws if the fact violates hard rules.
 */
export function assertFactIsSelectable(fact: ImportFact, context: string): void {
    // HARD RULE 1: Rejected/withdrawn/question facts can NEVER be selected
    if (!isSelectableStatus(fact.status)) {
        throw new Error(
            `HARD RULE VIOLATION [${context}]: Cannot select fact ${fact.id} with status '${fact.status}'. ` +
            `Statuses ${NEVER_SELECTABLE_STATUSES.join(', ')} can NEVER be selected.`
        );
    }
}

/**
 * Server-side assertion: Resolution state is valid for the selection.
 */
export function assertValidResolutionState(
    resolution: FactResolution,
    selectedFact: ImportFact | null,
    context: string
): void {
    // If state is 'resolved', we MUST have a selected fact
    if (resolution.state === 'resolved' && !selectedFact) {
        throw new Error(
            `HARD RULE VIOLATION [${context}]: Resolution state is 'resolved' but no fact was selected.`
        );
    }

    // If state is 'resolved', the selected fact MUST be accepted/final
    if (resolution.state === 'resolved' && selectedFact && !isFinalizableStatus(selectedFact.status)) {
        throw new Error(
            `HARD RULE VIOLATION [${context}]: Resolution state is 'resolved' but selected fact ` +
            `has status '${selectedFact.status}'. Only 'accepted' or 'final' can be resolved.`
        );
    }

    // If state is 'unagreed' or 'missing', we must NOT have a selected fact
    if ((resolution.state === 'unagreed' || resolution.state === 'missing') && selectedFact) {
        throw new Error(
            `HARD RULE VIOLATION [${context}]: Resolution state is '${resolution.state}' ` +
            `but a fact was selected. Unresolved states must not write to canonical tables.`
        );
    }
}
