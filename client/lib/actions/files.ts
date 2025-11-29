"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { parseContractFromURL } from "@/lib/services/contract-parser";
import { z } from "zod";

type ParsedContractRow = Database["public"]["Tables"]["parsed_contracts"]["Row"];

const uploadFileSchema = z.object({
  bucket: z.string().default("files"),
  orgId: z.string().uuid(),
  showId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  fieldId: z.string().uuid().optional(),
  partyType: z.enum(["from_us", "from_you"]).optional(),
});

const parseContractSchema = z.object({
  orgId: z.string().uuid(),
  fileUrl: z.string().url(),
  fileName: z.string(),
});

const updateContractStatusSchema = z.object({
  orgId: z.string().uuid(),
  contractId: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
  notes: z.string().optional(),
});

const MEMBER_ROLES = new Set(["owner", "admin", "editor"]);

async function ensureOrgManager(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership, error } = await (supabase as any).rpc('get_org_membership', {
    p_org_id: orgId,
  });

  if (error) {
    logger.error("Error checking org membership", error);
    throw new Error("Unable to verify organization access");
  }

  if (!membership || !MEMBER_ROLES.has(membership.role)) {
    throw new Error("You do not have permission to manage contracts for this organization");
  }
}

async function fetchOrgSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc("get_org_by_id", {
    p_org_id: orgId,
  });

  return data?.slug ?? null;
}

export async function uploadFile(
  file: File,
  params: z.infer<typeof uploadFileSchema>,
) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { error: "Authentication required" };
  }

  const validation = uploadFileSchema.safeParse(params);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const {
    bucket,
    orgId,
    showId,
    sessionId,
    documentId,
    fieldId,
    partyType,
  } = validation.data;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orgId", orgId);
    formData.append("bucket", bucket);

    if (showId) formData.append("showId", showId);
    if (sessionId) formData.append("sessionId", sessionId);
    if (documentId) formData.append("documentId", documentId);
    if (fieldId) formData.append("fieldId", fieldId);
    if (partyType) formData.append("partyType", partyType);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("Supabase URL not configured");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/upload-file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    const err = error as Error;
    logger.error("File upload failed", err);
    return { error: err.message || "Failed to upload file" };
  }
}

export async function parseContract(params: z.infer<typeof parseContractSchema>) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { error: "Authentication required" };
  }

  const validation = parseContractSchema.safeParse(params);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message ?? "Invalid request" };
  }

  const { orgId, fileUrl, fileName } = validation.data;

  try {
    await ensureOrgManager(supabase, orgId);
  } catch (error) {
    const err = error as Error;
    return { error: err.message };
  }

  let parsed;
  let parseError: string | null = null;

  try {
    parsed = await parseContractFromURL(fileUrl);
  } catch (error) {
    const err = error as Error;
    parseError = err.message ?? "Failed to parse contract";
    logger.error("Contract parsing error", err);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: record, error: insertError } = await (supabase as any)
      .from("parsed_contracts")
      .insert({
        org_id: orgId,
        file_name: fileName,
        file_url: fileUrl,
        parsed_data: parsed ?? null,
        status: parseError ? "error" : "pending",
        confidence: parsed?.confidence ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      logger.error("Failed to store parsed contract", insertError);
      return { error: "Unable to store parsed contract" };
    }

    const slug = await fetchOrgSlug(supabase, orgId);
    if (slug) {
      revalidatePath(`/${slug}/ingestion`);
    }

    if (parseError) {
      return { error: parseError };
    }

    return { success: true, data: { contractId: record.id, parsed } };
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to parse contract" };
  }
}

export async function updateParsedContractStatus(
  params: z.infer<typeof updateContractStatusSchema>,
) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const validation = updateContractStatusSchema.safeParse(params);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { orgId, contractId, status, notes } = validation.data;

  try {
    await ensureOrgManager(supabase, orgId);
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("parsed_contracts")
    .update({
      status,
      notes: notes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    })
    .eq("id", contractId)
    .eq("org_id", orgId);

  if (error) {
    logger.error("Failed to update parsed contract", error);
    return { success: false, error: error.message };
  }

  const slug = await fetchOrgSlug(supabase, orgId);
  if (slug) {
    revalidatePath(`/${slug}/ingestion`);
  }

  return { success: true };
}

export async function getParsedContracts(orgId: string) {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_parsed_contracts', { p_org_id: orgId });

  if (error) {
    logger.error("Failed to fetch parsed contracts", error);
    return [] as ParsedContractRow[];
  }

  return (data ?? []) as ParsedContractRow[];
}
