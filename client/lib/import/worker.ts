import { logger } from "@/lib/logger";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "./worker-client";
import { claimPendingImportJobs, updateImportJobExtracted, ImportJobRecord } from "./jobs";
import { runFullImportExtraction } from "./orchestrator";
import { ImportSource } from "./chunking";
import type { Database } from "../database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseClientLike = Pick<SupabaseClient<Database>, "rpc">;

/**
 * Enterprise-grade background worker for processing import jobs.
 * 
 * Features:
 * - Atomic job claiming to prevent duplicate processing
 * - Progress tracking for real-time UI updates
 * - Graceful error handling with retries
 * - Configurable concurrency and batch size
 * - Horizontal scalability (multiple workers)
 * 
 * Architecture:
 * - Workers poll for pending jobs using app_claim_next_import_jobs RPC
 * - Each job is locked to prevent race conditions
 * - Progress updates are written atomically via app_update_import_job_progress
 * - Extraction runs section-by-section with progress checkpoints
 * 
 * Deployment:
 * - Can run as standalone process: npm run import:worker
 * - Can run as API route triggered by cron/queue: POST /api/import-worker/process
 * - Supports multiple instances for horizontal scaling
 */

export interface WorkerConfig {
  batchSize?: number;
  pollInterval?: number;
  maxRetries?: number;
  supabase?: SupabaseClientLike;
}

export interface JobProgress {
  current_section?: string;
  current_source?: string;
  sections_completed?: number;
  total_sections?: number;
  started_at?: string;
  last_updated?: string;
}

const DEFAULT_BATCH_SIZE = 3;
const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds
const DEFAULT_MAX_RETRIES = 3;

/**
 * Process one batch of pending import jobs.
 * Returns count of jobs processed.
 */
export async function processImportJobs(config: WorkerConfig = {}): Promise<number> {
  const batchSize = config.batchSize || DEFAULT_BATCH_SIZE;
  
  // Use provided supabase client or create service client for standalone worker
  const supabase = config.supabase || getSupabaseServiceClient();

  console.log(`🔍 Checking for pending import jobs...`);
  logger.info("Worker: claiming pending jobs", { batchSize });

  try {
    const { jobs, error } = await claimPendingImportJobs(batchSize, supabase as SupabaseClientLike);

    if (error) {
      console.log(`❌ Failed to claim jobs: ${error}`);
      logger.error("Worker: failed to claim jobs", { error });
      return 0;
    }

    if (!jobs || jobs.length === 0) {
      console.log(`✓ No pending jobs found`);
      logger.info("Worker: no pending jobs");
      return 0;
    }

    console.log(`\n📦 Found ${jobs.length} job(s) to process`);
    jobs.forEach((job, i) => {
      console.log(`   ${i + 1}. Job ID: ${job.id.substring(0, 8)}... (Status: ${job.status})`);
    });
    console.log();
    
    logger.info("Worker: processing batch", { count: jobs.length });

    // Process jobs in parallel (configurable concurrency)
    const results = await Promise.allSettled(
      jobs.map((job) => processJob(job, supabase as SupabaseClientLike))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`\n✅ Batch complete: ${succeeded} succeeded, ${failed} failed\n`);
    console.log(`${'─'.repeat(60)}\n`);
    logger.info("Worker: batch complete", { succeeded, failed, total: jobs.length });

    return succeeded;
  } catch (error) {
    logger.error("Worker: processImportJobs failed", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return 0;
  }
}

/**
 * Process a single import job end-to-end.
 */
async function processJob(job: ImportJobRecord, supabase: SupabaseClientLike): Promise<void> {
  const jobId = job.id;
  const shortId = jobId.substring(0, 8);

  try {
    console.log(`\n🚀 [${shortId}] Starting job processing`);
    logger.info("Worker: starting job", { jobId, orgId: job.org_id });

    // Mark as processing
    await updateImportJobExtracted({
      jobId,
      status: "processing",
      errorMessage: null,
      supabase,
    });
    
    console.log(`   [${shortId}] Status updated to 'processing'`);

    // Update progress: starting
    await updateProgress(jobId, {
      started_at: new Date().toISOString(),
      sections_completed: 0,
      total_sections: 9, // general, deal, hotels, flights, food, activities, contacts, technical, documents
    }, supabase);

    // Build extraction sources from raw_sources
    const rawSources = (job.raw_sources || []) as Array<{
      id: string;
      fileName: string;
      mimeType?: string;
      rawText: string;
    }>;

    const extractionSources: ImportSource[] = rawSources.map((s) => ({
      id: s.id,
      fileName: s.fileName,
      mimeType: s.mimeType,
      rawText: s.rawText,
    }));

    console.log(`   [${shortId}] Extracted ${extractionSources.length} source(s)`);
    extractionSources.forEach((src, i) => {
      console.log(`      ${i + 1}. ${src.fileName} (${src.rawText?.length || 0} chars)`);
    });
    console.log(`   [${shortId}] Running AI extraction...`);
    
    logger.info("Worker: running extraction", { jobId, sources: extractionSources.length });

    // Run full extraction with progress callbacks
    const { data, confidenceByField } = await runFullImportExtraction(
      extractionSources,
      async (progress) => {
        const section = progress.current_section || 'unknown';
        const sectionNum = (progress.sections_completed || 0) + 1;
        const totalSections = progress.total_sections || 9;
        console.log(`   [${shortId}] Section ${sectionNum}/${totalSections}: ${section}`);
        
        await updateProgress(jobId, {
          ...progress,
          last_updated: new Date().toISOString(),
        }, supabase);
      }
    );

    console.log(`   [${shortId}] ✓ Extraction complete!`);
    console.log(`      • Hotels: ${data.hotels.length}`);
    console.log(`      • Flights: ${data.flights.length}`);
    console.log(`      • Food: ${data.food.length}`);
    console.log(`      • Contacts: ${data.contacts.length}`);
    console.log(`      • Documents: ${data.documents.length}`);
    
    logger.info("Worker: extraction returned data", {
      jobId,
      data: {
        general: data.general ? Object.keys(data.general).length : 0,
        deal: data.deal ? Object.keys(data.deal).length : 0,
        technical: data.technical ? Object.keys(data.technical).length : 0,
        hotels: data.hotels.length,
        flights: data.flights.length,
        food: data.food.length,
        activities: data.activities.length,
        contacts: data.contacts.length,
        documents: data.documents.length,
      },
      confidenceFields: Object.keys(confidenceByField).length,
    });

    // Finalize with extracted data
    console.log(`   [${shortId}] 💾 Saving extracted data to database...`);
    await updateImportJobExtracted({
      jobId,
      extracted: data,
      confidenceMap: confidenceByField,
      status: "completed",
      errorMessage: null,
      supabase,
    });

    // Read-back verification: ensure extracted payload persisted
    console.log(`   [${shortId}] ✓ Job complete and saved!`);
    try {
      const { data: savedJob, error: readError } = await (supabase as any).rpc("app_get_import_job", {
        p_job_id: jobId,
      });
      if (readError) {
        logger.warn("Worker: read-back failed after update", { jobId, error: readError });
      } else if (savedJob) {
        const extracted = (savedJob as any).extracted || null;
        const confidence = (savedJob as any).confidence_map || null;
        logger.info("Worker: read-back persisted payload", {
          jobId,
          hasExtracted: !!extracted,
          hasConfidence: !!confidence,
          totals: extracted
            ? {
                hotels: extracted.hotels?.length || 0,
                flights: extracted.flights?.length || 0,
                food: extracted.food?.length || 0,
                activities: extracted.activities?.length || 0,
                contacts: extracted.contacts?.length || 0,
                documents: extracted.documents?.length || 0,
              }
            : undefined,
        });
      }
    } catch (rbErr) {
      logger.warn("Worker: read-back verification exception", { jobId, error: rbErr });
    }

    // Update progress: completed
    await updateProgress(jobId, {
      sections_completed: 9,
      total_sections: 9,
      last_updated: new Date().toISOString(),
    }, supabase);

    logger.info("Worker: job completed", {
      jobId,
      totals: {
        hotels: data.hotels.length,
        flights: data.flights.length,
        food: data.food.length,
        activities: data.activities.length,
        contacts: data.contacts.length,
        documents: data.documents.length,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`   [${shortId}] ❌ Job failed: ${errorMsg}`);
    logger.error("Worker: job failed", { jobId, error });

    await updateImportJobExtracted({
      jobId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown worker error",
      supabase,
    });
  }
}

/**
 * Update job progress atomically for UI visibility.
 */
async function updateProgress(
  jobId: string,
  progress: Partial<JobProgress>,
  supabase: SupabaseClientLike
): Promise<void> {
  try {
    const { error } = await (supabase as any).rpc("app_update_import_job_progress", {
      p_job_id: jobId,
      p_progress_data: progress,
    });

    if (error) {
      logger.error("Worker: failed to update progress", { jobId, error });
    }
  } catch (err) {
    logger.error("Worker: progress update exception", { jobId, err });
  }
}

/**
 * Register worker with health check endpoint.
 */
async function registerWorkerHealth(workerId: string): Promise<void> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1")
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    await fetch(`${apiUrl}/api/import-worker/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId }),
    });
  } catch (error) {
    // Don't fail the worker if health check fails
    logger.warn("Worker: health check ping failed", { workerId, error });
  }
}

/**
 * Run worker in continuous polling mode (for standalone process).
 */
export async function runWorkerLoop(config: WorkerConfig = {}): Promise<void> {
  const pollInterval = config.pollInterval || DEFAULT_POLL_INTERVAL;
  const workerId = `worker-${process.pid}-${Date.now()}`;

  logger.info("Worker: starting polling loop", { pollInterval, workerId });

  // Initial health check registration
  await registerWorkerHealth(workerId);

  // Set up periodic health check pings (every 10 seconds)
  const healthCheckInterval = setInterval(() => {
    registerWorkerHealth(workerId);
  }, 10000);

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await processImportJobs(config);
      } catch (error) {
        logger.error("Worker: loop iteration failed", { 
          error,
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  } finally {
    // Clean up health check interval on shutdown
    clearInterval(healthCheckInterval);
  }
}
