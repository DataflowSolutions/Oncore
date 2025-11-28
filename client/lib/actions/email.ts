"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { parseForwardedEmail } from "@/lib/services/email-parser";

type ParsedEmailRow = Database["public"]["Tables"]["parsed_emails"]["Row"];

const parseEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  from: z.string().email().optional(),
  orgId: z.string().uuid(),
});

const confirmParsedEmailSchema = z.object({
  emailId: z.string().uuid(),
  showData: z.object({
    title: z.string(),
    date: z.string(),
    venueId: z.string().uuid().optional(),
    fee: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === null || val === "") return null;
        const num = typeof val === "string" ? Number.parseFloat(val) : val;
        return Number.isFinite(num) ? num : null;
      }),
    feeCurrency: z.string().default("USD").optional(),
    notes: z.string().optional(),
  }),
  createVenue: z.boolean().default(false),
  venueData: z
    .object({
      name: z.string(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      capacity: z.number().optional(),
    })
    .optional(),
});

const rejectParsedEmailSchema = z.object({
  emailId: z.string().uuid(),
  orgId: z.string().uuid(),
  reason: z.string().optional(),
});

const MEMBER_ROLES = new Set(["owner", "admin", "editor"]);

async function getOrgSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc("get_org_by_id", {
    p_org_id: orgId,
  });

  return data?.slug ?? null;
}

async function ensureCanManageOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership, error } = await (supabase as any).rpc('get_org_membership', {
    p_org_id: orgId,
  });

  if (error) {
    logger.error("Error checking org membership", error);
    throw new Error("Unable to verify organization membership");
  }

  if (!membership || !MEMBER_ROLES.has(membership.role)) {
    throw new Error("You do not have permission to manage this organization");
  }
}

export async function parseEmail(input: z.infer<typeof parseEmailSchema>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const validation = parseEmailSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { subject, body, from, orgId } = validation.data;

  try {
    await ensureCanManageOrg(supabase, orgId);
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }

  const emailContent = `Subject: ${subject}\n\nFrom: ${from ?? "Unknown"}\n\n${body}`;
  let parsed;
  let parseError: string | null = null;

  try {
    parsed = await parseForwardedEmail(emailContent);
  } catch (error) {
    const err = error as Error;
    logger.error("Gemini email parsing failure", err);
    parseError = err.message ?? "Failed to parse email";
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: emailId, error: insertError } = await (supabase as any).rpc(
      "insert_parsed_email",
      {
        p_org_id: orgId,
        p_subject: subject,
        p_from_email: from ?? null,
        p_raw_content: body,
        p_parsed_data: parsed ?? null,
        p_status: parseError ? "failed" : "pending_review",
        p_confidence: parsed?.showDetails?.confidence ?? null,
        p_created_by: session.user.id,
        p_error: parseError,
      }
    );

    if (insertError) {
      logger.error("Failed to store parsed email", insertError);
      return { success: false, error: "Unable to store parsed email" };
    }

    const slug = await getOrgSlug(supabase, orgId);
    if (slug) {
      revalidatePath(`/${slug}/ingestion`);
    }

    if (parseError) {
      return { success: false, error: parseError };
    }

    return {
      success: true,
      data: {
        emailId: emailId,
        parsed,
      },
    };
  } catch (error) {
    const err = error as Error;
    logger.error("Error saving parsed email", err);
    return { success: false, error: err.message || "Failed to parse email" };
  }
}

export async function confirmParsedEmail(
  input: z.infer<typeof confirmParsedEmailSchema>,
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const validation = confirmParsedEmailSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { emailId, showData, createVenue, venueData } = validation.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: parsedEmailData, error: fetchError } = await (supabase as any).rpc(
    "get_parsed_email_by_id",
    { p_email_id: emailId }
  );

  if (fetchError || !parsedEmailData || parsedEmailData.length === 0) {
    logger.error("Parsed email lookup failed", fetchError);
    return { success: false, error: "Parsed email not found" };
  }

  const parsedEmail = parsedEmailData[0];

  if (parsedEmail.status !== "pending_review") {
    return { success: false, error: "This email has already been reviewed" };
  }

  try {
    await ensureCanManageOrg(supabase, parsedEmail.org_id);
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }

  // app_create_show RPC will handle venue creation if needed
  const venueId = showData.venueId ?? null;
  const showDate = showData.date;

  // Create show (app_create_show RPC handles venue creation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: createdShow, error: showError } = await (supabase as any).rpc(
    "app_create_show",
    {
      p_org_id: parsedEmail.org_id,
      p_title: showData.title,
      p_date: showDate,
      p_venue_id: venueId,
      p_venue_name: venueId ? null : (createVenue && venueData?.name) ?? null,
      p_venue_city: venueId ? null : (createVenue && venueData?.city) ?? null,
      p_venue_address: venueId ? null : (createVenue && venueData?.address) ?? null,
      p_set_time: null,
      p_notes: showData.notes ?? null,
    },
  );

  if (showError) {
    logger.error("Failed to create show from parsed email", showError);
    return {
      success: false,
      error: showError.message || "Failed to create show",
    };
  }

  const showRecord = createdShow as Database["public"]["Tables"]["shows"]["Row"];

  // Update parsed email status using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any).rpc(
    "update_parsed_email_status",
    {
      p_email_id: emailId,
      p_org_id: parsedEmail.org_id,
      p_status: "confirmed",
      p_reviewed_by: session.user.id,
      p_error: null,
      p_show_id: showRecord.id,
    }
  );

  if (updateError) {
    logger.error("Failed to update parsed email status", updateError);
  }

  if (updateError) {
    logger.error("Failed to update parsed email status", updateError);
  }

  const slug = await getOrgSlug(supabase, parsedEmail.org_id);
  if (slug) {
    revalidatePath(`/${slug}/ingestion`);
    revalidatePath(`/${slug}/shows`);
    revalidatePath(`/${slug}/shows/${showRecord.id}`);
  }

  return {
    success: true,
    data: {
      showId: showRecord.id,
    },
  };
}

export async function rejectParsedEmail(
  input: z.infer<typeof rejectParsedEmailSchema>,
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const validation = rejectParsedEmailSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { emailId, orgId, reason } = validation.data;

  try {
    await ensureCanManageOrg(supabase, orgId);
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: success, error } = await (supabase as any).rpc(
    "update_parsed_email_status",
    {
      p_email_id: emailId,
      p_org_id: orgId,
      p_status: "rejected",
      p_reviewed_by: session.user.id,
      p_error: reason ?? null,
    }
  );

  if (error) {
    logger.error("Failed to reject parsed email", error);
    return { success: false, error: error.message };
  }

  if (!success) {
    return { success: false, error: "Email not found or already processed" };
  }

  const slug = await getOrgSlug(supabase, orgId);
  if (slug) {
    revalidatePath(`/${slug}/ingestion`);
  }

  return { success: true };
}

export async function getParsedEmails(orgId: string) {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_parsed_emails', { p_org_id: orgId });

  if (error) {
    logger.error("Failed to fetch parsed emails", error);
    return [] as ParsedEmailRow[];
  }

  return (data ?? []) as ParsedEmailRow[];
}
