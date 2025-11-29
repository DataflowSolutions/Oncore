# Import System Architecture

## Overview

Enterprise-grade document import system with PDF/DOCX extraction, background processing, and real-time progress tracking.

## Features

- **Multi-format support**: PDF, DOCX, TXT, HTML, CSV
- **Background workers**: Horizontal scaling with atomic job claiming
- **Real-time progress**: Section-by-section updates via polling
- **Confidence scoring**: AI-generated confidence maps for extracted data
- **Document handling**: Only truly attached files appear in Documents section
- **Error resilience**: Retry logic, graceful degradation, comprehensive logging

## Architecture

### Components

1. **Text Extraction** (`lib/import/text-extraction.ts`)
   - PDF parsing via pdf-parse
   - DOCX extraction via mammoth
   - Handles text files, HTML, CSV
   - Returns word/page counts for analytics

2. **Import Orchestrator** (`lib/import/orchestrator.ts`)
   - Section-wise extraction in fixed order
   - Confidence map generation
   - Deduplication for hotels, flights, contacts
   - Progress callbacks for real-time updates

3. **Background Worker** (`lib/import/worker.ts`)
   - Polls for pending jobs every 5 seconds (configurable)
   - Atomic job claiming via `app_claim_next_import_jobs` RPC
   - Processes batch of 3 jobs concurrently (configurable)
   - Updates `progress_data` JSONB column for UI visibility

4. **Worker API** (`app/api/import-worker/process/route.ts`)
   - POST endpoint for cron/queue triggers
   - Protected by Bearer token (`IMPORT_WORKER_SECRET`)
   - Returns count of processed jobs

5. **Job Lifecycle**
   - **pending**: Queued for worker
   - **processing**: Currently being extracted
   - **completed**: Ready for confirmation
   - **failed**: Extraction error (check `error` field)
   - **committed**: Show created from import

## Deployment Options

### Option A: Standalone Worker Process (Recommended for Production)

Run worker as a separate long-lived process:

\`\`\`bash
# Development
npm run import:worker

# Production with PM2
pm2 start npm --name "import-worker" -- run import:worker
pm2 save

# Docker
docker build -t oncore-worker .
docker run -d --env-file .env.production oncore-worker npm run import:worker

# Kubernetes Deployment
kubectl apply -f k8s/import-worker-deployment.yaml
\`\`\`

**Environment Variables:**
- `IMPORT_WORKER_POLL_INTERVAL`: Milliseconds between polls (default: 5000)
- `IMPORT_WORKER_BATCH_SIZE`: Jobs per batch (default: 3)
- `SUPABASE_URL`: Database URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (bypasses RLS)

**Scaling:**
- Horizontal: Run multiple instances; job claiming is atomic
- Vertical: Increase memory for large PDFs: `NODE_OPTIONS=--max-old-space-size=4096`

### Option B: Cron-Triggered API Route (Vercel/Serverless)

Trigger worker via scheduled function:

\`\`\`bash
# Add to vercel.json
{
  "crons": [{
    "path": "/api/import-worker/process",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }]
}

# Or use external cron (e.g., AWS EventBridge)
curl -X POST https://your-app.com/api/import-worker/process \
  -H "Authorization: Bearer \${IMPORT_WORKER_SECRET}"
\`\`\`

**Limitations:**
- 10-second timeout on Vercel Hobby
- 60-second timeout on Vercel Pro
- Not suitable for large batch processing

### Option C: Queue-Based (Enterprise)

Integrate with SQS, Redis, or Kafka:

1. Start route pushes job to queue
2. Worker polls queue instead of database
3. Worker updates job status in Supabase

**Benefits:**
- Better observability (DLQ for failed jobs)
- Rate limiting and backpressure
- Decoupled from database polling

## Usage

### Starting an Import

\`\`\`typescript
// Client-side: Attach files and/or paste text
const formData = new FormData();
formData.append("orgId", orgId);

// Files are sent as base64 for server-side extraction
const base64 = await fileToBase64(file);
formData.append("sources", JSON.stringify([{
  fileName: file.name,
  mimeType: file.type,
  sizeBytes: file.size,
  fileData: base64,
}]));

const response = await fetch("/api/shows/import/start", {
  method: "POST",
  body: formData,
});

const { jobId } = await response.json();
\`\`\`

### Polling Job Status

\`\`\`typescript
// Poll every 2 seconds
const interval = setInterval(async () => {
  const job = await fetch(\`/api/import-jobs/\${jobId}\`).then(r => r.json());
  
  console.log(job.progress_data);
  // {
  //   current_section: "hotels",
  //   current_source: "contract.pdf",
  //   sections_completed: 3,
  //   total_sections: 9
  // }

  if (job.status === "completed") {
    clearInterval(interval);
    // Hydrate UI with job.extracted
  }
}, 2000);
\`\`\`

## Database Schema

\`\`\`sql
-- Added by migration 20251129162339_import_jobs_progress_tracking.sql
ALTER TABLE import_jobs
ADD COLUMN progress_data JSONB DEFAULT '{}';

-- Example progress_data:
{
  "current_section": "flights",
  "current_source": "booking-confirmation.pdf",
  "sections_completed": 4,
  "total_sections": 9,
  "started_at": "2025-11-29T16:30:00Z",
  "last_updated": "2025-11-29T16:30:15Z"
}
\`\`\`

## Monitoring

### Logs

All operations log to console with structured JSON:

\`\`\`json
{
  "level": "info",
  "msg": "Worker: starting job",
  "jobId": "uuid",
  "orgId": "uuid"
}
\`\`\`

Searchable fields:
- `jobId`: Track a single import
- `orgId`: Track all imports for organization
- `fileName`: Track specific source file
- `section`: Track section extraction

### Metrics (Recommended)

Track in your observability platform:
- `import.jobs.pending`: Gauge of pending jobs
- `import.jobs.processing`: Gauge of in-flight jobs
- `import.jobs.completed`: Counter of completed jobs
- `import.jobs.failed`: Counter of failed jobs
- `import.extraction.duration`: Histogram of extraction time by section

### Alerting

Set alerts on:
- `import.jobs.pending > 100`: Queue backlog
- `import.jobs.failed.rate > 0.1`: High failure rate
- `import.extraction.duration.p99 > 60s`: Slow extractions

## Troubleshooting

### Worker not processing jobs

Check:
1. Worker is running: `pm2 status` or `kubectl get pods`
2. Database connectivity: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set
3. Logs for claim errors: `Worker: failed to claim jobs`

### PDF extraction failing

- Ensure `pdf-parse` and `mammoth` installed: `npm list pdf-parse mammoth`
- Check file size: PDFs > 50MB may timeout; increase memory or split
- Check logs for "PDF extraction failed" with specific error

### Jobs stuck in "processing"

- Worker crashed mid-job; job remains locked
- Manually reset: `UPDATE import_jobs SET status = 'pending' WHERE id = 'uuid'`
- Add timeout logic in worker (future enhancement)

### Progress not updating in UI

- Confirm `progress_data` column exists: `supabase migration up`
- Check RPC `app_update_import_job_progress` created
- Verify polling is active: Look for `[import-ui] Job <id> status: processing` logs

## Performance Tuning

### For Large PDFs (100+ pages)

\`\`\`bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=8192" npm run import:worker
\`\`\`

### For High Throughput

\`\`\`bash
# Increase batch size and reduce poll interval
IMPORT_WORKER_BATCH_SIZE=10 IMPORT_WORKER_POLL_INTERVAL=2000 npm run import:worker
\`\`\`

### For Cost Optimization

- Use smaller batch sizes to avoid timeouts
- Increase poll interval to reduce database load
- Run worker only during business hours

## Security

- **Worker secret**: Set strong `IMPORT_WORKER_SECRET` in production
- **Service role key**: Rotates regularly; store in secrets manager
- **Input validation**: Start route validates orgId and source formats
- **RLS bypass**: Worker uses service role; ensure RPC validates org membership

## Future Enhancements

- [ ] OCR support for image-based PDFs (tesseract.js)
- [ ] Streaming progress via SSE instead of polling
- [ ] Job prioritization (e.g., VIP customers first)
- [ ] Automatic retry with exponential backoff
- [ ] Dead letter queue for failed jobs
- [ ] S3/GCS storage for large files instead of base64
- [ ] Multi-region worker deployment
- [ ] Real-time queue depth metrics dashboard
