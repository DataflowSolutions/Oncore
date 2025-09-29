-- Update RLS Policies with Billing Enforcement
-- Ensures expired/canceled orgs cannot make writes

-- =====================================
-- 1. UPDATE SHOWS POLICIES
-- =====================================
DROP POLICY IF EXISTS shows_insert ON shows;
CREATE POLICY shows_insert ON shows FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS shows_update ON shows;
CREATE POLICY shows_update ON shows FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS shows_delete ON shows;
CREATE POLICY shows_delete ON shows FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 2. UPDATE ARTISTS POLICIES
-- =====================================  
DROP POLICY IF EXISTS artists_insert ON artists;
CREATE POLICY artists_insert ON artists FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS artists_update ON artists;
CREATE POLICY artists_update ON artists FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS artists_delete ON artists;
CREATE POLICY artists_delete ON artists FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 3. UPDATE VENUES POLICIES
-- =====================================
DROP POLICY IF EXISTS venues_insert ON venues;
CREATE POLICY venues_insert ON venues FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS venues_update ON venues;
CREATE POLICY venues_update ON venues FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS venues_delete ON venues;
CREATE POLICY venues_delete ON venues FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 4. UPDATE PEOPLE POLICIES
-- =====================================
DROP POLICY IF EXISTS people_insert ON people;
CREATE POLICY people_insert ON people FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS people_update ON people;
CREATE POLICY people_update ON people FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS people_delete ON people;
CREATE POLICY people_delete ON people FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 5. UPDATE SCHEDULE ITEMS POLICIES
-- =====================================
DROP POLICY IF EXISTS schedule_items_insert ON schedule_items;
CREATE POLICY schedule_items_insert ON schedule_items FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS schedule_items_update ON schedule_items;
CREATE POLICY schedule_items_update ON schedule_items FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS schedule_items_delete ON schedule_items;
CREATE POLICY schedule_items_delete ON schedule_items FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 6. UPDATE ADVANCING SESSIONS POLICIES
-- =====================================
DROP POLICY IF EXISTS adv_sessions_insert ON advancing_sessions;
CREATE POLICY adv_sessions_insert ON advancing_sessions FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS adv_sessions_update ON advancing_sessions;
CREATE POLICY adv_sessions_update ON advancing_sessions FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS adv_sessions_delete ON advancing_sessions;
CREATE POLICY adv_sessions_delete ON advancing_sessions FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 7. UPDATE ADVANCING FIELDS POLICIES
-- =====================================
DROP POLICY IF EXISTS advancing_fields_insert ON advancing_fields;
CREATE POLICY advancing_fields_insert ON advancing_fields FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS advancing_fields_update ON advancing_fields;
CREATE POLICY advancing_fields_update ON advancing_fields FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS advancing_fields_delete ON advancing_fields;
CREATE POLICY advancing_fields_delete ON advancing_fields FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 8. UPDATE ADVANCING COMMENTS POLICIES
-- =====================================
DROP POLICY IF EXISTS advancing_comments_insert ON advancing_comments;
CREATE POLICY advancing_comments_insert ON advancing_comments FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS advancing_comments_update ON advancing_comments;
CREATE POLICY advancing_comments_update ON advancing_comments FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS advancing_comments_delete ON advancing_comments;
CREATE POLICY advancing_comments_delete ON advancing_comments FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 9. UPDATE ADVANCING DOCUMENTS POLICIES
-- =====================================
DROP POLICY IF EXISTS advancing_documents_insert ON advancing_documents;
CREATE POLICY advancing_documents_insert ON advancing_documents FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS advancing_documents_update ON advancing_documents;
CREATE POLICY advancing_documents_update ON advancing_documents FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS advancing_documents_delete ON advancing_documents;
CREATE POLICY advancing_documents_delete ON advancing_documents FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 10. UPDATE FILES POLICIES
-- =====================================
DROP POLICY IF EXISTS files_insert ON files;
CREATE POLICY files_insert ON files FOR INSERT 
  WITH CHECK (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS files_update ON files;
CREATE POLICY files_update ON files FOR UPDATE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

DROP POLICY IF EXISTS files_delete ON files;
CREATE POLICY files_delete ON files FOR DELETE 
  USING (is_org_editor(org_id) AND org_is_active(org_id));

-- =====================================
-- 11. UPDATE ORG MEMBERS POLICIES (SEAT LIMITS)
-- =====================================
-- Add seat checking to org member invites
DROP POLICY IF EXISTS org_members_insert ON org_members;
CREATE POLICY org_members_insert ON org_members FOR INSERT 
  WITH CHECK (
    -- Must be owner/admin of the org
    EXISTS (
      SELECT 1 FROM org_members existing
      WHERE existing.org_id = org_members.org_id
        AND existing.user_id = auth.uid()
        AND existing.role IN ('owner', 'admin')
    )
    -- Org must be active
    AND org_is_active(org_members.org_id)
    -- Must not exceed member limit
    AND (
      SELECT members_used 
      FROM org_seat_usage 
      WHERE org_id = org_members.org_id
    ) < COALESCE(
      (org_entitlements(org_members.org_id)->>'max_members')::int,
      1000000
    )
  );

-- =====================================
-- 12. ADD BILLING VALIDATION FUNCTION
-- =====================================
-- Helper to check if an action would exceed limits
CREATE OR REPLACE FUNCTION check_org_limits(
  p_org_id uuid,
  p_check_type text, -- 'members', 'collaborators', 'artists'
  p_additional_count int DEFAULT 1
) RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_entitlements jsonb;
  v_current_usage int;
  v_limit int;
BEGIN
  -- Get org entitlements
  v_entitlements := org_entitlements(p_org_id);
  
  -- Check the specific limit
  CASE p_check_type
    WHEN 'members' THEN
      SELECT members_used INTO v_current_usage FROM org_seat_usage WHERE org_id = p_org_id;
      v_limit := COALESCE((v_entitlements->>'max_members')::int, 1000000);
    WHEN 'collaborators' THEN
      SELECT collaborators_used INTO v_current_usage FROM org_seat_usage WHERE org_id = p_org_id;
      v_limit := COALESCE((v_entitlements->>'max_collaborators')::int, 1000000);
    WHEN 'artists' THEN
      SELECT artists_used INTO v_current_usage FROM org_seat_usage WHERE org_id = p_org_id;
      v_limit := COALESCE((v_entitlements->>'max_artists')::int, 1000000);
    ELSE
      RAISE EXCEPTION 'Invalid check_type: %', p_check_type;
  END CASE;
  
  RETURN (v_current_usage + p_additional_count) <= v_limit;
END;
$$;