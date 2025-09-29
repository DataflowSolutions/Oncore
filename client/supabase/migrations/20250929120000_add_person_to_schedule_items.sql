-- Add person assignments to schedule items for more granular control
-- This allows schedule items to be assigned to specific people or left as team-wide

-- Add person_id column to schedule_items table
ALTER TABLE schedule_items 
ADD COLUMN person_id uuid REFERENCES people(id) ON DELETE SET NULL;

-- Add index for person-specific queries
CREATE INDEX ON schedule_items (person_id);

-- Update the index to include person_id for better performance
DROP INDEX IF EXISTS schedule_items_org_id_starts_at_idx;
CREATE INDEX schedule_items_org_show_person_starts_at_idx ON schedule_items (org_id, show_id, person_id, starts_at);

COMMENT ON COLUMN schedule_items.person_id IS 'Optional: If set, this schedule item is specific to this person. If NULL, it applies to the entire team.';