// Input Validation Utilities

import { z } from "zod";
import { ValidationError } from "./errors";

// Generic validation function
export function validate<T>(schema: z.Schema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Validation failed", error.issues);
    }
    throw error;
  }
}

// Common validation schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const dateSchema = z
  .string()
  .datetime()
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Show validation schemas
export const createShowSchema = z.object({
  org_id: uuidSchema,
  title: z.string().min(1).max(255),
  date: z.string(),
  set_time: z.string().optional(),
  doors_at: z.string().optional(),
  venue_id: uuidSchema.optional(),
  notes: z.string().optional(),
  // Inline venue creation
  venue_name: z.string().optional(),
  venue_city: z.string().optional(),
  venue_state: z.string().optional(),
  venue_address: z.string().optional(),
});

export const updateShowSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  date: z.string().optional(),
  set_time: z.string().optional(),
  doors_at: z.string().optional(),
  venue_id: uuidSchema.optional(),
  notes: z.string().optional(),
});
