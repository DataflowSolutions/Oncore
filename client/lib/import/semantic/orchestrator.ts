/**
 * Semantic Import Orchestrator
 * 
 * Main entry point that coordinates the multi-stage semantic import pipeline:
 * - Stage 1: Extract candidate facts from all chunks
 * - Stage 2: Perform semantic resolution to select final values
 * - Stage 3: Apply resolved facts to canonical ImportData structure
 * - Stage F3: Enrich flights with external API data
 * - Stage 3.5: Enrich other fields with derived data
 */

import { logger } from '@/lib/logger';
import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImportSource } from '../chunking';
import type { ImportData } from '@/components/import/types';
import { createEmptyImportData } from '@/components/import/types';
import { getFlightEnrichmentService, type ExtractedFlightKey } from './flight-enrichment';
import { enrichImportData, getEnrichmentStats } from './enrichment';
import { summarizeResolutions } from './resolution';
import { getImportFacts, updateImportJobStage } from './db';
import { dumpApplication } from './diagnostics';
import { applyResolutionsToImportData } from './application';
import { runFactExtraction, runFactResolution } from './stages';
import {
  reconstructFlightInstances,
  applyFlightGroupsToImportData,
  getConsumedFlightFactTypes,
} from './flight-reconstruction';
import type {
  SemanticExtractionResult,
  SemanticProgressCallback,
} from './types-public';

type SupabaseClientLike = Pick<SupabaseClient<Database>, 'rpc'>;

// Re-export public types
export type { SemanticExtractionResult, SemanticProgressCallback } from './types-public';
export { applyResolutionsToImportData } from './application';

// =============================================================================
// Main Orchestration
// =============================================================================

/**
 * Run the complete semantic import pipeline
 * 
 * @param options.maxWordsPerChunk - Optional override for chunk size (default: env SEMANTIC_IMPORT_MAX_WORDS or 800)
 * @param options.minWordsPerChunk - Optional override for min chunk size (default: env SEMANTIC_IMPORT_MIN_WORDS or 300)
 */
export async function runSemanticImport(
  supabase: SupabaseClientLike,
  jobId: string,
  sources: ImportSource[],
  onProgress?: SemanticProgressCallback,
  options?: {
    maxWordsPerChunk?: number;
    minWordsPerChunk?: number;
  }
): Promise<SemanticExtractionResult> {
  logger.info('Semantic import starting', { jobId, sources: sources.length });

  // =============================================================================
  // STAGE 1: Fact Extraction
  // =============================================================================

  const extractionResult = await runFactExtraction(supabase, jobId, sources, onProgress, options);

  // =============================================================================
  // STAGE 2: Fact Resolution
  // =============================================================================

  const resolutionResult = await runFactResolution(supabase, jobId, onProgress);

  // =============================================================================
  // STAGE 3: Apply Resolved Facts to ImportData
  // =============================================================================

  logger.info('Stage 3: Applying resolved facts to ImportData', { jobId });

  if (onProgress) {
    await onProgress({
      stage: 'applying',
    });
  }

  // Start with empty ImportData
  let data = createEmptyImportData();

  // Fetch selected facts from database
  const factsResult = await getImportFacts(supabase, jobId);
  const selectedFacts = factsResult.facts || [];
  const selectedFactsFiltered = selectedFacts.filter(f =>
    resolutionResult.selected_fact_ids.includes(f.id)
  );

  logger.info('Fetched selected facts for application', {
    jobId,
    selected: selectedFactsFiltered.length,
  });

  // =============================================================================
  // STAGE F1-F2: Flight Reconstruction (Group flight facts into legs)
  // =============================================================================

  logger.info('Stage F1-F2: Reconstructing flight instances', { jobId });

  // Debug: Log flight-related resolutions
  const flightFactTypes = ['flight_number', 'flight_date', 'flight_passenger_name', 'flight_booking_reference', 'flight_ticket_number', 'flight_seat', 'flight_travel_class', 'flight_notes'];
  const flightResolutions = resolutionResult.resolutions.filter(r => flightFactTypes.includes(r.fact_type));
  logger.info('Flight-related resolutions', {
    jobId,
    count: flightResolutions.length,
    details: flightResolutions.map(r => ({
      type: r.fact_type,
      state: r.state,
      value: r.final_value_text || r.final_value_number || r.final_value_date,
      factId: r.selected_fact_id,
    })),
  });

  const flightGroups = reconstructFlightInstances(
    resolutionResult.resolutions,
    selectedFactsFiltered
  );

  logger.info('Flight reconstruction complete', {
    jobId,
    flightLegs: flightGroups.length,
    groups: flightGroups.map(g => ({
      id: g.groupId,
      flightNumber: g.flightNumber,
      date: g.date,
      passenger: g.fullName,
    })),
  });

  // Apply flight groups to ImportData
  data = applyFlightGroupsToImportData(data, flightGroups);

  // Get fact types consumed by flight reconstruction
  const consumedFlightFactTypes = getConsumedFlightFactTypes();

  // Apply non-flight resolutions
  const nonFlightResolutions = resolutionResult.resolutions.filter(
    r => !consumedFlightFactTypes.has(r.fact_type)
  );

  // Debug: Log what resolutions we're applying
  const resolvedNonFlight = nonFlightResolutions.filter(r => r.state === 'resolved' || r.state === 'informational');
  logger.info('Applying non-flight resolutions', {
    jobId,
    totalResolutions: resolutionResult.resolutions.length,
    flightResolutions: resolutionResult.resolutions.length - nonFlightResolutions.length,
    nonFlightResolutions: nonFlightResolutions.length,
    resolvedOrInfoNonFlight: resolvedNonFlight.length,
    byType: resolvedNonFlight.reduce((acc, r) => {
      acc[r.fact_type] = (acc[r.fact_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });

  const nonFlightData = applyResolutionsToImportData(
    nonFlightResolutions,
    selectedFactsFiltered
  );

  // Debug: Log what data was populated
  logger.info('Non-flight data populated', {
    jobId,
    general: Object.entries(nonFlightData.general).filter(([_, v]) => v).length,
    deal: Object.entries(nonFlightData.deal).filter(([_, v]) => v).length,
    hotels: nonFlightData.hotels?.length || 0,
    contacts: nonFlightData.contacts?.length || 0,
    food: nonFlightData.food?.length || 0,
    activities: nonFlightData.activities?.length || 0,
  });

  // Merge non-flight data (preserve flights array)
  data = {
    ...nonFlightData,
    flights: data.flights,
  };

  // =============================================================================
  // STAGE F3: Flight Enrichment (API lookup for airports, times, etc.)
  // =============================================================================

  logger.info('Stage F3: Enriching flights with external API data', { jobId });

  if (data.flights && data.flights.length > 0) {
    const flightEnrichmentService = getFlightEnrichmentService();

    // Convert ImportedFlight[] to ExtractedFlightKey[] for enrichment
    const flightKeys: ExtractedFlightKey[] = data.flights.map(flight => ({
      flightNumber: flight.flightNumber || '',
      date: flight.date,
      passengerName: flight.fullName,
      ticketNumber: flight.ticketNumber,
      bookingReference: flight.bookingReference,
      seat: flight.seat,
      travelClass: flight.travelClass,
      notes: flight.notes,
    }));

    // Enrich all flights
    const enrichedFlights = await flightEnrichmentService.enrichFlights(flightKeys);

    // Merge enriched data back into flights
    data.flights = data.flights.map((flight, index) => {
      const enriched = enrichedFlights[index];

      if (enriched.enrichmentStatus === 'success') {
        return {
          ...flight,
          // API-enriched fields (only set if successfully enriched)
          airline: enriched.airline || flight.airline,
          fromAirport: enriched.fromAirport || flight.fromAirport,
          fromCity: enriched.fromCity || flight.fromCity,
          toAirport: enriched.toAirport || flight.toAirport,
          toCity: enriched.toCity || flight.toCity,
          departureTime: enriched.departureTime || flight.departureTime,
          arrivalTime: enriched.arrivalTime || flight.arrivalTime,
          flightTime: enriched.flightTime || flight.flightTime,
          aircraft: enriched.aircraft || flight.aircraft,
          // Add enrichment metadata to notes if enriched
          notes: flight.notes
            ? `${flight.notes}\n[Enriched via ${enriched.enrichmentSource}]`
            : `[Enriched via ${enriched.enrichmentSource}]`,
        };
      }

      // Enrichment failed - keep original data (keys only)
      if (enriched.enrichmentStatus === 'failed') {
        logger.warn('Flight enrichment failed', {
          flightNumber: flight.flightNumber,
          error: enriched.enrichmentError,
        });
      }

      return flight;
    });

    const successCount = enrichedFlights.filter(f => f.enrichmentStatus === 'success').length;
    logger.info('Flight enrichment complete', {
      jobId,
      total: enrichedFlights.length,
      successful: successCount,
      failed: enrichedFlights.length - successCount,
    });
  }

  // =============================================================================
  // STAGE 3.5: Data Enrichment (other fields)
  // =============================================================================

  logger.info('Stage 3.5: Enriching data with derived fields', { jobId });

  const beforeEnrichment = { ...data };
  data = enrichImportData(data);

  const enrichmentStats = getEnrichmentStats(beforeEnrichment, data);
  logger.info('Enrichment complete', {
    jobId,
    ...enrichmentStats,
  });

  // Diagnostic: Dump application results and final ImportData
  dumpApplication(jobId, data);

  // Generate summary
  const summary = summarizeResolutions(resolutionResult.resolutions);

  await updateImportJobStage(supabase, jobId, 'completed');

  logger.info('Semantic import extraction complete', {
    jobId,
    factsExtracted: extractionResult.facts.length,
    factsSelected: resolutionResult.selected_fact_ids.length,
  });

  return {
    data,
    facts_extracted: extractionResult.facts.length,
    facts_selected: resolutionResult.selected_fact_ids.length,
    resolutions: resolutionResult.resolutions,
    summary,
  };
}
