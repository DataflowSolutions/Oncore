-- RPC function to create a show with all necessary checks
-- This bypasses RLS issues with PostgREST by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION app_create_show(
  p_org_id uuid,
  p_title text,
  p_date date,
  p_venue_id uuid DEFAULT NULL,
  p_venue_name text DEFAULT NULL,
  p_venue_city text DEFAULT NULL,
  p_venue_address text DEFAULT NULL,
  p_set_time timestamp with time zone DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_membership record;
  v_subscription record;
  v_final_venue_id uuid;
  v_new_show record;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Check if user is a member of the organization
  SELECT role INTO v_membership
  FROM org_members
  WHERE org_id = p_org_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not a member of this organization';
  END IF;

  -- Check subscription status
  SELECT * INTO v_subscription
  FROM org_subscriptions
  WHERE org_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization subscription not found';
  END IF;

  -- Validate subscription status
  IF v_subscription.status NOT IN ('trialing', 'active', 'past_due') THEN
    RAISE EXCEPTION 'Cannot create show: subscription status is %', v_subscription.status;
  END IF;

  -- Check if subscription has expired
  IF v_subscription.current_period_end IS NOT NULL 
     AND v_subscription.current_period_end < NOW() THEN
    RAISE EXCEPTION 'Cannot create show: subscription trial expired on %', v_subscription.current_period_end;
  END IF;

  -- Handle venue creation if needed
  IF p_venue_id IS NOT NULL THEN
    v_final_venue_id := p_venue_id;
  ELSIF p_venue_name IS NOT NULL AND p_venue_city IS NOT NULL THEN
    -- Check if venue already exists (case-insensitive name and city match)
    SELECT id INTO v_final_venue_id
    FROM venues
    WHERE org_id = p_org_id
      AND LOWER(name) = LOWER(p_venue_name)
      AND LOWER(city) = LOWER(p_venue_city);
    
    -- Create new venue only if it doesn't exist
    IF v_final_venue_id IS NULL THEN
      INSERT INTO venues (name, city, address, org_id)
      VALUES (p_venue_name, p_venue_city, p_venue_address, p_org_id)
      RETURNING id INTO v_final_venue_id;
    END IF;
  END IF;

  -- Create the show
  INSERT INTO shows (
    org_id,
    title,
    date,
    venue_id,
    set_time,
    notes,
    status
  )
  VALUES (
    p_org_id,
    p_title,
    p_date,
    v_final_venue_id,
    p_set_time,
    p_notes,
    'draft'
  )
  RETURNING * INTO v_new_show;

  -- Return the created show as JSON
  RETURN row_to_json(v_new_show);
END;
$$;

COMMENT ON FUNCTION app_create_show IS 
'Creates a show with proper authorization checks. Bypasses RLS issues with PostgREST.';
