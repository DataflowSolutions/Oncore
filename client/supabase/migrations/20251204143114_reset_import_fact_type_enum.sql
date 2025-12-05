-- =============================================================================
-- RESET import_fact_type ENUM
-- =============================================================================
-- This migration drops all dependent objects and recreates the enum with a
-- clean, consistent snake_case naming convention.
-- =============================================================================

-- Drop dependent tables first (they will be recreated)
DROP TABLE IF EXISTS import_resolutions CASCADE;
DROP TABLE IF EXISTS import_facts CASCADE;

-- Drop the old enum
DROP TYPE IF EXISTS import_fact_type CASCADE;

-- =============================================================================
-- CREATE NEW ENUM WITH CONSISTENT SNAKE_CASE NAMING
-- =============================================================================

CREATE TYPE import_fact_type AS ENUM (
  -- =========================================================================
  -- GENERAL SECTION
  -- =========================================================================
  'general_artist',
  'general_event_name',
  'general_venue',
  'general_date',
  'general_set_time',
  'general_city',
  'general_country',

  -- =========================================================================
  -- DEAL SECTION
  -- =========================================================================
  'deal_fee',
  'deal_currency',
  'deal_payment_terms',
  'deal_deal_type',
  'deal_notes',

  -- =========================================================================
  -- HOTEL SECTION
  -- =========================================================================
  'hotel_name',
  'hotel_address',
  'hotel_city',
  'hotel_country',
  'hotel_checkin_date',
  'hotel_checkin_time',
  'hotel_checkout_date',
  'hotel_checkout_time',
  'hotel_booking_reference',
  'hotel_phone',
  'hotel_email',
  'hotel_notes',

  -- =========================================================================
  -- FLIGHT SECTION (keys only - API enrichment handles details)
  -- =========================================================================
  'flight_number',
  'flight_date',
  'flight_passenger_name',
  'flight_ticket_number',
  'flight_booking_reference',
  'flight_seat',
  'flight_travel_class',
  'flight_notes',

  -- =========================================================================
  -- FOOD/CATERING SECTION
  -- =========================================================================
  'food_name',
  'food_address',
  'food_city',
  'food_country',
  'food_booking_reference',
  'food_phone',
  'food_email',
  'food_service_date',
  'food_service_time',
  'food_guest_count',
  'food_notes',

  -- =========================================================================
  -- ACTIVITY SECTION
  -- =========================================================================
  'activity_name',
  'activity_location',
  'activity_start_time',
  'activity_end_time',
  'activity_has_destination',
  'activity_destination_name',
  'activity_destination_location',
  'activity_notes',

  -- =========================================================================
  -- CONTACT SECTION
  -- =========================================================================
  'contact_name',
  'contact_phone',
  'contact_email',
  'contact_role',

  -- =========================================================================
  -- TECHNICAL SECTION
  -- =========================================================================
  'technical_equipment',
  'technical_backline',
  'technical_stage_setup',
  'technical_lighting',
  'technical_soundcheck',
  'technical_other',

  -- =========================================================================
  -- DOCUMENT SECTION
  -- =========================================================================
  'document_category',

  -- =========================================================================
  -- FALLBACK
  -- =========================================================================
  'other'
);

-- =============================================================================
-- RECREATE import_facts TABLE
-- =============================================================================

CREATE TABLE import_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  show_id uuid REFERENCES shows(id) ON DELETE SET NULL,
  
  -- Ordering within the source
  message_index integer NOT NULL DEFAULT 0,
  chunk_index integer NOT NULL DEFAULT 0,
  source_id text,
  source_file_name text,
  source_scope text, -- contract_main, itinerary, confirmation, rider_example, general_info, unknown
  
  -- Speaker attribution
  speaker_role import_fact_speaker NOT NULL DEFAULT 'unknown',
  speaker_name text,
  
  -- Fact classification
  fact_type import_fact_type NOT NULL,
  fact_domain text, -- Optional grouping key (e.g., "hotel_1", "flight_artist")
  
  -- The actual value
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date date,
  value_time time,
  value_datetime timestamptz,
  
  -- Currency and units
  currency text,
  unit text,
  
  -- Cost direction
  direction import_fact_direction NOT NULL DEFAULT 'unknown',
  
  -- Negotiation status
  status import_fact_status NOT NULL DEFAULT 'unknown',
  
  -- References to other facts
  supersedes_fact_id uuid REFERENCES import_facts(id) ON DELETE SET NULL,
  related_fact_ids uuid[] DEFAULT '{}',
  
  -- AI confidence in this extraction
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  extraction_reason text,
  
  -- Selection state (set during Stage 2)
  is_selected boolean NOT NULL DEFAULT false,
  selection_reason text,
  selected_at timestamptz,
  
  -- Raw source snippet for auditability
  raw_snippet text,
  raw_snippet_start integer,
  raw_snippet_end integer,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_import_facts_job_id ON import_facts(job_id);
CREATE INDEX idx_import_facts_show_id ON import_facts(show_id);
CREATE INDEX idx_import_facts_fact_type ON import_facts(fact_type);
CREATE INDEX idx_import_facts_is_selected ON import_facts(is_selected);
CREATE INDEX idx_import_facts_job_type ON import_facts(job_id, fact_type);
CREATE INDEX idx_import_facts_job_selected ON import_facts(job_id, is_selected);

-- =============================================================================
-- RECREATE import_resolutions TABLE
-- =============================================================================

CREATE TABLE import_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  
  -- Resolution metadata
  fact_type import_fact_type NOT NULL,
  fact_domain text,
  
  -- Resolution result
  selected_fact_id uuid REFERENCES import_facts(id) ON DELETE SET NULL,
  resolution_state text NOT NULL, -- 'resolved', 'unagreed', 'conflicting', 'missing'
  resolution_reason text NOT NULL,
  
  -- Final value (copied from selected fact for convenience)
  final_value_text text,
  final_value_number numeric,
  final_value_date date,
  
  -- AI reasoning trace
  reasoning_trace jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_resolutions_job_id ON import_resolutions(job_id);
CREATE INDEX idx_import_resolutions_fact_type ON import_resolutions(fact_type);

-- =============================================================================
-- ENABLE RLS
-- =============================================================================

ALTER TABLE import_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_resolutions ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_facts
CREATE POLICY "import_facts_select_policy" ON import_facts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM import_jobs ij 
      WHERE ij.id = import_facts.job_id 
      AND is_org_member(ij.org_id)
    )
  );

CREATE POLICY "import_facts_insert_policy" ON import_facts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM import_jobs ij 
      WHERE ij.id = import_facts.job_id 
      AND is_org_member(ij.org_id)
    )
  );

CREATE POLICY "import_facts_update_policy" ON import_facts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM import_jobs ij 
      WHERE ij.id = import_facts.job_id 
      AND is_org_member(ij.org_id)
    )
  );

-- RLS policies for import_resolutions
CREATE POLICY "import_resolutions_select_policy" ON import_resolutions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM import_jobs ij 
      WHERE ij.id = import_resolutions.job_id 
      AND is_org_member(ij.org_id)
    )
  );

CREATE POLICY "import_resolutions_insert_policy" ON import_resolutions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM import_jobs ij 
      WHERE ij.id = import_resolutions.job_id 
      AND is_org_member(ij.org_id)
    )
  );

-- =============================================================================
-- RECREATE RPC FUNCTIONS
-- =============================================================================

-- RPC to insert extracted facts (batch insert for efficiency)
CREATE OR REPLACE FUNCTION app_insert_import_facts(
  p_job_id uuid,
  p_facts jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_fact jsonb;
BEGIN
  -- Verify job exists and caller has access
  IF NOT EXISTS (
    SELECT 1 FROM import_jobs ij 
    WHERE ij.id = p_job_id 
    AND is_org_member(ij.org_id)
  ) THEN
    RAISE EXCEPTION 'Access denied or job not found';
  END IF;

  -- Insert each fact
  FOR v_fact IN SELECT * FROM jsonb_array_elements(p_facts)
  LOOP
    INSERT INTO import_facts (
      job_id,
      message_index,
      chunk_index,
      source_id,
      source_file_name,
      source_scope,
      speaker_role,
      speaker_name,
      fact_type,
      fact_domain,
      value_text,
      value_number,
      value_boolean,
      value_date,
      value_time,
      value_datetime,
      currency,
      unit,
      direction,
      status,
      confidence,
      extraction_reason,
      raw_snippet,
      raw_snippet_start,
      raw_snippet_end
    ) VALUES (
      p_job_id,
      COALESCE((v_fact->>'message_index')::integer, 0),
      COALESCE((v_fact->>'chunk_index')::integer, 0),
      v_fact->>'source_id',
      v_fact->>'source_file_name',
      v_fact->>'source_scope',
      COALESCE((v_fact->>'speaker_role')::import_fact_speaker, 'unknown'),
      v_fact->>'speaker_name',
      (v_fact->>'fact_type')::import_fact_type,
      v_fact->>'fact_domain',
      v_fact->>'value_text',
      (v_fact->>'value_number')::numeric,
      (v_fact->>'value_boolean')::boolean,
      (v_fact->>'value_date')::date,
      (v_fact->>'value_time')::time,
      (v_fact->>'value_datetime')::timestamptz,
      v_fact->>'currency',
      v_fact->>'unit',
      COALESCE((v_fact->>'direction')::import_fact_direction, 'unknown'),
      COALESCE((v_fact->>'status')::import_fact_status, 'unknown'),
      (v_fact->>'confidence')::numeric,
      v_fact->>'extraction_reason',
      v_fact->>'raw_snippet',
      (v_fact->>'raw_snippet_start')::integer,
      (v_fact->>'raw_snippet_end')::integer
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- RPC to get all facts for a job
CREATE OR REPLACE FUNCTION app_get_import_facts(
  p_job_id uuid
) RETURNS SETOF import_facts
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.* 
  FROM import_facts f
  INNER JOIN import_jobs ij ON ij.id = f.job_id
  WHERE f.job_id = p_job_id
  AND is_org_member(ij.org_id)
  ORDER BY f.message_index, f.chunk_index, f.created_at;
$$;

-- RPC to mark facts as selected (Stage 2)
CREATE OR REPLACE FUNCTION app_select_import_facts(
  p_job_id uuid,
  p_selections jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_selection jsonb;
  v_fact_id uuid;
BEGIN
  -- Verify job exists and caller has access
  IF NOT EXISTS (
    SELECT 1 FROM import_jobs ij 
    WHERE ij.id = p_job_id 
    AND is_org_member(ij.org_id)
  ) THEN
    RAISE EXCEPTION 'Access denied or job not found';
  END IF;

  -- Process each selection
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_fact_id := (v_selection->>'fact_id')::uuid;
    
    IF v_fact_id IS NOT NULL THEN
      UPDATE import_facts
      SET 
        is_selected = true,
        selection_reason = v_selection->>'reason',
        selected_at = now(),
        updated_at = now()
      WHERE id = v_fact_id
      AND job_id = p_job_id;
      
      IF found THEN
        v_count := v_count + 1;
      END IF;
    END IF;
    
    -- Insert resolution record
    INSERT INTO import_resolutions (
      job_id,
      fact_type,
      fact_domain,
      selected_fact_id,
      resolution_state,
      resolution_reason,
      final_value_text,
      final_value_number,
      final_value_date,
      reasoning_trace
    )
    SELECT
      p_job_id,
      (v_selection->>'fact_type')::import_fact_type,
      v_selection->>'fact_domain',
      v_fact_id,
      COALESCE(v_selection->>'state', 'resolved'),
      COALESCE(v_selection->>'reason', 'Selected by semantic resolution'),
      v_selection->>'final_value_text',
      (v_selection->>'final_value_number')::numeric,
      (v_selection->>'final_value_date')::date,
      v_selection->'reasoning_trace';
  END LOOP;

  RETURN v_count;
END;
$$;

-- RPC to get resolutions for a job
CREATE OR REPLACE FUNCTION app_get_import_resolutions(
  p_job_id uuid
) RETURNS SETOF import_resolutions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.* 
  FROM import_resolutions r
  INNER JOIN import_jobs ij ON ij.id = r.job_id
  WHERE r.job_id = p_job_id
  AND is_org_member(ij.org_id)
  ORDER BY r.fact_type, r.created_at;
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE import_facts IS 'Stores candidate facts extracted during import Stage 1. Each row is a single claim from the source material.';
COMMENT ON TABLE import_resolutions IS 'Stores the semantic resolution decisions made during Stage 2 of import';
COMMENT ON TYPE import_fact_type IS 'Enum of all extractable fact types using consistent snake_case naming';
