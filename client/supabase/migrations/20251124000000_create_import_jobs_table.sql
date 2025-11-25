-- Create import_jobs table for managing show import workflow
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'needs_review', 'completed')),
  raw_text TEXT,
  normalized_text TEXT,
  parsed_json JSONB,
  confidence_map JSONB,
  duplicate_matches JSONB,
  source_file_metadata JSONB,
  extracted_artist TEXT,
  extraction_mode TEXT CHECK (extraction_mode IN ('rule_based', 'ai_assisted')),
  errors JSONB,
  previous_attempts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_import_jobs_org_id ON import_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(org_id, status);

-- Enable RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access import jobs from their organization
CREATE POLICY "Users can view import jobs from their org"
  ON import_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = import_jobs.org_id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert import jobs to their org"
  ON import_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = import_jobs.org_id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update import jobs in their org"
  ON import_jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = import_jobs.org_id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete import jobs from their org"
  ON import_jobs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = import_jobs.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_import_jobs_updated_at();

COMMENT ON TABLE import_jobs IS 'Manages the workflow for importing shows from various file formats';
