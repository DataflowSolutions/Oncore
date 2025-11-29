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

import { runWorkerLoop } from "@/lib/import/worker";
import { logger } from "@/lib/logger";

const pollInterval = process.env.IMPORT_WORKER_POLL_INTERVAL
  ? parseInt(process.env.IMPORT_WORKER_POLL_INTERVAL, 10)
  : 5000;

const batchSize = process.env.IMPORT_WORKER_BATCH_SIZE
  ? parseInt(process.env.IMPORT_WORKER_BATCH_SIZE, 10)
  : 3;

logger.info("Starting import worker", { pollInterval, batchSize });

runWorkerLoop({ pollInterval, batchSize }).catch((error) => {
  logger.error("Worker crashed", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received; shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received; shutting down gracefully");
  process.exit(0);
});

