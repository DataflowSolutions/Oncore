-- Migration: Consolidate Partners and Promoters into Contacts
-- Created: 2025-11-04
-- Purpose: Merge partners and promoters tables into a unified contacts table
--          to eliminate redundancy and simplify the data model

-- =====================================
-- STEP 1: CREATE CONTACTS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Type of contact
  type TEXT NOT NULL CHECK (type IN ('promoter', 'agent', 'manager', 'vendor', 'other')),
  
  -- Basic information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  
  -- Location (primarily for promoters)
  city TEXT,
  country TEXT,
  
  -- Financial information (for partners who earn commissions)
  commission_rate NUMERIC(5,2),
  
  -- Role/notes
  role TEXT, -- Free text field for flexible categorization
  notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX contacts_org_idx ON public.contacts (org_id);
CREATE INDEX contacts_type_idx ON public.contacts (type);
CREATE INDEX contacts_status_idx ON public.contacts (status);
CREATE INDEX contacts_email_idx ON public.contacts (email);
CREATE INDEX contacts_city_idx ON public.contacts (city);

COMMENT ON TABLE public.contacts IS 'Unified table for all external contacts: promoters, agents, managers, vendors';
COMMENT ON COLUMN public.contacts.type IS 'Type of contact: promoter, agent, manager, vendor, other';
COMMENT ON COLUMN public.contacts.commission_rate IS 'Commission percentage (e.g., 4.00 for 4%)';

-- =====================================
-- STEP 2: MIGRATE PROMOTERS TO CONTACTS
-- =====================================

-- Migrate all promoters data
INSERT INTO public.contacts (
  id, 
  org_id, 
  type, 
  name, 
  email, 
  phone, 
  company, 
  city, 
  country, 
  notes, 
  status, 
  created_at, 
  updated_at,
  created_by
)
SELECT 
  id,
  org_id,
  'promoter' AS type,
  name,
  email,
  phone,
  company,
  city,
  country,
  notes,
  status,
  created_at,
  updated_at,
  created_by
FROM public.promoters
ON CONFLICT (id) DO NOTHING;

-- =====================================
-- STEP 3: MIGRATE PARTNERS TO CONTACTS
-- =====================================

-- Migrate all partners data
-- Determine type based on role field
INSERT INTO public.contacts (
  id,
  org_id,
  type,
  name,
  email,
  phone,
  company,
  commission_rate,
  role,
  notes,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  org_id,
  -- Determine type from role field
  CASE 
    WHEN role ILIKE '%agent%' OR role ILIKE '%booking%' THEN 'agent'
    WHEN role ILIKE '%manager%' OR role ILIKE '%tour%' THEN 'manager'
    WHEN role ILIKE '%promoter%' THEN 'promoter'
    WHEN role ILIKE '%vendor%' OR role ILIKE '%supplier%' THEN 'vendor'
    ELSE 'other'
  END AS type,
  name,
  email,
  phone,
  company,
  commission_rate,
  role, -- Keep original role as free text
  notes,
  status,
  created_at,
  updated_at
FROM public.partners
ON CONFLICT (id) DO NOTHING;

-- =====================================
-- STEP 4: UPDATE PARTNER_COMMISSIONS → CONTACT_COMMISSIONS
-- =====================================

-- Rename table
ALTER TABLE IF EXISTS public.partner_commissions 
  RENAME TO contact_commissions;

-- Rename foreign key column
ALTER TABLE public.contact_commissions 
  RENAME COLUMN partner_id TO contact_id;

-- Update foreign key constraint
ALTER TABLE public.contact_commissions 
  DROP CONSTRAINT IF EXISTS partner_commissions_partner_id_fkey;

ALTER TABLE public.contact_commissions
  ADD CONSTRAINT contact_commissions_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Rename indexes
DROP INDEX IF EXISTS partner_commissions_partner_idx;
DROP INDEX IF EXISTS partner_commissions_show_idx;
DROP INDEX IF EXISTS partner_commissions_status_idx;

CREATE INDEX contact_commissions_contact_idx ON public.contact_commissions (contact_id);
CREATE INDEX contact_commissions_show_idx ON public.contact_commissions (show_id);
CREATE INDEX contact_commissions_status_idx ON public.contact_commissions (status);

-- Update comment
COMMENT ON TABLE public.contact_commissions IS 'Tracks commission payments to contacts (typically agents/managers with commission_rate)';

-- =====================================
-- STEP 5: UPDATE VENUE_PROMOTERS → VENUE_CONTACTS
-- =====================================

-- Rename table
ALTER TABLE IF EXISTS public.venue_promoters 
  RENAME TO venue_contacts;

-- Rename foreign key column
ALTER TABLE public.venue_contacts 
  RENAME COLUMN promoter_id TO contact_id;

-- Update foreign key constraint
ALTER TABLE public.venue_contacts 
  DROP CONSTRAINT IF EXISTS venue_promoters_promoter_id_fkey;

ALTER TABLE public.venue_contacts
  ADD CONSTRAINT venue_contacts_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Update unique constraint
ALTER TABLE public.venue_contacts
  DROP CONSTRAINT IF EXISTS venue_promoters_venue_id_promoter_id_key;

ALTER TABLE public.venue_contacts
  ADD CONSTRAINT venue_contacts_venue_id_contact_id_key 
  UNIQUE (venue_id, contact_id);

-- Rename indexes
DROP INDEX IF EXISTS venue_promoters_venue_idx;
DROP INDEX IF EXISTS venue_promoters_promoter_idx;
DROP INDEX IF EXISTS venue_promoters_primary_idx;

CREATE INDEX venue_contacts_venue_idx ON public.venue_contacts (venue_id);
CREATE INDEX venue_contacts_contact_idx ON public.venue_contacts (contact_id);
CREATE INDEX venue_contacts_primary_idx ON public.venue_contacts (is_primary) WHERE is_primary = true;

-- Update comment
COMMENT ON TABLE public.venue_contacts IS 'Links contacts (typically promoters) to venues they work with (many-to-many)';

-- =====================================
-- STEP 6: ROW LEVEL SECURITY FOR CONTACTS
-- =====================================

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Org members can view contacts
CREATE POLICY "Org members can view contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = contacts.org_id
    AND org_members.user_id = auth.uid()
  )
);

-- Org owners/admins can manage contacts
CREATE POLICY "Org owners/admins can manage contacts"
ON public.contacts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = contacts.org_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = contacts.org_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin', 'editor')
  )
);

-- =====================================
-- STEP 7: UPDATE RLS POLICIES FOR RENAMED TABLES
-- =====================================

-- Drop old policies from partner_commissions (now contact_commissions)
DROP POLICY IF EXISTS "Org members can view commissions" ON public.contact_commissions;
DROP POLICY IF EXISTS "Org owners/admins can manage commissions" ON public.contact_commissions;

-- Create new policies for contact_commissions
CREATE POLICY "Org members can view contact commissions"
ON public.contact_commissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts
    JOIN public.org_members ON org_members.org_id = contacts.org_id
    WHERE contacts.id = contact_commissions.contact_id
    AND org_members.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners/admins can manage contact commissions"
ON public.contact_commissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts
    JOIN public.org_members ON org_members.org_id = contacts.org_id
    WHERE contacts.id = contact_commissions.contact_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts
    JOIN public.org_members ON org_members.org_id = contacts.org_id
    WHERE contacts.id = contact_commissions.contact_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin', 'editor')
  )
);

-- Drop old policies from venue_promoters (now venue_contacts)
DROP POLICY IF EXISTS "Org members can view venue-promoter links" ON public.venue_contacts;
DROP POLICY IF EXISTS "Org owners/admins can manage venue-promoter links" ON public.venue_contacts;

-- Create new policies for venue_contacts
CREATE POLICY "Org members can view venue-contact links"
ON public.venue_contacts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venues
    JOIN public.org_members ON org_members.org_id = venues.org_id
    WHERE venues.id = venue_contacts.venue_id
    AND org_members.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners/admins can manage venue-contact links"
ON public.venue_contacts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venues
    JOIN public.org_members ON org_members.org_id = venues.org_id
    WHERE venues.id = venue_contacts.venue_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.venues
    JOIN public.org_members ON org_members.org_id = venues.org_id
    WHERE venues.id = venue_contacts.venue_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin', 'editor')
  )
);

-- =====================================
-- STEP 8: TRIGGERS FOR UPDATED_AT
-- =====================================

CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION update_contacts_updated_at();

-- =====================================
-- STEP 9: DROP OLD TABLES
-- =====================================

-- Drop old promoters table (data migrated to contacts)
DROP TABLE IF EXISTS public.promoters CASCADE;

-- Drop old partners table (data migrated to contacts)
DROP TABLE IF EXISTS public.partners CASCADE;

-- =====================================
-- VERIFICATION QUERIES (COMMENTED OUT)
-- =====================================

-- Verify migration counts match
-- SELECT 'contacts' as table_name, COUNT(*) FROM public.contacts;
-- SELECT 'contact_commissions' as table_name, COUNT(*) FROM public.contact_commissions;
-- SELECT 'venue_contacts' as table_name, COUNT(*) FROM public.venue_contacts;

-- Check contact type distribution
-- SELECT type, COUNT(*) FROM public.contacts GROUP BY type ORDER BY COUNT(*) DESC;

-- =====================================
-- ROLLBACK SCRIPT (FOR REFERENCE)
-- =====================================

-- To rollback this migration if needed:
-- 1. Recreate partners and promoters tables from contacts
-- 2. Rename contact_commissions back to partner_commissions
-- 3. Rename venue_contacts back to venue_promoters
-- 4. Drop contacts table
-- See rollback migration file for full script

