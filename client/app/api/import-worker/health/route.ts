import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/import/worker-client";
import { logger } from "@/lib/logger";

/**
 * Worker health check endpoint.
 * Workers ping this endpoint periodically to register themselves.
 * Import system checks this to see if workers are available.
 * 
 * Uses database storage (import_worker_heartbeats table) instead of
 * in-memory storage to support serverless/multi-instance deployments.
 */

export async function POST(req: NextRequest) {
  try {
    const { workerId, type } = await req.json();
    
    if (!workerId) {
      return NextResponse.json({ error: "workerId required" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase.rpc("app_register_worker_heartbeat", {
      p_worker_id: workerId,
      p_worker_type: type || "semantic",
    });

    if (error) {
      logger.error("Failed to register worker heartbeat", { workerId, error });
      return NextResponse.json(
        { error: "Failed to register worker" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Worker health POST error", { error });
    return NextResponse.json(
      { error: "Failed to register worker" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase.rpc("app_get_worker_health");

    if (error) {
      logger.error("Failed to get worker health", { error });
      return NextResponse.json({
        healthy: false,
        active_workers: 0,
        workers: [],
        error: error.message,
      });
    }

    // RPC returns: { healthy, active_workers, workers }
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Worker health GET error", { error });
    return NextResponse.json({
      healthy: false,
      active_workers: 0,
      workers: [],
    });
  }
}
