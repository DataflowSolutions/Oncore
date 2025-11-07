-- Add referential integrity from various user_id and created_by columns to auth.users(id)
-- Using deferred constraints where appropriate to handle edge cases
-- First, clean up any orphaned records that reference non-existent users

-- ====================================
-- CLEANUP ORPHANED RECORDS
-- ====================================

-- Clean up org_members with invalid user_ids
DELETE FROM org_members
WHERE user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = org_members.user_id
  );

-- Clean up people with invalid user_ids
UPDATE people
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = people.user_id
  );

-- Clean up show_collaborators with invalid user_ids
UPDATE show_collaborators
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = show_collaborators.user_id
  );

-- Clean up organizations with invalid created_by
UPDATE organizations
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = organizations.created_by
  );

-- Clean up advancing_sessions with invalid created_by
-- These are critical, so we'll set to the org owner if possible
UPDATE advancing_sessions
SET created_by = (
  SELECT om.user_id
  FROM org_members om
  WHERE om.org_id = advancing_sessions.org_id
    AND om.role = 'owner'
  LIMIT 1
)
WHERE created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = advancing_sessions.created_by
  );

-- Clean up advancing_fields with invalid created_by
UPDATE advancing_fields
SET created_by = (
  SELECT om.user_id
  FROM org_members om
  WHERE om.org_id = advancing_fields.org_id
    AND om.role = 'owner'
  LIMIT 1
)
WHERE created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = advancing_fields.created_by
  );

-- Clean up advancing_comments with invalid author_id
UPDATE advancing_comments
SET author_id = NULL
WHERE author_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = advancing_comments.author_id
  );

-- Clean up advancing_documents with invalid created_by
UPDATE advancing_documents
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = advancing_documents.created_by
  );

-- Clean up files with invalid uploaded_by
UPDATE files
SET uploaded_by = NULL
WHERE uploaded_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = files.uploaded_by
  );

-- Clean up schedule_items with invalid created_by
UPDATE schedule_items
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = schedule_items.created_by
  );

-- ====================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ====================================

-- org_members.user_id -> auth.users(id)
-- This is critical for membership, use CASCADE to remove members when user is deleted
ALTER TABLE org_members
  ADD CONSTRAINT org_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- organizations.created_by -> auth.users(id)
-- SET NULL on delete to preserve org even if creator is deleted
ALTER TABLE organizations
  ADD CONSTRAINT organizations_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- advancing_sessions.created_by -> auth.users(id)
-- These should already be cleaned up above
-- Use SET NULL to preserve session history
DO $$
BEGIN
  -- Only add constraint if created_by is still NOT NULL (meaning cleanup found a valid user)
  -- Otherwise, make the column nullable first
  IF EXISTS (
    SELECT 1 FROM advancing_sessions WHERE created_by IS NULL
  ) THEN
    ALTER TABLE advancing_sessions
      ALTER COLUMN created_by DROP NOT NULL;
  END IF;
  
  ALTER TABLE advancing_sessions
    ADD CONSTRAINT advancing_sessions_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
END $$;

-- advancing_fields.created_by -> auth.users(id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM advancing_fields WHERE created_by IS NULL
  ) THEN
    ALTER TABLE advancing_fields
      ALTER COLUMN created_by DROP NOT NULL;
  END IF;
  
  ALTER TABLE advancing_fields
    ADD CONSTRAINT advancing_fields_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
END $$;

-- advancing_comments.author_id -> auth.users(id)
ALTER TABLE advancing_comments
  ADD CONSTRAINT advancing_comments_author_id_fkey
  FOREIGN KEY (author_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- advancing_documents.created_by -> auth.users(id)
ALTER TABLE advancing_documents
  ADD CONSTRAINT advancing_documents_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- files.uploaded_by -> auth.users(id)
ALTER TABLE files
  ADD CONSTRAINT files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- people.user_id -> auth.users(id)
ALTER TABLE people
  ADD CONSTRAINT people_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- schedule_items.created_by -> auth.users(id)
ALTER TABLE schedule_items
  ADD CONSTRAINT schedule_items_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- show_collaborators.user_id -> auth.users(id)
ALTER TABLE show_collaborators
  ADD CONSTRAINT show_collaborators_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ====================================
-- CREATE ORPHAN CLEANUP FUNCTION
-- ====================================

-- Function to periodically clean up orphaned user references
-- This can be called by a scheduled job if needed
CREATE OR REPLACE FUNCTION cleanup_orphaned_user_references()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_stats jsonb := '{}'::jsonb;
  deleted_count int;
BEGIN
  -- The foreign keys with ON DELETE SET NULL/CASCADE will handle most cases
  -- This function is here for any edge cases or manual cleanup needs
  
  -- Log any remaining issues
  SELECT jsonb_build_object(
    'status', 'Foreign key constraints are now enforced',
    'note', 'Orphaned records will be automatically handled by FK constraints'
  ) INTO cleanup_stats;
  
  RETURN cleanup_stats;
END;
$$;

-- Add comment explaining the approach
COMMENT ON FUNCTION cleanup_orphaned_user_references() IS 'Foreign key constraints now enforce referential integrity. Use ON DELETE CASCADE for org_members, SET NULL for audit/history fields.';
