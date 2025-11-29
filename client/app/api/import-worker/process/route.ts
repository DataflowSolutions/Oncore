import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { processImportJobs } from "@/lib/import/worker";

/**
 * Worker API endpoint for processing import jobs.
 * 
 * Security:
 * - Vercel Cron: Automatically authenticated via x-vercel-cron header
 * - Manual triggers: Requires Authorization: Bearer <IMPORT_WORKER_SECRET>
 * 
 * Usage:
 * - Vercel Cron (automatic every 2 minutes)
 * - Manual: POST /api/import-worker/process with Bearer token
 * - Returns: { processed: number }
 */
export async function POST(req: NextRequest) {
  try {
    // Security: Accept Vercel Cron or Bearer token
    const cronHeader = req.headers.get("x-vercel-cron");
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = process.env.IMPORT_WORKER_SECRET || "dev-worker-secret";

    // Check if it's a Vercel Cron request (production only)
    const isVercelCron = !!cronHeader && process.env.VERCEL === "1";

    // Check if it's a manual request with valid token
    const isManualAuth = authHeader?.startsWith("Bearer ") && 
                        authHeader.substring(7) === expectedSecret;

    // In development, allow any request (local testing)
    const isDev = process.env.NODE_ENV === "development";

    if (!isVercelCron && !isManualAuth && !isDev) {
      logger.warn("Worker API: unauthorized request", {
        hasAuth: !!authHeader,
        hasCron: !!cronHeader,
        isVercel: process.env.VERCEL === "1",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process batch of jobs
    logger.info("Worker API: processing jobs");
    const processed = await processImportJobs({ batchSize: 5 });

    return NextResponse.json({ processed });
  } catch (error) {
    logger.error("Worker API: unexpected error", error);
    return NextResponse.json(
      { error: "Failed to process jobs" },
      { status: 500 }
    );
  }
}
