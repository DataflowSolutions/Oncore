-- Update organization creation to include default trial subscription
-- This prevents billing status errors for new organizations

CREATE OR REPLACE FUNCTION app_create_organization_with_owner(
  org_name text,
  org_slug text
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug, created_by)
  VALUES (org_name, org_slug, current_user_id)
  RETURNING id INTO org_id;

  -- Add creator as owner
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (org_id, current_user_id, 'owner');

  -- Create default trial subscription (7-day trial on solo_artist plan)
  INSERT INTO org_subscriptions (
    org_id, 
    plan_id, 
    status, 
    current_period_start,
    current_period_end
  ) VALUES (
    org_id,
    'solo_artist',
    'trialing',
    now(),
    now() + interval '7 days'
  );

  -- Log organization creation
  PERFORM app_log_activity(
    org_id,
    'organization_created',
    'organization',
    org_id,
    jsonb_build_object(
      'org_name', org_name,
      'org_slug', org_slug,
      'created_by', current_user_id
    )
  );

  -- Log membership creation
  PERFORM app_log_activity(
    org_id,
    'member_added',
    'organization_member',
    NULL,
    jsonb_build_object(
      'user_id', current_user_id,
      'role', 'owner',
      'org_id', org_id
    )
  );

  RETURN org_id;
END;
$$;