"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { logger } from "@/lib/logger";
import { getOrCreateShowAdvancing } from "./show-advancing";

type AdvancingDocument = Database["public"]["Tables"]["advancing_documents"]["Row"];

type AdvancingDocumentWithFiles = AdvancingDocument & {
  files: Array<{
    id: string;
    original_name: string | null;
    content_type: string | null;
    size_bytes: number | null;
    storage_path: string;
    created_at: string;
  }>;
};

/**
 * Get all documents for a show (cached)
 */
export const getAdvancingDocuments = cache(async (showId: string): Promise<AdvancingDocumentWithFiles[]> => {
  const supabase = await getSupabaseServer();

  // Ensure show_advancing exists
  const advancing = await getOrCreateShowAdvancing(showId);
  if (!advancing) {
    return [];
  }

  try {
    // Use RPC to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_advancing_documents", {
      p_session_id: advancing.id,
    });

    if (error) {
      logger.error("Error fetching advancing documents", error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Exception in getAdvancingDocuments", error);
    return [];
  }
});

/**
 * Create a new document container for a show
 */
export async function createAdvancingDocument(
  orgSlug: string,
  showId: string,
  partyType: "artist" | "promoter",
  label?: string
): Promise<{ success: boolean; error?: string; data?: AdvancingDocument }> {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Ensure show_advancing exists
  const advancing = await getOrCreateShowAdvancing(showId);
  if (!advancing) {
    return { success: false, error: "Could not create advancing record" };
  }

  try {
    // Use RPC to create document
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("create_advancing_document", {
      p_session_id: advancing.id,
      p_party_type: partyType,
      p_label: label || null,
    });

    if (error) {
      logger.error("Error creating advancing document", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/${orgSlug}/shows/${showId}/day`);

    return { success: true, data };
  } catch (error) {
    logger.error("Exception in createAdvancingDocument", error);
    return { success: false, error: "Failed to create document" };
  }
}

/**
 * Update document label
 */
export async function updateAdvancingDocument(
  orgSlug: string,
  showId: string,
  documentId: string,
  label: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("update_advancing_document", {
      p_document_id: documentId,
      p_label: label,
    });

    if (error) {
      logger.error("Error updating advancing document", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/${orgSlug}/shows/${showId}/day`);

    return { success: true };
  } catch (error) {
    logger.error("Error in updateAdvancingDocument", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a document
 */
export async function deleteAdvancingDocument(
  orgSlug: string,
  showId: string,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("delete_advancing_document", {
      p_document_id: documentId,
    });

    if (error) {
      logger.error("Error deleting advancing document", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/${orgSlug}/shows/${showId}/day`);

    return { success: true };
  } catch (error) {
    logger.error("Error in deleteAdvancingDocument", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Upload a file to an advancing document
 */
export async function uploadAdvancingFile(
  orgSlug: string,
  showId: string,
  documentId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; fileId?: string }> {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Ensure show_advancing exists
  const advancing = await getOrCreateShowAdvancing(showId);
  if (!advancing) {
    return { success: false, error: "Could not get advancing record" };
  }

  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Get show org_id via RPC (bypasses RLS)
    const { data: orgId, error: orgError } = await supabase.rpc("get_show_org_id", {
      p_show_id: showId,
    });

    if (orgError || !orgId) {
      logger.error("Error getting show org_id", orgError);
      return { success: false, error: "Show not found" };
    }

    // Generate unique file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${orgId}/shows/${showId}/advancing/${advancing.id}/${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("advancing-files")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
        metadata: {
          org_id: orgId,
          show_id: showId,
          session_id: advancing.id,
          document_id: documentId,
        },
      });

    if (uploadError) {
      logger.error("Error uploading file to storage", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Create file record using RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "upload_advancing_file",
      {
        p_org_id: orgId,
        p_document_id: documentId,
        p_storage_path: filePath,
        p_original_name: file.name,
        p_size_bytes: file.size,
        p_content_type: file.type,
      }
    );

    if (rpcError) {
      logger.error("Error creating file record", rpcError);
      // Clean up uploaded file
      await supabase.storage.from("advancing-files").remove([filePath]);
      return { success: false, error: rpcError.message };
    }

    revalidatePath(`/${orgSlug}/shows/${showId}/day`);

    const fileId = rpcData && typeof rpcData === "object" && "file_id" in rpcData
      ? rpcData.file_id
      : null;
    return { success: true, fileId: fileId as string | undefined };
  } catch (error) {
    logger.error("Error uploading file", error);
    return { success: false, error: "Failed to upload file" };
  }
}

/**
 * Delete a file from an advancing document
 */
export async function deleteAdvancingFile(
  orgSlug: string,
  showId: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    // Use RPC to delete file record and get storage path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "delete_advancing_file",
      { p_file_id: fileId }
    );

    if (rpcError) {
      logger.error("Error deleting file record", rpcError);
      return { success: false, error: rpcError.message };
    }

    // Delete from storage
    const storagePath = rpcData && typeof rpcData === "object" && "storage_path" in rpcData
      ? rpcData.storage_path
      : null;
    if (storagePath && typeof storagePath === "string") {
      const { error: storageError } = await supabase.storage
        .from("advancing-files")
        .remove([storagePath]);

      if (storageError) {
        logger.error("Error deleting file from storage", storageError);
      }
    }

    revalidatePath(`/${orgSlug}/shows/${showId}/day`);

    return { success: true };
  } catch (error) {
    logger.error("Error deleting file", error);
    return { success: false, error: "Failed to delete file" };
  }
}

/**
 * Get download URL for a file
 */
export async function getAdvancingFileUrl(
  filePath: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  const supabase = await getSupabaseServer();

  try {
    const { data, error } = await supabase.storage
      .from("advancing-files")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      logger.error("Error creating signed URL", error);
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    logger.error("Error getting file URL", error);
    return { success: false, error: "Failed to get file URL" };
  }
}
