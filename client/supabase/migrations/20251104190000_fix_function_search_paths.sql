-- Migration: Add search_path to all public functions
-- Created: 2025-11-04
-- Description: Sets search_path on all functions to prevent schema-based attacks

-- ============================================================================
-- Fix search_path for all public functions
-- ============================================================================

-- Use DO blocks to handle functions that may not exist

-- Helper functions
DO $$ BEGIN
  ALTER FUNCTION public.is_org_editor_and_active(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.is_org_member_and_active(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.is_org_member(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.is_org_editor(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Organization functions
DO $$ BEGIN
  ALTER FUNCTION public.org_is_active(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.org_is_active_with_grace(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.org_subscription_status(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.org_entitlements(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.refresh_org_entitlements() SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Show access functions
DO $$ BEGIN
  ALTER FUNCTION public.has_show_access(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.app_can_access_show(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.app_get_show_role(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_show_stats(uuid) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Show invite functions (handle overloaded versions)
DO $$ 
BEGIN
  -- Try to alter all overloaded versions of app_accept_show_invite
  ALTER FUNCTION public.app_accept_show_invite(uuid) SET search_path = public, pg_temp;
EXCEPTION 
  WHEN undefined_function THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER FUNCTION public.app_send_show_invite(uuid, text) SET search_path = public, pg_temp;
EXCEPTION 
  WHEN undefined_function THEN NULL;
END $$;

-- Advancing functions
DO $$ BEGIN ALTER FUNCTION public.create_advancing_session(uuid, jsonb) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.app_create_advancing_session(uuid, jsonb) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_advancing_session_details(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Date and file functions
DO $$ BEGIN ALTER FUNCTION public.bulk_update_show_dates(jsonb) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.app_upload_file(uuid, text, text) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Activity logging
DO $$ BEGIN ALTER FUNCTION public.app_log_activity(text, text, uuid, jsonb) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.archive_old_activity_logs(integer) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.log_invitation_activity() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.log_org_member_changes() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Storage verification
DO $$ BEGIN ALTER FUNCTION public.verify_storage_metadata(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.cleanup_unverified_files() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Collaborator functions
DO $$ BEGIN ALTER FUNCTION public.app_invite_collaborator(uuid, text, text) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.app_invite_collaborator_enhanced(uuid, text, text, text) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Organization management
DO $$ BEGIN ALTER FUNCTION public.app_create_organization_with_owner(text, text, uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Billing functions
DO $$ BEGIN ALTER FUNCTION public.check_org_limits(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.check_org_limits_detailed(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.org_billing_dashboard(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Admin functions
DO $$ BEGIN ALTER FUNCTION public.is_supabase_admin() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.admin_set_feature_override(uuid, text, boolean) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.admin_update_subscription(uuid, text, timestamp with time zone, timestamp with time zone) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.app_assign_plan_debug(uuid, text) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Maintenance functions
DO $$ BEGIN ALTER FUNCTION public.auto_downgrade_expired_orgs() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Trigger functions
DO $$ BEGIN ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_promoters_updated_at() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- Verification query (commented out - for manual testing)
-- ============================================================================

-- Check functions with mutable search_path:
-- SELECT 
--   n.nspname as schema,
--   p.proname as function_name,
--   pg_get_function_arguments(p.oid) as arguments,
--   p.prosecdef as security_definer,
--   COALESCE(array_to_string(p.proconfig, ', '), 'NOT SET') as search_path
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
-- AND p.proname NOT LIKE 'pg_%'
-- ORDER BY p.proname;
