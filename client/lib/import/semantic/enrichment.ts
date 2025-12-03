/**
 * Stage 3.5: Data Enrichment
 * 
 * Derives additional fields using deterministic logic (NO AI).
 * This fills gaps that extraction/resolution cannot handle, such as:
 * - Deal type inference
 * - Payment terms structuring
 * - City extraction from venue names
 * 
 * NOTE: Flight enrichment moved to flight-enrichment.ts (Stage F3)
 * 
 * Pure logic layer - no LLM calls, no database queries.
 */

import type { ImportData } from '@/components/import/types';

// =============================================================================
// Deal Inference (Rule Engine)
// =============================================================================

/**
 * Infer deal type from payment terms or fee structure
 */
function inferDealType(fee: string, paymentTerms: string, notes: string): string | undefined {
  const combined = `${fee} ${paymentTerms} ${notes}`.toLowerCase();
  
  // Guarantee pattern
  if (combined.match(/guarantee|guaranteed|minimum\s+guarantee/)) {
    return 'Guarantee';
  }
  
  // Flat fee pattern
  if (combined.match(/flat\s+fee|fixed\s+fee|lump\s+sum/)) {
    return 'Flat fee';
  }
  
  // Percentage/door deal pattern
  if (combined.match(/percentage|%|door\s+deal|revenue\s+share|split/)) {
    return 'Percentage';
  }
  
  // Versus deal (greater of guarantee or percentage)
  if (combined.match(/versus|vs\.?|whichever\s+is\s+(?:greater|higher)|greater\s+of/)) {
    return 'Versus deal';
  }
  
  return undefined;
}

/**
 * Parse payment terms for structured information
 */
function enrichPaymentTerms(paymentTerms: string): string {
  if (!paymentTerms) return '';
  
  // Already structured - don't modify
  if (paymentTerms.length < 200) return paymentTerms;
  
  // Extract key phrases
  const terms: string[] = [];
  
  if (/(\d+)%\s*(?:deposit|advance|upfront)/i.test(paymentTerms)) {
    const match = paymentTerms.match(/(\d+)%\s*(?:deposit|advance|upfront)/i);
    if (match) terms.push(`${match[1]}% deposit`);
  }
  
  if (/(\d+)%\s*(?:on|upon|at)\s*(?:completion|settlement|final)/i.test(paymentTerms)) {
    const match = paymentTerms.match(/(\d+)%\s*(?:on|upon|at)\s*(?:completion|settlement|final)/i);
    if (match) terms.push(`${match[1]}% on completion`);
  }
  
  if (terms.length > 0) {
    return terms.join(', ');
  }
  
  return paymentTerms;
}

// =============================================================================
// Main Enrichment Function
// =============================================================================

/**
 * Enrich ImportData with derived fields using deterministic logic
 * 
 * NOTE: Flight enrichment is now handled in Stage F3 (flight-enrichment.ts)
 *       This function only handles deal and general info enrichment.
 */
export function enrichImportData(data: ImportData): ImportData {
  const enriched = { ...data };
  
  // ===================================================================
  // DEAL ENRICHMENT
  // ===================================================================
  
  if (enriched.deal) {
    // Infer deal type if missing
    if (!enriched.deal.dealType) {
      const inferred = inferDealType(
        enriched.deal.fee || '',
        enriched.deal.paymentTerms || '',
        enriched.deal.notes || ''
      );
      if (inferred) {
        enriched.deal.dealType = inferred;
      }
    }
    
    // Structure payment terms if verbose
    if (enriched.deal.paymentTerms) {
      enriched.deal.paymentTerms = enrichPaymentTerms(enriched.deal.paymentTerms);
    }
  }
  
  // ===================================================================
  // GENERAL INFO ENRICHMENT
  // ===================================================================
  
  // Extract city from venue name if missing (e.g., "Sohho Dubai" → Dubai)
  // Note: Simple last-word extraction, not using IATA lookup since that's flight-specific
  if (!enriched.general?.city && enriched.general?.venue) {
    const venueWords = enriched.general.venue.split(/\s+/);
    const lastWord = venueWords[venueWords.length - 1];
    
    // Common city names that might appear in venue names
    const commonCities = [
      'Dubai', 'London', 'Paris', 'New York', 'Los Angeles', 'Miami',
      'Berlin', 'Amsterdam', 'Barcelona', 'Madrid', 'Rome', 'Milan',
      'Tokyo', 'Singapore', 'Hong Kong', 'Bangkok', 'Mumbai', 'Delhi',
      'Sydney', 'Melbourne', 'Toronto', 'Vancouver', 'Montreal',
      'Istanbul', 'Cairo', 'Johannesburg', 'Lagos', 'Nairobi',
    ];
    
    if (commonCities.includes(lastWord)) {
      enriched.general = {
        ...enriched.general,
        city: lastWord,
      };
    }
  }
  
  return enriched;
}

/**
 * Get enrichment statistics for logging
 * 
 * NOTE: Flight stats removed - flight enrichment now tracked separately in Stage F3
 */
export function getEnrichmentStats(
  before: ImportData,
  after: ImportData
): {
  dealFieldsAdded: number;
  generalFieldsAdded: number;
  totalFieldsAdded: number;
} {
  let dealFieldsAdded = 0;
  let generalFieldsAdded = 0;
  
  // Count deal fields
  if (before.deal && after.deal) {
    if (!before.deal.dealType && after.deal.dealType) dealFieldsAdded++;
    if (before.deal.paymentTerms !== after.deal.paymentTerms) dealFieldsAdded++;
  }
  
  // Count general fields
  if (before.general && after.general) {
    if (!before.general.city && after.general.city) generalFieldsAdded++;
  }
  
  return {
    dealFieldsAdded,
    generalFieldsAdded,
    totalFieldsAdded: dealFieldsAdded + generalFieldsAdded,
  };
}
