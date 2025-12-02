/**
 * Semantic Import Worker
 * 
 * Background worker that uses the two-stage semantic import pipeline:
 * - Stage 1: Extract candidate facts from all chunks
 * - Stage 2: Perform semantic resolution to select final values
 * 
 * This worker replaces the "last-value-wins" extraction with
 * semantic decision-making that respects negotiation flow.
 */

import { logger } from "@/lib/logger";
import { getSupabaseServiceClient } from "./worker-client";
import { claimPendingImportJobs, updateImportJobExtracted, ImportJobRecord } from "./jobs";
import { ImportSource } from "./chunking";
import { runSemanticImportExtraction } from "./semantic";
import { countWords } from "./background";
import type { Database } from "../database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseClientLike = Pick<SupabaseClient<Database>, "rpc">;

export interface SemanticWorkerConfig {
  batchSize?: number;
  pollInterval?: number;
  supabase?: SupabaseClientLike;
}

export interface SemanticJobProgress {
  stage: string;
  current_source?: string;
  current_chunk?: number;
  total_chunks?: number;
  facts_extracted?: number;
  sources_completed?: number;
  total_sources?: number;
  started_at?: string;
  last_updated?: string;
}

const DEFAULT_BATCH_SIZE = 3;
const DEFAULT_POLL_INTERVAL = 5000;

/**
 * Process one batch of pending import jobs using semantic extraction.
 */
export async function processSemanticImportJobs(
  config: SemanticWorkerConfig = {}
): Promise<number> {
  const batchSize = config.batchSize || DEFAULT_BATCH_SIZE;
  const supabase = config.supabase || getSupabaseServiceClient();

  console.log(`🔍 [Semantic] Checking for pending import jobs...`);
  logger.info("SemanticWorker: claiming pending jobs", { batchSize });

  try {
    const { jobs, error } = await claimPendingImportJobs(batchSize, supabase as SupabaseClientLike);

    if (error) {
      console.log(`❌ Failed to claim jobs: ${error}`);
      logger.error("SemanticWorker: failed to claim jobs", { error });
      return 0;
    }

    if (!jobs || jobs.length === 0) {
      console.log(`✓ No pending jobs found`);
      logger.info("SemanticWorker: no pending jobs");
      return 0;
    }

    console.log(`\n📦 [Semantic] Found ${jobs.length} job(s) to process`);
    jobs.forEach((job, i) => {
      console.log(`   ${i + 1}. Job ID: ${job.id.substring(0, 8)}... (Status: ${job.status})`);
    });
    console.log();

    logger.info("SemanticWorker: processing batch", { count: jobs.length });

    // Process jobs sequentially for semantic extraction
    // (parallel processing can cause context issues)
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        await processSemanticJob(job, supabase as SupabaseClientLike);
        succeeded++;
      } catch (error) {
        failed++;
        logger.error("SemanticWorker: job failed", {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`\n✅ [Semantic] Batch complete: ${succeeded} succeeded, ${failed} failed\n`);
    console.log(`${'─'.repeat(60)}\n`);
    logger.info("SemanticWorker: batch complete", { succeeded, failed, total: jobs.length });

    return succeeded;
  } catch (error) {
    logger.error("SemanticWorker: processSemanticImportJobs failed", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return 0;
  }
}

/**
 * Process a single import job using semantic extraction.
 */
async function processSemanticJob(
  job: ImportJobRecord,
  supabase: SupabaseClientLike
): Promise<void> {
  const jobId = job.id;
  const shortId = jobId.substring(0, 8);

  try {
    console.log(`\n🧠 [${shortId}] Starting semantic import processing`);
    logger.info("SemanticWorker: starting job", { jobId, orgId: job.org_id });

    // Mark as processing
    await updateImportJobExtracted({
      jobId,
      status: "processing",
      errorMessage: null,
      supabase,
    });

    console.log(`   [${shortId}] Status updated to 'processing'`);

    // Update progress: starting
    await updateSemanticProgress(jobId, {
      stage: "starting",
      started_at: new Date().toISOString(),
    }, supabase);

    // Build extraction sources from raw_sources
    const rawSources = (job.raw_sources || []) as Array<{
      id: string;
      fileName: string;
      mimeType?: string;
      rawText: string;
      pageCount?: number;
      isLowText?: boolean;
      wordCount?: number;
    }>;

    const extractionSources: ImportSource[] = rawSources.map((s) => ({
      id: s.id,
      fileName: s.fileName,
      mimeType: s.mimeType,
      rawText: s.rawText,
      pageCount: s.pageCount,
      isLowText: s.isLowText,
      wordCount: s.wordCount,
    }));

    console.log(`   [${shortId}] Processing ${extractionSources.length} source(s)`);
    extractionSources.forEach((src, i) => {
      console.log(`      ${i + 1}. ${src.fileName} (${src.rawText?.length || 0} chars)`);
    });

    // Run semantic extraction with progress callbacks
    console.log(`   [${shortId}] 🔬 Stage 1: Extracting candidate facts...`);
    
    const result = await runSemanticImportExtraction(
      supabase,
      jobId,
      extractionSources,
      async (progress) => {
        const stage = progress.stage;
        
        if (stage === 'extracting_facts') {
          console.log(
            `   [${shortId}] Extracting: ${progress.current_source} ` +
            `(chunk ${progress.current_chunk}/${progress.total_chunks}, ` +
            `${progress.facts_extracted} facts so far)`
          );
        } else if (stage === 'resolving') {
          console.log(`   [${shortId}] 🧠 Stage 2: Resolving facts...`);
        } else if (stage === 'applying') {
          console.log(`   [${shortId}] 📝 Stage 3: Applying resolved values...`);
        }

        await updateSemanticProgress(jobId, {
          ...progress,
          last_updated: new Date().toISOString(),
        }, supabase);
      }
    );

    console.log(`   [${shortId}] ✓ Semantic extraction complete!`);
    console.log(`      • Facts extracted: ${result.facts_extracted}`);
    console.log(`      • Facts selected: ${result.facts_selected}`);
    console.log(`      • Resolutions: ${result.resolutions.length}`);

    // Log resolution summary
    console.log(`   [${shortId}] Resolution summary:`);
    const resolved = result.resolutions.filter(r => r.state === 'resolved');
    const unagreed = result.resolutions.filter(r => r.state === 'unagreed');
    const info = result.resolutions.filter(r => r.state === 'informational');
    console.log(`      • Resolved: ${resolved.length}`);
    console.log(`      • Unagreed: ${unagreed.length}`);
    console.log(`      • Informational: ${info.length}`);

    if (result.warnings && result.warnings.length > 0) {
      console.log(`   [${shortId}] ⚠️ Warnings:`);
      result.warnings.forEach(w => console.log(`      • ${w}`));
    }

    const lowTextSources = extractionSources.filter((src) => isLowTextSource(src));

    logger.info("SemanticWorker: extraction complete", {
      jobId,
      factsExtracted: result.facts_extracted,
      factsSelected: result.facts_selected,
      resolutions: {
        resolved: resolved.length,
        unagreed: unagreed.length,
        informational: info.length,
      },
      lowTextSources: lowTextSources.map((s) => s.fileName),
    });

    // Build confidence map from resolutions
    const confidenceByField: Record<string, number> = {};
    for (const resolution of result.resolutions) {
      if (resolution.selected_fact_id && resolution.state === 'resolved') {
        // Use fact_type as a proxy for field path
        confidenceByField[`resolved.${resolution.fact_type}`] = 1.0;
      }
    }

    // Save extracted data
    console.log(`   [${shortId}] 💾 Saving extracted data to database...`);
    const dataWithWarnings: any = { ...result.data };
    if (lowTextSources.length) {
      const warning = {
        code: "LOW_TEXT",
        message: "Insufficient text extracted from one or more documents (likely scanned/image-based PDF). Manual review or OCR required.",
        sources: lowTextSources.map((s) => s.fileName),
      };
      dataWithWarnings.warnings = [...(dataWithWarnings.warnings ?? []), warning];
    }

    await updateImportJobExtracted({
      jobId,
      extracted: dataWithWarnings,
      confidenceMap: confidenceByField,
      status: "completed",
      errorMessage: null,
      supabase,
    });

    console.log(`   [${shortId}] ✓ Job complete and saved!`);

    // Update progress: completed
    await updateSemanticProgress(jobId, {
      stage: "completed",
      facts_extracted: result.facts_extracted,
      last_updated: new Date().toISOString(),
    }, supabase);

    logger.info("SemanticWorker: job completed", {
      jobId,
      factsExtracted: result.facts_extracted,
      factsSelected: result.facts_selected,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`   [${shortId}] ❌ Job failed: ${errorMsg}`);
    logger.error("SemanticWorker: job failed", { jobId, error });

    await updateImportJobExtracted({
      jobId,
      status: "failed",
      errorMessage: errorMsg,
      supabase,
    });

    throw error;
  }
}

/**
 * Update semantic job progress atomically.
 */
async function updateSemanticProgress(
  jobId: string,
  progress: Partial<SemanticJobProgress>,
  supabase: SupabaseClientLike
): Promise<void> {
  try {
    const { error } = await (supabase as any).rpc("app_update_import_job_progress", {
      p_job_id: jobId,
      p_progress_data: progress,
    });

    if (error) {
      logger.error("SemanticWorker: failed to update progress", { jobId, error });
    }
  } catch (err) {
    logger.error("SemanticWorker: progress update exception", { jobId, err });
  }
}

function isLowTextSource(source: ImportSource): boolean {
  const words = source.wordCount ?? countWords(source.rawText || "");
  if (words <= 0) return true;
  const wpp = source.pageCount && source.pageCount > 0 ? words / source.pageCount : words;
  return words < 200 || wpp < 30 || !!source.isLowText;
}

/**
 * Register worker with health check (database-backed).
 */
async function registerSemanticWorkerHealth(
  workerId: string,
  supabase: SupabaseClientLike
): Promise<void> {
  try {
    const { error } = await (supabase as any).rpc("app_register_worker_heartbeat", {
      p_worker_id: workerId,
      p_worker_type: "semantic",
    });

    if (error) {
      logger.warn("SemanticWorker: health check registration failed", { workerId, error });
    }
  } catch (error) {
    logger.warn("SemanticWorker: health check ping failed", { workerId, error });
  }
}

/**
 * Run semantic worker in continuous polling mode.
 */
export async function runSemanticWorkerLoop(
  config: SemanticWorkerConfig = {}
): Promise<void> {
  const pollInterval = config.pollInterval || DEFAULT_POLL_INTERVAL;
  const workerId = `semantic-worker-${process.pid}-${Date.now()}`;
  const supabase = config.supabase || getSupabaseServiceClient();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🧠 SEMANTIC IMPORT WORKER STARTED`);
  console.log(`   Worker ID: ${workerId}`);
  console.log(`   Poll interval: ${pollInterval}ms`);
  console.log(`   Batch size: ${config.batchSize || DEFAULT_BATCH_SIZE}`);
  console.log(`${'═'.repeat(60)}\n`);

  logger.info("SemanticWorker: starting polling loop", { pollInterval, workerId });

  // Initial health check registration (database-backed)
  await registerSemanticWorkerHealth(workerId, supabase as SupabaseClientLike);

  // Set up periodic health check pings
  const healthCheckInterval = setInterval(() => {
    registerSemanticWorkerHealth(workerId, supabase as SupabaseClientLike);
  }, 10000);

  try {
    while (true) {
      try {
        await processSemanticImportJobs(config);
      } catch (error) {
        logger.error("SemanticWorker: loop iteration failed", {
          error,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  } finally {
    clearInterval(healthCheckInterval);
  }
}
