-- Add missing flight fact types to import_fact_type enum
-- Only add flight_date and flight_notes which aren't in other migrations

DO $$
BEGIN
  BEGIN
    ALTER TYPE import_fact_type ADD VALUE 'flight_date';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE import_fact_type ADD VALUE 'flight_notes';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
