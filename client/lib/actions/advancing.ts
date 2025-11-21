"use server";
import { logger } from "@/lib/logger";

import { getSupabaseServer } from "@/lib/supabase/server";
import { Database, Json } from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import crypto from "crypto";
import { generateScheduleFromAdvancing } from "./schedule";
import { getCachedOrg } from "@/lib/cache";

type AdvancingSession =
  Database["public"]["Tables"]["advancing_sessions"]["Row"];
type AdvancingField = Database["public"]["Tables"]["advancing_fields"]["Row"];
type AdvancingFieldUpdate =
  Database["public"]["Tables"]["advancing_fields"]["Update"];
type AdvancingComment =
  Database["public"]["Tables"]["advancing_comments"]["Row"];
type AdvancingDocument =
  Database["public"]["Tables"]["advancing_documents"]["Row"];

// Session Management
export const getAdvancingSessions = cache(async (orgSlug: string) => {
  const supabase = await getSupabaseServer();

  // Get org using cached function
  const { data: org, error: orgError } = await getCachedOrg(orgSlug);

  if (orgError || !org) {
    return [];
  }

  try {
    // Use RPC to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_org_advancing_sessions",
      {
        p_org_id: org.id,
      }
    );

    if (error) {
      logger.error("Error fetching advancing sessions", error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Exception in getAdvancingSessions", error);
    return [];
  }
});

export const getAdvancingSession = cache(
  async (sessionId: string): Promise<AdvancingSession | null> => {
    const supabase = await getSupabaseServer();

    try {
      // Use RPC to bypass RLS issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "get_advancing_session",
        {
          p_session_id: sessionId,
        }
      );

      if (error) {
        logger.error("Error fetching advancing session", error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error("Exception in getAdvancingSession", error);
      return null;
    }
  }
);

export async function createAdvancingSession(
  orgSlug: string,
  sessionData: {
    showId: string;
    title: string;
    accessCode?: string;
    expiresAt?: string;
  }
): Promise<{ success: boolean; error?: string; data?: AdvancingSession }> {
  const supabase = await getSupabaseServer();

  // Get org using cached function
  const { data: org, error: orgError } = await getCachedOrg(orgSlug);

  if (orgError || !org) {
    return { success: false, error: "Organization not found" };
  }

  // Use the RPC function to create session (no access code - use invitation system)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "create_advancing_session",
    {
      p_show_id: sessionData.showId,
      p_org_id: org.id,
      p_title: sessionData.title,
    }
  );

  if (error) {
    logger.error("Error creating advancing session", error);
    return { success: false, error: error.message };
  }

  // The RPC returns the session data directly
  const result = data as { id: string };

  // Fetch the full session data using RPC (not direct query)
  // Since we don't have a get_advancing_session RPC, we'll return minimal data
  revalidatePath(`/${orgSlug}/shows/${sessionData.showId}/advancing`);

  return {
    success: true,
    data: { id: result.id } as AdvancingSession,
  };
}

// Fields Management
export const getAdvancingFields = cache(
  async (sessionId: string): Promise<AdvancingField[]> => {
    console.log("[advancing.ts] getAdvancingFields called", { sessionId });

    const supabase = await getSupabaseServer();

    try {
      // Use RPC to bypass RLS issues
      console.log("[advancing.ts] Calling get_advancing_fields RPC", {
        p_session_id: sessionId,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "get_advancing_fields",
        {
          p_session_id: sessionId,
        }
      );

      console.log("[advancing.ts] get_advancing_fields RPC response", {
        dataLength: data?.length,
        error,
        data: data,
      });

      if (error) {
        logger.error("Error fetching advancing fields", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("[advancing.ts] Exception in getAdvancingFields", error);
      logger.error("Exception in getAdvancingFields", error);
      return [];
    }
  }
);

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

export async function createAdvancingField(
  orgSlug: string,
  showIdOrSessionId: string,
  fieldData: {
    section: string;
    fieldName: string;
    fieldType: string;
    partyType: "from_us" | "from_you";
    value?: Json;
    sortOrder?: number;
  }
): Promise<{ success: boolean; error?: string; data?: AdvancingField }> {
  console.log("[advancing.ts] createAdvancingField called", {
    orgSlug,
    showIdOrSessionId,
    fieldData,
  });

  const supabase = await getSupabaseServer();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[advancing.ts] User not authenticated");
    return { success: false, error: "User not authenticated" };
  }

  console.log("[advancing.ts] User authenticated", user.id);

  // Get session ID from show ID (assuming showIdOrSessionId is a show ID)
  const sessionId = await getSessionIdByShowId(showIdOrSessionId);

  if (!sessionId) {
    logger.error("No session found for show", showIdOrSessionId);
    return {
      success: false,
      error: "No advancing session found for this show",
    };
  }

  try {
    // Use RPC to create/update field (bypasses RLS issues)
    console.log("[advancing.ts] Calling create_advancing_field RPC", {
      p_session_id: sessionId,
      p_section: fieldData.section,
      p_field_name: fieldData.fieldName,
      p_field_type: fieldData.fieldType,
      p_party_type: fieldData.partyType,
      p_value: fieldData.value,
      p_sort_order: fieldData.sortOrder || 1000,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "create_advancing_field",
      {
        p_session_id: sessionId,
        p_section: fieldData.section,
        p_field_name: fieldData.fieldName,
        p_field_type: fieldData.fieldType,
        p_party_type: fieldData.partyType,
        p_value: fieldData.value || null,
        p_sort_order: fieldData.sortOrder || 1000,
      }
    );

    console.log("[advancing.ts] RPC response", {
      rpcData,
      rpcError,
    });

    if (rpcError) {
      logger.error("Error creating advancing field via RPC", rpcError);
      return { success: false, error: rpcError.message };
    }

    const result = rpcData as {
      success: boolean;
      field_id: string;
      show_id: string;
    };

    console.log("[advancing.ts] Parsed result", result);

    // Revalidate both advancing and day pages
    if (result.show_id) {
      console.log("[advancing.ts] Revalidating paths", {
        advancingPath: `/${orgSlug}/shows/${result.show_id}/advancing/${sessionId}`,
        dayPath: `/${orgSlug}/shows/${result.show_id}/day`,
      });

      revalidatePath(
        `/${orgSlug}/shows/${result.show_id}/advancing/${sessionId}`
      );
      revalidatePath(`/${orgSlug}/shows/${result.show_id}/day`);
    }

    console.log("[advancing.ts] Returning success", {
      field_id: result.field_id,
    });

    return {
      success: true,
      data: { id: result.field_id } as AdvancingField,
    };
  } catch (error) {
    console.error("[advancing.ts] Exception in createAdvancingField", error);
    logger.error("Error in createAdvancingField", error);
    return { success: false, error: String(error) };
  }
}

export async function updateAdvancingField(
  orgSlug: string,
  sessionId: string,
  fieldId: string,
  updates: AdvancingFieldUpdate
): Promise<{ success: boolean; error?: string; data?: AdvancingField }> {
  console.log("[advancing.ts] updateAdvancingField called", {
    orgSlug,
    sessionId,
    fieldId,
    updates,
  });

  const supabase = await getSupabaseServer();

  // Use RPC to update field (bypasses RLS issues)
  console.log("[advancing.ts] Calling update_advancing_field RPC", {
    p_session_id: sessionId,
    p_field_id: fieldId,
    p_value: updates.value,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
    "update_advancing_field",
    {
      p_session_id: sessionId,
      p_field_id: fieldId,
      p_value: updates.value || null,
    }
  );

  console.log("[advancing.ts] RPC response", {
    rpcData,
    rpcError,
  });

  if (rpcError) {
    logger.error("Error updating advancing field via RPC", rpcError);
    return { success: false, error: rpcError.message };
  }

  const result = rpcData as {
    success: boolean;
    field_id: string;
    show_id: string;
  };

  console.log("[advancing.ts] Parsed result", result);

  // Revalidate both advancing and day pages
  if (result.show_id) {
    console.log("[advancing.ts] Revalidating paths", {
      advancingPath: `/${orgSlug}/shows/${result.show_id}/advancing/${sessionId}`,
      dayPath: `/${orgSlug}/shows/${result.show_id}/day`,
    });

    revalidatePath(
      `/${orgSlug}/shows/${result.show_id}/advancing/${sessionId}`
    );
    revalidatePath(`/${orgSlug}/shows/${result.show_id}/day`);
  }

  console.log("[advancing.ts] Returning success", {
    field_id: result.field_id,
  });

  return {
    success: true,
    data: { id: result.field_id } as AdvancingField,
  };
}

// Comment Management
export async function getAdvancingComments(
  fieldId: string
): Promise<AdvancingComment[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("advancing_comments")
    .select("*")
    .eq("field_id", fieldId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Error fetching advancing comments", error);
    return [];
  }

  return data || [];
}

export async function createAdvancingComment(
  orgSlug: string,
  sessionId: string,
  fieldId: string,
  body: string,
  authorName?: string
): Promise<{ success: boolean; error?: string; data?: AdvancingComment }> {
  const supabase = await getSupabaseServer();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get org_id and show_id from session
  const { data: session, error: sessionError } = await supabase
    .from("advancing_sessions")
    .select("org_id, show_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Session not found" };
  }

  const { data, error } = await supabase
    .from("advancing_comments")
    .insert({
      org_id: session.org_id,
      field_id: fieldId,
      author_id: user?.id || null,
      author_name: authorName || user?.email || "Anonymous",
      body,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating advancing comment", error);
    return { success: false, error: error.message };
  }

  if (session.show_id) {
    revalidatePath(
      `/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`
    );
  }

  return { success: true, data };
}

// Document Management
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

export async function getAdvancingDocuments(
  showIdOrSessionId: string
): Promise<AdvancingDocumentWithFiles[]> {
  const supabase = await getSupabaseServer();

  // Get session ID from show ID
  const sessionId = await getSessionIdByShowId(showIdOrSessionId);

  if (!sessionId) {
    logger.error("No session found for show", showIdOrSessionId);
    return [];
  }

  try {
    // Use RPC to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_advancing_documents",
      {
        p_session_id: sessionId,
      }
    );

    if (error) {
      logger.error("Error fetching advancing documents", error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Exception in getAdvancingDocuments", error);
    return [];
  }
}

export async function createAdvancingDocument(
  orgSlug: string,
  showIdOrSessionId: string,
  partyType: "from_us" | "from_you",
  label?: string
): Promise<{ success: boolean; error?: string; data?: AdvancingDocument }> {
  const supabase = await getSupabaseServer();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

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
    // Use RPC to create document (bypasses RLS issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "create_advancing_document",
      {
        p_session_id: sessionId,
        p_party_type: partyType,
        p_label: label || null,
      }
    );

    if (error) {
      logger.error("Error creating advancing document", error);
      return { success: false, error: error.message };
    }

    // Get session to find show_id for revalidation
    const session = await getAdvancingSession(sessionId);
    if (session?.show_id) {
      revalidatePath(
        `/${orgSlug}/shows/${session.show_id}/advancing/${sessionId}`
      );
    }

    return { success: true, data };
  } catch (error) {
    logger.error("Exception in createAdvancingDocument", error);
    return { success: false, error: "Failed to create document" };
  }
}

export async function updateAdvancingDocument(
  orgSlug: string,
  sessionId: string,
  documentId: string,
  label: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "update_advancing_document",
      {
        p_document_id: documentId,
        p_label: label,
      }
    );

    if (error) {
      logger.error("Error updating advancing document", error);
      return { success: false, error: error.message };
    }

    // Revalidate using session_id from RPC response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((data as any)?.session_id) {
      revalidatePath(`/${orgSlug}/shows`);
      revalidatePath(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `/${orgSlug}/shows/[showId]/advancing/${(data as any).session_id}`
      );
    }

    return { success: true };
  } catch (error) {
    logger.error("Error in updateAdvancingDocument", error);
    return { success: false, error: String(error) };
  }
}

export async function deleteAdvancingDocument(
  orgSlug: string,
  sessionId: string,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "delete_advancing_document",
      {
        p_document_id: documentId,
      }
    );

    if (error) {
      logger.error("Error deleting advancing document", error);
      return { success: false, error: error.message };
    }

    // Revalidate using session_id from RPC response
    if (data && typeof data === "object" && "session_id" in data) {
      revalidatePath(`/${orgSlug}/shows`);
      revalidatePath(`/${orgSlug}/shows/[showId]/advancing/${sessionId}`);
    }

    return { success: true };
  } catch (error) {
    logger.error("Error in deleteAdvancingDocument", error);
    return { success: false, error: String(error) };
  }
}

// Grid Data Management - OPTIMIZED with cache
export const loadAdvancingGridData = cache(
  async (
    sessionId: string,
    gridType: "team" | "arrival_flight" | "departure_flight",
    teamMemberIds: string[]
  ): Promise<
    Array<{ id: string; [key: string]: string | number | boolean }>
  > => {
    try {
      // Use the existing getAdvancingFields RPC which already has auth checks
      const allFields = await getAdvancingFields(sessionId);

      // Filter to only fields matching this grid type
      const fields = allFields.filter((f) =>
        f.field_name.startsWith(`${gridType}_`)
      );

      // Group fields by row ID and build grid data
      const gridData: {
        [rowId: string]: {
          id: string;
          [key: string]: string | number | boolean;
        };
      } = {};

      teamMemberIds.forEach((memberId) => {
        const rowId = `${gridType}_${memberId}`;
        gridData[rowId] = { id: rowId };
      });

      fields?.forEach((field) => {
        // Parse field name: gridType_rowId_columnKey
        const parts = field.field_name.split("_");
        if (parts.length >= 3) {
          const rowId = parts.slice(0, -1).join("_"); // Everything except the last part
          const columnKey = parts[parts.length - 1]; // Last part is the column key

          if (gridData[rowId]) {
            gridData[rowId][columnKey] = String(field.value || "");
          }
        }
      });

      return Object.values(gridData);
    } catch (error) {
      logger.error("Error loading grid data", error);
      return teamMemberIds.map((id) => ({ id: `${gridType}_${id}` }));
    }
  }
);

export async function saveAdvancingGridData(
  orgSlug: string,
  sessionId: string,
  showId: string,
  gridType: "team" | "arrival_flight" | "departure_flight",
  gridData: Array<{ id: string; [key: string]: string | number | boolean }>,
  partyType: "from_us" | "from_you" = "from_you"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServer();

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get org using cached function
    const { data: org, error: orgError } = await getCachedOrg(orgSlug);

    if (orgError || !org) {
      return { success: false, error: "Organization not found" };
    }

    // Use RPC to save grid data (bypasses RLS issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("save_advancing_grid_data", {
      p_org_id: org.id,
      p_session_id: sessionId,
      p_grid_type: gridType,
      p_grid_data: gridData,
      p_party_type: partyType,
    });

    if (error) {
      logger.error("Error saving grid data via RPC", {
        error,
        org_id: org.id,
        session_id: sessionId,
        grid_type: gridType,
        party_type: partyType,
        data_count: gridData.length,
      });
      return { success: false, error: error.message };
    }

    // Generate schedule items if this is flight data
    if (gridType.includes("flight")) {
      try {
        await generateScheduleFromAdvancing(orgSlug, showId, sessionId);
      } catch (error) {
        logger.error("Failed to generate schedule from grid data", error);
        // Don't fail the save if schedule generation fails
      }
    }

    revalidatePath(`/${orgSlug}/shows/${showId}/advancing/${sessionId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error saving grid data", error);
    return { success: false, error: "Failed to save grid data" };
  }
}

// Access Code Verification (for external collaborators)
export async function verifyAccessCode(accessCode: string): Promise<{
  success: boolean;
  sessionId?: string;
  showId?: string;
  error?: string;
}> {
  const supabase = await getSupabaseServer();

  const accessCodeHash = crypto
    .createHash("sha256")
    .update(accessCode)
    .digest("hex");

  const { data: session, error } = await supabase
    .from("advancing_sessions")
    .select("id, show_id, expires_at")
    .eq("access_code_hash", accessCodeHash)
    .single();

  if (error || !session) {
    return { success: false, error: "Invalid access code" };
  }

  // Check if session has expired
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return { success: false, error: "Access code has expired" };
  }

  return { success: true, sessionId: session.id, showId: session.show_id };
}
