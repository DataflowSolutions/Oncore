#!/usr/bin/env npx tsx
/**
 * Import Worker Script
 * 
 * Runs the semantic import worker that uses two-stage extraction:
 * - Stage 1: Extract candidate facts
 * - Stage 2: Semantic resolution
 * 
 * Usage:
 *   npm run import:worker
 *   npx tsx scripts/import-worker.ts
 */

// Load environment variables FIRST before any other imports
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "../.env.local") });

import { runSemanticWorkerLoop } from "../lib/import/worker";

// Configuration from environment
const config = {
  batchSize: parseInt(process.env.IMPORT_WORKER_BATCH_SIZE || "3", 10),
  pollInterval: parseInt(process.env.IMPORT_WORKER_POLL_INTERVAL || "5000", 10),
};

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🧠 IMPORT WORKER                                   ║
║                                                              ║
║  Two-stage intelligent import extraction:                    ║
║  • Stage 1: Extract candidate facts from all chunks          ║
║  • Stage 2: Semantic resolution (respects negotiations)      ║
║                                                              ║
║  Uses semantic decision-making that understands context      ║
║  and negotiations, not simple "last-value-wins".             ║
╚══════════════════════════════════════════════════════════════╝
`);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the worker
runSemanticWorkerLoop(config).catch((error) => {
  console.error("Fatal error in semantic worker:", error);
  process.exit(1);
});
