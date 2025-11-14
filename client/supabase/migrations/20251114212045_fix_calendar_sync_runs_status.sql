-- Fix calendar_sync_runs status constraint to include 'running'

-- Drop existing constraint
ALTER TABLE public.calendar_sync_runs 
DROP CONSTRAINT IF EXISTS calendar_sync_runs_status_check;

-- Add new constraint with 'running' included
ALTER TABLE public.calendar_sync_runs
ADD CONSTRAINT calendar_sync_runs_status_check 
CHECK (status IN ('running', 'success', 'failed'));
