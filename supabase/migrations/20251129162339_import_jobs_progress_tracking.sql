-- Add progress tracking fields to import_jobs table for real-time worker updates
-- This enables the UI to show which section/file is currently being processed

ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}';

COMMENT ON COLUMN import_jobs.progress_data IS 'Real-time progress tracking: current_section, current_source, sections_completed, total_sections, etc.';

-- RPC to update job progress atomically (called by worker)
CREATE OR REPLACE FUNCTION app_update_import_job_progress(
  p_job_id UUID,
  p_progress_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE import_jobs
  SET
    progress_data = p_progress_data,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

COMMENT ON FUNCTION app_update_import_job_progress IS 'Update job progress_data atomically for worker visibility';
