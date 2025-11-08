-- Drop backup tables that were used during development migrations
-- Since production was reset, these backup tables are empty and no longer needed

-- Drop billing actions log backup
DROP TABLE IF EXISTS public._billing_actions_log_backup CASCADE;

-- Drop org seats backup
DROP TABLE IF EXISTS public._org_seats_backup CASCADE;

-- Drop show collaborators invite backup
DROP TABLE IF EXISTS public._show_collaborators_invite_backup CASCADE;

-- Verify cleanup
DO $$
DECLARE
    backup_count integer;
BEGIN
    SELECT COUNT(*) INTO backup_count
    FROM pg_tables
    WHERE schemaname = 'public' 
    AND tablename LIKE '\_%';
    
    RAISE NOTICE 'Remaining backup tables: %', backup_count;
END $$;
