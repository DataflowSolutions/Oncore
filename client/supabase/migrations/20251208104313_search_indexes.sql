-- Add indexes to optimize global search performance
-- These indexes improve ILIKE pattern matching on frequently searched columns

-- Shows table indexes
CREATE INDEX IF NOT EXISTS idx_shows_title_search ON shows USING btree (title);
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows USING btree (date);

-- Venues table indexes
CREATE INDEX IF NOT EXISTS idx_venues_name_search ON venues USING btree (name);
CREATE INDEX IF NOT EXISTS idx_venues_city_search ON venues USING btree (city);

-- People table indexes
CREATE INDEX IF NOT EXISTS idx_people_name_search ON people USING btree (name);
CREATE INDEX IF NOT EXISTS idx_people_email_search ON people USING btree (email);
CREATE INDEX IF NOT EXISTS idx_people_role_title_search ON people USING btree (role_title);

-- Contacts table indexes
CREATE INDEX IF NOT EXISTS idx_contacts_name_search ON contacts USING btree (name);
CREATE INDEX IF NOT EXISTS idx_contacts_company_search ON contacts USING btree (company);
CREATE INDEX IF NOT EXISTS idx_contacts_email_search ON contacts USING btree (email);

-- Calendar events table indexes
CREATE INDEX IF NOT EXISTS idx_schedule_items_title_search ON schedule_items USING btree (title);
CREATE INDEX IF NOT EXISTS idx_schedule_items_starts_at ON schedule_items USING btree (starts_at);

-- Advancing documents table indexes
CREATE INDEX IF NOT EXISTS idx_advancing_documents_label_search ON advancing_documents USING btree (label);

-- Files table indexes
CREATE INDEX IF NOT EXISTS idx_files_original_name_search ON files USING btree (original_name);
CREATE INDEX IF NOT EXISTS idx_files_advancing_ref_search ON files USING btree (advancing_ref);
