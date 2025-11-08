-- Fix final unused variable warning

CREATE OR REPLACE FUNCTION generate_rls_coverage_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report jsonb;
  tables_with_rls integer := 0;
  tables_without_rls integer := 0;
BEGIN
  -- Build a comprehensive RLS coverage report
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', tablename,
      'has_rls', (
        SELECT COUNT(*) > 0 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND pg_policies.tablename = t.tablename
      ),
      'policy_count', (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND pg_policies.tablename = t.tablename
      ),
      'policies', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', policyname,
            'command', cmd,
            'permissive', permissive
          )
        )
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND pg_policies.tablename = t.tablename
      )
    )
  )
  INTO report
  FROM pg_tables t
  WHERE schemaname = 'public'
  AND tablename NOT LIKE '%_backup'
  AND tablename NOT LIKE '%_old';

  -- Count tables with and without RLS
  SELECT 
    COUNT(*) FILTER (WHERE (r->>'has_rls')::boolean),
    COUNT(*) FILTER (WHERE NOT (r->>'has_rls')::boolean)
  INTO tables_with_rls, tables_without_rls
  FROM jsonb_array_elements(report) r;

  -- Return the complete report with summary
  RETURN jsonb_build_object(
    'summary', jsonb_build_object(
      'tables_with_rls', tables_with_rls,
      'tables_without_rls', tables_without_rls,
      'total_tables', tables_with_rls + tables_without_rls
    ),
    'tables', report,
    'generated_at', now()
  );
END;
$$;
