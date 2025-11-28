"use server";

// Re-export only the functions actually used by components
export { saveFlight } from "./flights";
export { saveLodging } from "./lodging";
export { saveCatering } from "./catering";
export { getAdvancingDocuments, createAdvancingDocument } from "./documents";
