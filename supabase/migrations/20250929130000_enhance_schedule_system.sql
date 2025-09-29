-- Enhance schedule_items to support global shared schedules with role-based visibility
-- This creates a hierarchical schedule system with shared baseline + role/session overlays

-- Add visibility and audience columns for role-based filtering
ALTER TABLE schedule_items 
ADD COLUMN visibility text DEFAULT 'all' CHECK (visibility IN ('all', 'artist_team', 'promoter_team', 'crew', 'management', 'venue_staff', 'security', 'session_specific'));

-- Add session_id for session-specific schedule items (advancing session overlays)
ALTER TABLE schedule_items 
ADD COLUMN session_id uuid REFERENCES advancing_sessions(id) ON DELETE CASCADE;

-- Add schedule item type for better categorization
ALTER TABLE schedule_items 
ADD COLUMN item_type text DEFAULT 'custom' CHECK (item_type IN ('custom', 'load_in', 'soundcheck', 'doors', 'set_time', 'load_out', 'arrival', 'departure', 'hotel', 'transport', 'catering', 'meeting', 'press', 'technical'));

-- Add priority level for ordering and importance
ALTER TABLE schedule_items 
ADD COLUMN priority integer DEFAULT 3 CHECK (priority >= 1 AND priority <= 5);

-- Add auto_generated flag to track items created from advancing sessions
ALTER TABLE schedule_items 
ADD COLUMN auto_generated boolean DEFAULT false;

-- Add source information for traceability
ALTER TABLE schedule_items 
ADD COLUMN source_field_id uuid REFERENCES advancing_fields(id) ON DELETE SET NULL;

-- Update indexes for better performance with new columns
CREATE INDEX schedule_items_visibility_idx ON schedule_items (visibility);
CREATE INDEX schedule_items_session_idx ON schedule_items (session_id);
CREATE INDEX schedule_items_type_idx ON schedule_items (item_type);
CREATE INDEX schedule_items_priority_idx ON schedule_items (priority DESC);

-- Drop old index and create comprehensive one
DROP INDEX IF EXISTS schedule_items_org_show_person_starts_at_idx;
CREATE INDEX schedule_items_comprehensive_idx ON schedule_items (org_id, show_id, visibility, item_type, starts_at, priority DESC);

-- Add comments for documentation
COMMENT ON COLUMN schedule_items.visibility IS 'Controls who can see this schedule item: all, artist_team, promoter_team, crew, management, venue_staff, security, session_specific';
COMMENT ON COLUMN schedule_items.session_id IS 'Links to advancing_sessions for session-specific schedule overlays. NULL for global schedule items.';
COMMENT ON COLUMN schedule_items.item_type IS 'Categorizes the type of schedule item for filtering and UI organization';
COMMENT ON COLUMN schedule_items.priority IS 'Priority level 1-5 (1=highest, 5=lowest) for ordering critical items';
COMMENT ON COLUMN schedule_items.auto_generated IS 'True if this item was automatically created from advancing session data';
COMMENT ON COLUMN schedule_items.source_field_id IS 'References the advancing field that generated this schedule item, if applicable';