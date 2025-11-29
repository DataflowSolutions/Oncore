// Re-export all import components and types
export { ImportConfirmationPage } from "./ImportConfirmationPage";
export { FormField } from "./FormField";
export { FormTextarea } from "./FormTextarea";
export { SectionContainer } from "./SectionContainer";

// Section components
export {
  GeneralSection,
  DealSection,
  HotelSection,
  FoodSection,
  FlightsSection,
  ActivitiesSection,
  DocumentsSection,
  ContactsSection,
  TechnicalSection,
} from "./sections";

// Types
export type {
  ImportData,
  ImportedGeneral,
  ImportedDeal,
  ImportedHotel,
  ImportedFood,
  ImportedFlight,
  ImportedActivity,
  ImportedDocument,
  ImportedContact,
  ImportedTechnical,
  DocumentCategory,
  ImportSection,
  ImportSectionKey,
} from "./types";

export {
  IMPORT_SECTIONS,
  DOCUMENT_CATEGORIES,
  createEmptyImportData,
  createEmptyGeneral,
  createEmptyDeal,
  createEmptyHotel,
  createEmptyFood,
  createEmptyFlight,
  createEmptyActivity,
  createEmptyDocument,
  createEmptyContact,
  createEmptyTechnical,
} from "./types";
