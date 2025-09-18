-- Ensure app_create_organization_with_owner and invite RPCs align with schema

-- 1. Add creator tracking to organizations for RPC insert
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Backfill created_by from existing owner memberships when available
WITH first_owner AS (
  SELECT DISTINCT ON (org_id) org_id, user_id
  FROM org_members
  WHERE role = 'owner'
  ORDER BY org_id, created_at
)
UPDATE organizations o
SET created_by = fo.user_id
FROM first_owner fo
WHERE o.id = fo.org_id
  AND o.created_by IS NULL;

-- 2. Align show_collaborators with invite workflow expectations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'show_invite_status') THEN
    CREATE TYPE show_invite_status AS ENUM ('invited', 'accepted', 'revoked');
  END IF;
END;
$$;

ALTER TABLE show_collaborators
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS invite_token text,
  ADD COLUMN IF NOT EXISTS status show_invite_status NOT NULL DEFAULT 'invited',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill org_id based on show ownership
UPDATE show_collaborators sc
SET org_id = s.org_id
FROM shows s
WHERE sc.show_id = s.id
  AND (sc.org_id IS DISTINCT FROM s.org_id OR sc.org_id IS NULL);

-- Ensure updated_at reflects latest known activity when missing
UPDATE show_collaborators
SET updated_at = COALESCE(accepted_at, created_at)
WHERE updated_at IS NULL;

-- Existing accepted collaborators should be marked as accepted
UPDATE show_collaborators
SET status = 'accepted'
WHERE (accepted_at IS NOT NULL OR user_id IS NOT NULL)
  AND status <> 'accepted';

-- Enforce org linkage once populated
ALTER TABLE show_collaborators
  ALTER COLUMN org_id SET NOT NULL;

-- Maintain referential integrity for org_id
ALTER TABLE show_collaborators
  ADD CONSTRAINT show_collaborators_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Deduplicate invite token lookups
CREATE UNIQUE INDEX IF NOT EXISTS show_collaborators_invite_token_unique
  ON show_collaborators(invite_token)
  WHERE invite_token IS NOT NULL;

-- Speed up queries checking invite status by email within an org
CREATE INDEX IF NOT EXISTS show_collaborators_org_email_idx
  ON show_collaborators(org_id, email);
