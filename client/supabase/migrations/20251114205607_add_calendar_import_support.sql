-- Add external_calendar_id column to schedule_items for calendar sync
-- This allows tracking which schedule items came from external calendars

ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS external_calendar_id TEXT;

-- Add unique constraint to prevent duplicate imports
CREATE UNIQUE INDEX IF NOT EXISTS schedule_items_external_calendar_id_unique 
ON public.schedule_items (org_id, external_calendar_id) 
WHERE external_calendar_id IS NOT NULL;

-- Add index for faster lookups when syncing
CREATE INDEX IF NOT EXISTS schedule_items_external_calendar_id_idx 
ON public.schedule_items (external_calendar_id) 
WHERE external_calendar_id IS NOT NULL;

COMMENT ON COLUMN public.schedule_items.external_calendar_id IS 
'UID from external calendar (iCal) to prevent duplicate imports during sync';
