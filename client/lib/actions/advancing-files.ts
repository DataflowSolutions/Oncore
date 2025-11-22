"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

// Helper function to get or create session ID from show ID
async function getSessionIdByShowId(showId: string): Promise<string | null> {
  const supabase = await getSupabaseServer();

  // First try to get existing session
  const { data: existingSession } = await supabase
    .from("advancing_sessions")
    .select("id")
    .eq("show_id", showId)
    .maybeSingle();

  if (existingSession?.id) {
    return existingSession.id;
  }

  // If no session exists, create one
  // Get show details to create the session
  const { data: show } = await supabase
    .from("shows")
    .select("title, org_id")
    .eq("id", showId)
    .single();

  if (!show) {
    logger.error("Show not found for session creation", showId);
    return null;
  }

  // Create session using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newSession, error: createError } = await (supabase as any).rpc(
    "create_advancing_session",
    {
      p_show_id: showId,
      p_org_id: show.org_id,
      p_title: show.title,
    }
  );

  if (createError || !newSession) {
    logger.error("Error creating advancing session", createError);
    return null;
  }

  return newSession.id;
}

/**
 * Upload a file to an advancing document
 */
export async function uploadAdvancingFile(
  orgSlug: string,
  showIdOrSessionId: string,
  documentId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; fileId?: string }> {
  const supabase = await getSupabaseServer();

  // Get session ID from show ID
  const sessionId = await getSessionIdByShowId(showIdOrSessionId);

  if (!sessionId) {
    logger.error("No session found for show", showIdOrSessionId);
    return {
      success: false,
      error: "No advancing session found for this show",
    };
  }

  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get org_id and show_id from session using RPC (includes permission check)
    const { data: sessionData, error: sessionError } =
      await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("get_advancing_session", {
        p_session_id: sessionId,
      });

    if (sessionError || !sessionData) {
      return { success: false, error: "Session not found" };
    }

    const session =
      typeof sessionData === "object" && "org_id" in sessionData
        ? sessionData
        : null;
    if (!session || !session.org_id || !session.show_id) {
      return { success: false, error: "Invalid session data" };
    }

    // Generate unique file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `${session.org_id}/shows/${session.show_id}/advancing/${sessionId}/${fileName}`;

    // Upload file to storage with metadata for RLS
    const { error: uploadError } = await supabase.storage
      .from("advancing-files")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
        metadata: {
          org_id: session.org_id,
          show_id: session.show_id,
          session_id: sessionId,
          document_id: documentId,
        },
      });

    if (uploadError) {
      logger.error("Error uploading file to storage", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Create file record using RPC (includes permission check)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "upload_advancing_file",
      {
        p_document_id: documentId,
        p_storage_path: filePath,
        p_original_name: file.name,
        p_size_bytes: file.size,
        p_content_type: file.type,
      }
    );

    if (rpcError) {
      logger.error("Error creating file record", rpcError);
      // Try to clean up the uploaded file
      await supabase.storage.from("advancing-files").remove([filePath]);
      return { success: false, error: rpcError.message };
    }

    if (session.show_id) {
      revalidatePath(
        `/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`
      );
    }

    const fileId =
      rpcData && typeof rpcData === "object" && "file_id" in rpcData
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
  showIdOrSessionId: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  // Get session ID from show ID (not strictly needed for deletion, but kept for consistency)
  const sessionId = await getSessionIdByShowId(showIdOrSessionId);

  if (!sessionId) {
    logger.error("No session found for show", showIdOrSessionId);
    return {
      success: false,
      error: "No advancing session found for this show",
    };
  }

  try {
    // Use RPC to get file info and delete (includes permission check)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "delete_advancing_file",
      {
        p_file_id: fileId,
      }
    );

    if (rpcError) {
      logger.error("Error deleting file record", rpcError);
      return { success: false, error: rpcError.message };
    }

    // Delete from storage using path from RPC response
    const storagePath =
      rpcData && typeof rpcData === "object" && "storage_path" in rpcData
        ? rpcData.storage_path
        : null;
    if (storagePath && typeof storagePath === "string") {
      const { error: storageError } = await supabase.storage
        .from("advancing-files")
        .remove([storagePath]);

      if (storageError) {
        logger.error("Error deleting file from storage", storageError);
        // File record already deleted, just log error
      }
    }

    // Revalidate using IDs from RPC response
    const showId =
      rpcData && typeof rpcData === "object" && "show_id" in rpcData
        ? rpcData.show_id
        : null;
    const rpcSessionId =
      rpcData && typeof rpcData === "object" && "session_id" in rpcData
        ? rpcData.session_id
        : null;
    if (showId && rpcSessionId) {
      revalidatePath(`/${orgSlug}/shows/${showId}/advancing/${rpcSessionId}`);
    }

    return { success: true };
  } catch (error) {
    logger.error("Error deleting file", error);
    return { success: false, error: "Failed to delete file" };
  }
}

/**
 * Rename a file
 */
export async function renameAdvancingFile(
  orgSlug: string,
  showIdOrSessionId: string,
  fileId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  // Get session ID from show ID (not strictly needed for renaming, but kept for consistency)
  const sessionId = await getSessionIdByShowId(showIdOrSessionId);

  if (!sessionId) {
    logger.error("No session found for show", showIdOrSessionId);
    return {
      success: false,
      error: "No advancing session found for this show",
    };
  }

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Use RPC to rename file (includes permission check)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "rename_advancing_file",
      {
        p_file_id: fileId,
        p_new_name: newName,
      }
    );

    if (rpcError) {
      logger.error("Error renaming file", rpcError);
      return { success: false, error: rpcError.message };
    }

    // Revalidate using IDs from RPC response
    const showId =
      rpcData && typeof rpcData === "object" && "show_id" in rpcData
        ? rpcData.show_id
        : null;
    const rpcSessionId =
      rpcData && typeof rpcData === "object" && "session_id" in rpcData
        ? rpcData.session_id
        : null;
    if (showId && rpcSessionId) {
      revalidatePath(`/${orgSlug}/shows/${showId}/advancing/${rpcSessionId}`);
    }

    return { success: true };
  } catch (error) {
    logger.error("Error renaming file", error);
    return { success: false, error: "Failed to rename file" };
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
