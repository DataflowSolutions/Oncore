import { NextRequest, NextResponse } from "next/server";

/**
 * Worker health check endpoint.
 * Workers ping this endpoint periodically to register themselves.
 * Import system checks this to see if workers are available.
 */

interface WorkerRegistration {
  lastPing: number;
  workerId: string;
}

// In-memory registry of active workers
// In production, use Redis or database for distributed systems
const workerRegistry = new Map<string, WorkerRegistration>();

const WORKER_TIMEOUT_MS = 30000; // 30 seconds - worker considered dead if no ping

export async function POST(req: NextRequest) {
  try {
    const { workerId } = await req.json();
    
    if (!workerId) {
      return NextResponse.json({ error: "workerId required" }, { status: 400 });
    }

    // Register/update worker
    workerRegistry.set(workerId, {
      lastPing: Date.now(),
      workerId,
    });

    // Clean up stale workers
    const now = Date.now();
    for (const [id, registration] of workerRegistry.entries()) {
      if (now - registration.lastPing > WORKER_TIMEOUT_MS) {
        workerRegistry.delete(id);
      }
    }

    return NextResponse.json({ 
      status: "ok",
      activeWorkers: workerRegistry.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to register worker" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Clean up stale workers
  const now = Date.now();
  for (const [id, registration] of workerRegistry.entries()) {
    if (now - registration.lastPing > WORKER_TIMEOUT_MS) {
      workerRegistry.delete(id);
    }
  }

  const activeWorkers = Array.from(workerRegistry.values()).map((w) => ({
    workerId: w.workerId,
    lastPingSec: Math.round((now - w.lastPing) / 1000),
  }));

  return NextResponse.json({
    healthy: workerRegistry.size > 0,
    activeWorkers: workerRegistry.size,
    workers: activeWorkers,
  });
}
