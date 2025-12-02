import { ImportData } from "@/components/import/types";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Database } from "../database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Confidence entry: either a simple number or an object with score and optional reason.
 */
export type ConfidenceEntry =
  | number
  | {
      score: number;
      reason?: string;
    };

export type ImportJobStatus =
  | "pending"
  | "running"
  | "processing"
  | "completed"
  | "failed"
  | "committed";

export interface RawSourceInput {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  pageCount?: number;
  wordCount?: number;
  isLowText?: boolean;
  rawText: string;
}

export interface ImportJobRecord {
  id: string;
  org_id: string;
  status: ImportJobStatus;
  error?: string | null;
  raw_sources?: RawSourceInput[];
  extracted?: ImportData | null;
  confidence_map?: Record<string, ConfidenceEntry> | null;
  committed_show_id?: string | null;
  payload?: unknown;
  created_at?: string;
  updated_at?: string;
}

type SupabaseClientLike = Pick<SupabaseClient<Database>, "rpc">;

async function getClient(supabase?: SupabaseClientLike) {
  if (supabase) return supabase;
  return getSupabaseServer() as unknown as SupabaseClientLike;
}

export async function createImportJob(
  orgId: string,
  rawSources: RawSourceInput[]
): Promise<{ jobId: string | null; error?: string }> {
  const supabase = await getSupabaseServer();

  const { data, error } = await (supabase as any).rpc("app_create_import_job", {
    p_org_id: orgId,
    p_raw_sources: rawSources,
  });

  if (error) {
    logger.error("Error creating import job", error);
    return { jobId: null, error: error.message };
  }

  return { jobId: data as string };
}

export async function updateImportJobExtracted(params: {
  jobId: string;
  extracted?: ImportData | null;
  confidenceMap?: Record<string, ConfidenceEntry> | null;
  status?: ImportJobStatus;
  errorMessage?: string | null;
  supabase?: SupabaseClientLike;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await getClient(params.supabase);

  logger.info("updateImportJobExtracted called", {
    jobId: params.jobId,
    hasExtracted: !!params.extracted,
    extractedKeys: params.extracted ? Object.keys(params.extracted) : [],
    extractedData: params.extracted ? {
      general: params.extracted.general ? Object.keys(params.extracted.general).length : 0,
      deal: params.extracted.deal ? Object.keys(params.extracted.deal).length : 0,
      technical: params.extracted.technical ? Object.keys(params.extracted.technical).length : 0,
      hotels: params.extracted.hotels?.length || 0,
      flights: params.extracted.flights?.length || 0,
      food: params.extracted.food?.length || 0,
      activities: params.extracted.activities?.length || 0,
      contacts: params.extracted.contacts?.length || 0,
      documents: params.extracted.documents?.length || 0,
    } : null,
    hasConfidenceMap: !!params.confidenceMap,
    confidenceFields: params.confidenceMap ? Object.keys(params.confidenceMap).length : 0,
    status: params.status,
    errorMessage: params.errorMessage,
  });

  const { error } = await (supabase as any).rpc(
    "app_update_import_job_extracted",
    {
      p_job_id: params.jobId,
      p_extracted: params.extracted ?? null,
      p_confidence_map: params.confidenceMap ?? null,
      p_new_status: params.status ?? null,
      p_error: params.errorMessage ?? null,
    }
  );

  if (error) {
    logger.error("Error updating import job extracted payload", error);
    return { success: false, error: error.message };
  }

  logger.info("updateImportJobExtracted succeeded", { jobId: params.jobId });

  return { success: true };
}

export async function getImportJobById(
  jobId: string
): Promise<ImportJobRecord | null> {
  const supabase = await getSupabaseServer();

  const { data, error } = await (supabase as any).rpc("app_get_import_job", {
    p_job_id: jobId,
  });

  if (error) {
    logger.error("Error fetching import job", error);
    return null;
  }

  return (data as ImportJobRecord) || null;
}

export async function claimPendingImportJobs(
  limit = 3,
  supabase?: SupabaseClientLike
): Promise<{ jobs: ImportJobRecord[]; error?: string }> {
  const client = await getClient(supabase);

  const { data, error } = await (client as any).rpc("app_claim_next_import_jobs", {
    p_limit: limit,
  });

  if (error) {
    logger.error("Error claiming pending import jobs", error);
    return { jobs: [], error: error.message };
  }

  return { jobs: (data as ImportJobRecord[]) || [] };
}
