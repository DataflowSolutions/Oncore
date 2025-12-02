import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  RawSourceInput,
  createImportJob,
  updateImportJobExtracted,
} from "@/lib/import/jobs";
import { runSemanticImportExtraction } from "@/lib/import/semantic";
import { ImportSource } from "@/lib/import/chunking";
import { shouldBackgroundImport } from "@/lib/import/background";
import type { ImportedDocument, ImportWarning } from "@/components/import/types";
import { createEmptyImportData } from "@/components/import/types";
import { extractText } from "@/lib/import/text-extraction";
import { getSupabaseServiceClient } from "@/lib/import/worker-client";

/**
 * Check if background workers are available.
 */
async function checkWorkerHealth(): Promise<boolean> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1")
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const response = await fetch(`${apiUrl}/api/import-worker/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    // RPC returns snake_case: healthy, active_workers
    return data.healthy === true && (data.active_workers > 0 || data.activeWorkers > 0);
  } catch (error) {
    logger.warn("Import: worker health check failed", { error });
    return false;
  }
}

interface StartImportRequest {
  orgId?: string;
  sources?: Array<Partial<RawSourceInput> & { fileData?: string }>;
  forceBackground?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StartImportRequest;
    const { orgId, sources } = body || {};

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json({ error: "sources are required" }, { status: 400 });
    }

    // Extract text from uploaded files before creating job
    logger.info("Import: extracting text from uploaded files", {
      orgId,
      sources: sources.map((s) => ({ fileName: s.fileName, mimeType: s.mimeType, hasFile: !!(s as any).fileData })),
    });

    const normalizedSources: RawSourceInput[] = await Promise.all(
      sources.map(async (source, index) => {
        let extractedText = source.rawText || "";
        let pageCount = source.pageCount;
        let wordCount: number | undefined = source.rawText
          ? source.rawText.split(/\s+/).filter(Boolean).length
          : undefined;
        let isLowText = false;

        // If fileData is provided, extract text from it
        if ((source as any).fileData && source.fileName) {
          try {
            const buffer = Buffer.from((source as any).fileData, "base64");
            logger.info("Import: attempting text extraction", {
              fileName: source.fileName,
              mimeType: source.mimeType,
              bufferSize: buffer.length,
            });
            const result = await extractText({
              fileName: source.fileName,
              mimeType: source.mimeType,
              buffer,
            });
            extractedText = result.text || "";
            pageCount = result.pageCount;
            wordCount = result.wordCount;
            isLowText = !!result.isLowText;
            logger.info("Import: text extracted from file", {
              fileName: source.fileName,
              words: result.wordCount,
              pages: result.pageCount,
              textLength: extractedText.length,
              hasError: !!result.error,
              error: result.error,
              isLowText,
            });
          } catch (err) {
            logger.error("Import: text extraction failed", {
              fileName: source.fileName,
              error: err,
              message: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            });
          }
        }

        return {
          id: source.id || randomUUID(),
          fileName: source.fileName || `source-${index + 1}`,
          mimeType: source.mimeType,
          sizeBytes: source.sizeBytes,
          pageCount,
          wordCount,
          isLowText: isLowText || isLowTextSource(extractedText, pageCount),
          rawText: extractedText,
        };
      })
    );

    const shouldBackground = shouldBackgroundImport(normalizedSources, body.forceBackground);
    const totalWords = normalizedSources.reduce((sum, source) => sum + (source.wordCount ?? (source.rawText ? source.rawText.split(/\s+/).filter(Boolean).length : 0)), 0);
    const lowTextSources = normalizedSources.filter((s) => s.isLowText);
    const warnings: ImportWarning[] = lowTextSources.length
      ? [{
          code: "LOW_TEXT",
          message: "Insufficient text extracted from one or more documents (likely scanned/image-based PDF). Manual review or OCR required.",
          sources: lowTextSources.map((s) => s.fileName),
        }]
      : [];
    logger.info("Import: background decision", {
      orgId,
      sources: normalizedSources.map((s) => ({ fileName: s.fileName, mimeType: s.mimeType, wordCount: s.wordCount ?? (s.rawText ? s.rawText.split(/\s+/).filter(Boolean).length : 0), isLowText: s.isLowText })),
      totalWords,
      shouldBackground,
      forceBackground: body.forceBackground,
      lowTextSources: lowTextSources.map((s) => s.fileName),
    });

    // Check if worker is available before creating background job
    if (shouldBackground) {
      const workerHealthy = await checkWorkerHealth();
      logger.info("Import: worker health check", { workerHealthy });
      if (!workerHealthy) {
        logger.warn("Import: no workers available, falling back to sync processing", { orgId });
        // Force synchronous processing since no worker is running
        return NextResponse.json(
          { 
            error: "Background worker is not running. Please start the worker with 'npm run import:worker' or the system will not process your import.",
            code: "WORKER_UNAVAILABLE",
          },
          { status: 503 }
        );
      }
    }

    const { jobId, error } = await createImportJob(orgId, normalizedSources);

    if (error || !jobId) {
      return NextResponse.json(
        { error: error || "Failed to create import job" },
        { status: 500 }
      );
    }

    // If there is no extractable text at all (e.g., only PDFs/images),
    // complete immediately with attached documents so the UI doesn't spin forever.
    const hasAnyText = normalizedSources.some((s) => (s.rawText || "").trim().length > 0);
    const hasAnyNonText = normalizedSources.some((s) => !!s.mimeType && !String(s.mimeType).startsWith("text/"));

    if (!hasAnyText && hasAnyNonText) {
      logger.info("No extractable text found; finalizing with documents only", {
        orgId,
        sources: normalizedSources.map((s) => ({ fileName: s.fileName, mimeType: s.mimeType, sizeBytes: s.sizeBytes })),
      });

      await updateImportJobExtracted({ jobId, status: "processing", errorMessage: null });

      const attachedDocuments: ImportedDocument[] = normalizedSources
        .filter((s) => (s.sizeBytes ?? 0) > 0 || (s.mimeType && !String(s.mimeType).startsWith("text/")))
        .map((s) => ({
          id: s.id,
          fileName: s.fileName,
          fileSize: s.sizeBytes || 0,
          category: inferDocumentCategory(s.fileName, s.mimeType),
        }));

      const data = createEmptyImportData();
      data.documents = attachedDocuments;
      if (warnings.length) {
        data.warnings = warnings;
      }

      await updateImportJobExtracted({
        jobId,
        extracted: data,
        confidenceMap: {},
        status: "completed",
        errorMessage: null,
      });
      return NextResponse.json({ jobId, documentsOnly: true });
    }

    // For large jobs, defer to background worker (TODO: queue integration)
    if (shouldBackground) {
      logger.info("Import job queued for background", {
        orgId,
        jobId,
        sources: normalizedSources.map((s) => ({ fileName: s.fileName, mimeType: s.mimeType, sizeBytes: s.sizeBytes })),
      });
      const updateResult = await updateImportJobExtracted({
        jobId,
        status: "pending",
        errorMessage: null,
      });
      logger.info("Import job status set to pending", { jobId, updateResult });
      return NextResponse.json({ jobId, queued: true });
    }

    // Run semantic extraction synchronously (same pipeline as background worker)
    try {
      await updateImportJobExtracted({
        jobId,
        status: "processing",
        errorMessage: null,
      });

      logger.info("Import extraction starting (sync)", {
        orgId,
        jobId,
        sources: normalizedSources.map((s) => ({ fileName: s.fileName, mimeType: s.mimeType, sizeBytes: s.sizeBytes })),
      });

      const extractionSources: ImportSource[] = normalizedSources.map((s) => ({
        id: s.id,
        fileName: s.fileName,
        mimeType: s.mimeType,
        rawText: s.rawText,
        pageCount: s.pageCount,
        isLowText: s.isLowText,
        wordCount: s.wordCount,
      }));

      // Use the semantic extraction pipeline (same as background worker)
      const supabase = getSupabaseServiceClient();
      const result = await runSemanticImportExtraction(
        supabase,
        jobId,
        extractionSources
      );

      const data = result.data;
      if (warnings.length) {
        data.warnings = warnings;
      }

      // Only include truly attached files as documents. Ignore textual mentions.
      const attachedDocuments: ImportedDocument[] = normalizedSources
        .filter((s) => (s.sizeBytes ?? 0) > 0 || (s.mimeType && !String(s.mimeType).startsWith("text/")))
        .map((s) => ({
          id: s.id,
          fileName: s.fileName,
          fileSize: s.sizeBytes || 0,
          category: inferDocumentCategory(s.fileName, s.mimeType),
        }));

      // Override any AI-generated documents with the attached list
      if (attachedDocuments.length >= 0) {
        data.documents = attachedDocuments;
      }

      // Build confidence map from resolutions
      const confidenceByField: Record<string, number> = {};
      for (const resolution of result.resolutions) {
        if (resolution.selected_fact_id && resolution.state === 'resolved') {
          confidenceByField[`resolved.${resolution.fact_type}`] = resolution.confidence ?? 1.0;
        }
      }

      logger.info("Import extraction finished (sync)", {
        jobId,
        factsExtracted: result.facts_extracted,
        factsSelected: result.facts_selected,
        totals: {
          hotels: data.hotels.length,
          flights: data.flights.length,
          food: data.food.length,
          activities: data.activities.length,
          contacts: data.contacts.length,
          documents: data.documents.length,
        },
      });

      await updateImportJobExtracted({
        jobId,
        extracted: data,
        confidenceMap: confidenceByField,
        status: "completed",
        errorMessage: null,
      });
    } catch (extractionError) {
      logger.error("Error running import extraction", extractionError);
      const message =
        extractionError instanceof Error
          ? extractionError.message
          : "Import extraction failed";

      await updateImportJobExtracted({
        jobId,
        status: "failed",
        errorMessage: message,
      });
    }

    return NextResponse.json({ jobId });
  } catch (error) {
    logger.error("Unexpected error starting import job", error);
    return NextResponse.json(
      { error: "Failed to start import job" },
      { status: 500 }
    );
  }
}

function inferDocumentCategory(fileName?: string, mimeType?: string): ImportedDocument["category"] {
  const name = (fileName || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  if (name.includes("rider")) return "rider";
  if (name.includes("contract")) return "contract";
  if (name.includes("visa")) return "visa";
  if (name.includes("boarding") && name.includes("pass")) return "boarding_pass";
  if (mime.includes("pdf")) return "other";
  return "other";
}

function isLowTextSource(rawText: string, pageCount?: number): boolean {
  const words = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
  if (words <= 0) return true;
  const wpp = pageCount && pageCount > 0 ? words / pageCount : words;
  return words < 200 || wpp < 30;
}
