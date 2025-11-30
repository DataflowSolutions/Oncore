#!/usr/bin/env ts-node
/**
 * Standalone import worker process.
 * 
 * Usage:
 *   npm run import:worker
 * 
 * Environment:
 *   IMPORT_WORKER_POLL_INTERVAL - milliseconds between polls (default: 5000)
 *   IMPORT_WORKER_BATCH_SIZE - jobs per batch (default: 3)
 * 
 * Deployment:
 *   - Docker: Build with FROM node:20-alpine, COPY client/, RUN npm ci, CMD npm run import:worker
 *   - Vercel: Not recommended (use cron + API route instead)
 *   - AWS ECS/Fargate: Containerized task with auto-scaling
 *   - Kubernetes: Deployment with HPA based on queue depth
 * 
 * Scaling:
 *   - Horizontal: Run multiple instances; job claiming is atomic
 *   - Vertical: Increase NODE_OPTIONS --max-old-space-size for large PDFs
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

// Enable debug logging for worker
process.env.DEBUG = "true";

import { runWorkerLoop } from "@/lib/import/worker";
import { logger } from "@/lib/logger";

const pollInterval = process.env.IMPORT_WORKER_POLL_INTERVAL
  ? parseInt(process.env.IMPORT_WORKER_POLL_INTERVAL, 10)
  : 5000;

const batchSize = process.env.IMPORT_WORKER_BATCH_SIZE
  ? parseInt(process.env.IMPORT_WORKER_BATCH_SIZE, 10)
  : 3;

console.log("\n╔════════════════════════════════════════════════════════╗");
console.log("║         IMPORT WORKER - BACKGROUND PROCESSOR          ║");
console.log("╚════════════════════════════════════════════════════════╝\n");
console.log(`📊 Configuration:`);
console.log(`   • Poll Interval: ${pollInterval}ms`);
console.log(`   • Batch Size: ${batchSize} jobs`);
console.log(`   • Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`   • Debug Mode: ENABLED\n`);
console.log(`🔄 Worker starting... Press Ctrl+C to stop\n`);
console.log(`${'─'.repeat(60)}\n`);

logger.info("Starting import worker", { pollInterval, batchSize });

runWorkerLoop({ pollInterval, batchSize }).catch((error) => {
  console.log(`\n❌ WORKER CRASHED\n`);
  logger.error("Worker crashed", error);
  console.error(error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log(`\n⚠️  SIGTERM received - shutting down gracefully...\n`);
  logger.info("SIGTERM received; shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log(`\n⚠️  SIGINT received - shutting down gracefully...\n`);
  logger.info("SIGINT received; shutting down gracefully");
  process.exit(0);
});

