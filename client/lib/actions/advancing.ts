"use server";

/**
 * Advancing Actions - Main entry point
 * 
 * This file re-exports server actions for the advancing system.
 * Only exports functions that are actually used by components.
 */

// Flight actions
import { saveFlight } from "./advancing/flights";

// Lodging actions
import { saveLodging } from "./advancing/lodging";

// Catering actions
import { saveCatering } from "./advancing/catering";

// Document actions
import {
  getAdvancingDocuments as _getAdvancingDocuments,
  createAdvancingDocument,
} from "./advancing/documents";

// Re-export async functions directly
export {
  saveFlight,
  saveLodging,
  saveCatering,
  createAdvancingDocument,
};

// Wrap cached function for "use server" compatibility
export async function getAdvancingDocuments(showId: string) {
  return _getAdvancingDocuments(showId);
}
