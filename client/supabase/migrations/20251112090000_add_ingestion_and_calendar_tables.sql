-- Migration: Add AI ingestion tables and calendar sync metadata
-- Created: 2025-11-12

-- =====================================
-- PARSED EMAILS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS public.parsed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject text,
  from_email text,
  raw_content text,
  parsed_data jsonb,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'confirmed', 'rejected', 'failed')),
  confidence numeric(5,2),
  error text,
  show_id uuid REFERENCES public.shows(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parsed_emails_org_idx ON public.parsed_emails (org_id);
CREATE INDEX IF NOT EXISTS parsed_emails_status_idx ON public.parsed_emails (status);
CREATE INDEX IF NOT EXISTS parsed_emails_from_idx ON public.parsed_emails (from_email);
CREATE INDEX IF NOT EXISTS parsed_emails_created_idx ON public.parsed_emails (created_at DESC);

COMMENT ON TABLE public.parsed_emails IS 'AI parsed tour offer emails awaiting human review';
COMMENT ON COLUMN public.parsed_emails.parsed_data IS 'Structured JSON payload with show, venue, and contact details';

CREATE OR REPLACE TRIGGER trg_parsed_emails_updated_at
  BEFORE UPDATE ON public.parsed_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.parsed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parsed_emails_select ON public.parsed_emails;
CREATE POLICY parsed_emails_select ON public.parsed_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = parsed_emails.org_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS parsed_emails_modify ON public.parsed_emails;
CREATE POLICY parsed_emails_modify ON public.parsed_emails
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = parsed_emails.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'editor')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = parsed_emails.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS parsed_emails_service_role_all ON public.parsed_emails;
CREATE POLICY parsed_emails_service_role_all ON public.parsed_emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================
-- PARSED CONTRACTS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS public.parsed_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text,
  file_url text,
  parsed_data jsonb,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'reviewed', 'rejected', 'failed')),
  confidence numeric(5,2),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parsed_contracts_org_idx ON public.parsed_contracts (org_id);
CREATE INDEX IF NOT EXISTS parsed_contracts_status_idx ON public.parsed_contracts (status);
CREATE INDEX IF NOT EXISTS parsed_contracts_created_idx ON public.parsed_contracts (created_at DESC);

COMMENT ON TABLE public.parsed_contracts IS 'AI parsed contract artifacts awaiting review and approval';

CREATE OR REPLACE TRIGGER trg_parsed_contracts_updated_at
  BEFORE UPDATE ON public.parsed_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.parsed_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parsed_contracts_select ON public.parsed_contracts;
CREATE POLICY parsed_contracts_select ON public.parsed_contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = parsed_contracts.org_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS parsed_contracts_modify ON public.parsed_contracts;
CREATE POLICY parsed_contracts_modify ON public.parsed_contracts
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = parsed_contracts.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'editor')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = parsed_contracts.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS parsed_contracts_service_role_all ON public.parsed_contracts;
CREATE POLICY parsed_contracts_service_role_all ON public.parsed_contracts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================
-- CALENDAR SYNC SOURCES
-- =====================================

CREATE TABLE IF NOT EXISTS public.calendar_sync_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  sync_interval_minutes integer NOT NULL DEFAULT 60 CHECK (sync_interval_minutes >= 15),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_synced_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_sync_sources_org_idx ON public.calendar_sync_sources (org_id);
CREATE INDEX IF NOT EXISTS calendar_sync_sources_status_idx ON public.calendar_sync_sources (status);

COMMENT ON TABLE public.calendar_sync_sources IS 'External calendar feeds linked to an organization for automated sync';

CREATE OR REPLACE TRIGGER trg_calendar_sync_sources_updated_at
  BEFORE UPDATE ON public.calendar_sync_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.calendar_sync_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_sync_sources_select ON public.calendar_sync_sources;
CREATE POLICY calendar_sync_sources_select ON public.calendar_sync_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = calendar_sync_sources.org_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS calendar_sync_sources_modify ON public.calendar_sync_sources;
CREATE POLICY calendar_sync_sources_modify ON public.calendar_sync_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = calendar_sync_sources.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'editor')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = calendar_sync_sources.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS calendar_sync_sources_service_role_all ON public.calendar_sync_sources;
CREATE POLICY calendar_sync_sources_service_role_all ON public.calendar_sync_sources
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================
-- CALENDAR SYNC RUN LOGS
-- =====================================

CREATE TABLE IF NOT EXISTS public.calendar_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.calendar_sync_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  message text,
  events_processed integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_sync_runs_source_idx ON public.calendar_sync_runs (source_id);
CREATE INDEX IF NOT EXISTS calendar_sync_runs_status_idx ON public.calendar_sync_runs (status);

COMMENT ON TABLE public.calendar_sync_runs IS 'Execution log for background calendar sync jobs';

ALTER TABLE public.calendar_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_sync_runs_select ON public.calendar_sync_runs;
CREATE POLICY calendar_sync_runs_select ON public.calendar_sync_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.calendar_sync_sources css
      JOIN public.org_members om ON om.org_id = css.org_id
      WHERE css.id = calendar_sync_runs.source_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS calendar_sync_runs_service_role_all ON public.calendar_sync_runs;
CREATE POLICY calendar_sync_runs_service_role_all ON public.calendar_sync_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

