-- Billing & Subscription System Migration
-- Implements subscription plans, seat limits, and billing enforcement

-- =====================================
-- 0. ENABLE REQUIRED EXTENSIONS
-- =====================================
CREATE EXTENSION IF NOT EXISTS citext;

-- =====================================
-- 1. BILLING PLANS (STATIC CATALOG)
-- =====================================
-- One row per plan (seed once)
CREATE TABLE billing_plans (
  id text PRIMARY KEY,                 -- 'crew_readonly' | 'solo_artist' | 'team_manager' | 'enterprise'
  name text NOT NULL,
  description text,
  price_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  max_artists int,                     -- null = unlimited
  max_members int,                     -- org members (owner/admin/editor/viewer)
  max_collaborators int,               -- external promoters allowed
  features jsonb NOT NULL DEFAULT '{}', -- e.g. {"advancing":true,"mobile":true}
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================
-- 2. ORG SUBSCRIPTIONS (ONE PER ORG)
-- =====================================
-- One active subscription per org
CREATE TABLE org_subscriptions (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES billing_plans(id),
  status text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','incomplete')),
  stripe_customer_id text,             -- null for now (no Stripe yet)
  stripe_subscription_id text,         -- null for now
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================
-- 3. SEAT ACCOUNTING (OPTIONAL)
-- =====================================
-- Seat tracking for audits/overages
CREATE TABLE org_seats (
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  seat_type text NOT NULL CHECK (seat_type IN ('member','collaborator','readonly')),
  used int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, seat_type)
);

-- =====================================
-- 4. FEATURE OVERRIDES (ENTERPRISE/PROMOS)
-- =====================================
-- Feature overrides for enterprise/custom deals
CREATE TABLE org_feature_overrides (
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,                  -- e.g. 'max_artists','advancing'
  value jsonb NOT NULL,               -- numbers or booleans
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, key)
);

-- =====================================
-- 5. SEED BILLING PLANS
-- =====================================
INSERT INTO billing_plans (id, name, description, price_cents, max_artists, max_members, max_collaborators, features) VALUES
  ('crew_readonly', 'Crew Read-Only', 'View-only access for crew members', 900, 1, 5, 0, '{"advancing": false, "mobile": true, "editing": false}'),
  ('solo_artist', 'Solo Artist', 'Perfect for single artists and small teams', 2900, 1, 3, 10, '{"advancing": true, "mobile": true, "editing": true, "team_management": false}'),
  ('team_manager', 'Team Manager', 'Full features for tour managers and multi-artist teams', 9900, null, 10, 50, '{"advancing": true, "mobile": true, "editing": true, "team_management": true, "reporting": true}'),
  ('enterprise', 'Enterprise', 'Custom pricing for large organizations', 0, null, null, null, '{"advancing": true, "mobile": true, "editing": true, "team_management": true, "reporting": true, "custom_integrations": true}');

-- =====================================
-- 6. RLS HELPER FUNCTIONS
-- =====================================
-- Is org in good standing to use the app?
CREATE OR REPLACE FUNCTION org_is_active(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_subscriptions s
    WHERE s.org_id = p_org
      AND s.status IN ('trialing','active','past_due') -- allow grace period
      AND COALESCE(s.current_period_end, now() + INTERVAL '1 day') > now()
  );
$$;

-- Resolve plan entitlements for an org (plan + overrides)
CREATE OR REPLACE FUNCTION org_entitlements(p_org uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT bp.features
         || jsonb_build_object(
              'max_artists', bp.max_artists,
              'max_members', bp.max_members,
              'max_collaborators', bp.max_collaborators
            ) AS feats
    FROM org_subscriptions s
    JOIN billing_plans bp ON bp.id = s.plan_id
    WHERE s.org_id = p_org
  ),
  merged AS (
    SELECT jsonb_object_agg(o.key, o.value) AS overrides
    FROM org_feature_overrides o
    WHERE o.org_id = p_org
  )
  SELECT COALESCE((SELECT feats FROM base),'{}'::jsonb)
         || COALESCE((SELECT overrides FROM merged),'{}'::jsonb);
$$;

-- =====================================
-- 7. SEAT USAGE VIEW
-- =====================================
-- Seat counters (simple view for SSR / validations)
CREATE OR REPLACE VIEW org_seat_usage AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  -- members = org_members count
  (SELECT count(*) FROM org_members m WHERE m.org_id = o.id) AS members_used,
  -- collaborators = distinct accepted collaborators on org's shows
  (SELECT count(DISTINCT sc.user_id) 
     FROM shows sh 
     JOIN show_collaborators sc ON sc.show_id = sh.id AND sc.user_id IS NOT NULL
    WHERE sh.org_id = o.id) AS collaborators_used,
  -- artists count
  (SELECT count(*) FROM artists a WHERE a.org_id = o.id) AS artists_used
FROM organizations o;

-- =====================================
-- 8. SEAT-AWARE INVITE FUNCTION
-- =====================================
-- Collaborator invite with seat limit enforcement
CREATE OR REPLACE FUNCTION app_invite_collaborator(
  p_show_id uuid,
  p_email citext,
  p_role show_collab_role DEFAULT 'promoter_editor'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org uuid;
  v_limit int;
  v_used int;
  new_id uuid;
BEGIN
  -- Get org from show
  SELECT org_id INTO v_org FROM shows WHERE id = p_show_id;
  
  -- Check permissions
  IF NOT is_org_editor(v_org) OR NOT org_is_active(v_org) THEN
    RAISE EXCEPTION 'Not authorized or subscription inactive';
  END IF;

  -- Check collaborator seat limit
  v_limit := COALESCE((org_entitlements(v_org)->>'max_collaborators')::int, 1000000);
  SELECT collaborators_used INTO v_used FROM org_seat_usage WHERE org_id = v_org;
  
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Collaborator limit reached (% of %). Please upgrade your plan.', v_used, v_limit;
  END IF;

  -- Create the invite
  INSERT INTO show_collaborators (show_id, email, role, invited_by, org_id, status)
  VALUES (p_show_id, p_email, p_role, auth.uid(), v_org, 'invited')
  RETURNING id INTO new_id;

  -- Log activity
  PERFORM app_log_activity(
    v_org,
    'collaborator_invited',
    'show_collaborator',
    new_id,
    jsonb_build_object('email', p_email, 'role', p_role, 'show_id', p_show_id)
  );

  RETURN new_id;
END;
$$;

-- =====================================
-- 9. ADMIN DEBUG FUNCTION (NO STRIPE YET)
-- =====================================
-- Simple function to assign plans for testing
CREATE OR REPLACE FUNCTION app_assign_plan_debug(
  p_org_id uuid,
  p_plan_id text,
  p_trial_days int DEFAULT 7
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only allow if user is owner of the org
  IF NOT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_id = p_org_id 
      AND user_id = auth.uid() 
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only org owners can assign plans';
  END IF;

  -- Upsert subscription
  INSERT INTO org_subscriptions (
    org_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  ) VALUES (
    p_org_id,
    p_plan_id,
    'trialing',
    now(),
    now() + (p_trial_days || ' days')::interval
  )
  ON CONFLICT (org_id) DO UPDATE SET
    plan_id = p_plan_id,
    status = 'trialing',
    current_period_start = now(),
    current_period_end = now() + (p_trial_days || ' days')::interval,
    updated_at = now();

  -- Log activity
  PERFORM app_log_activity(
    p_org_id,
    'plan_assigned_debug',
    'org_subscription',
    p_org_id,
    jsonb_build_object('plan_id', p_plan_id, 'trial_days', p_trial_days)
  );
END;
$$;

-- =====================================
-- 10. ENABLE RLS ON NEW TABLES
-- =====================================
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Billing plans are public (everyone can read the catalog)
CREATE POLICY billing_plans_select ON billing_plans FOR SELECT USING (true);

-- Subscriptions are visible to org members
CREATE POLICY org_subscriptions_select ON org_subscriptions FOR SELECT
  USING (is_org_member(org_id));

-- Only owners can modify subscriptions (for now, until Stripe handles it)
CREATE POLICY org_subscriptions_update ON org_subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members 
      WHERE org_id = org_subscriptions.org_id 
        AND user_id = auth.uid() 
        AND role = 'owner'
    )
  );

-- Seats and overrides follow same pattern
CREATE POLICY org_seats_select ON org_seats FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY org_feature_overrides_select ON org_feature_overrides FOR SELECT
  USING (is_org_member(org_id));

-- =====================================
-- 11. CREATE DEFAULT SUBSCRIPTIONS FOR EXISTING ORGS
-- =====================================
-- Give all existing orgs a trial of team_manager plan
INSERT INTO org_subscriptions (org_id, plan_id, status, current_period_start, current_period_end)
SELECT 
  id,
  'team_manager',
  'trialing',
  now(),
  now() + INTERVAL '30 days'
FROM organizations
WHERE id NOT IN (SELECT org_id FROM org_subscriptions);