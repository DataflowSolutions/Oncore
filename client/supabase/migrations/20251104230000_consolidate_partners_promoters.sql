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

-- Skip partners migration - table never existed in this version
-- (partners table was in a removed migration)

-- =====================================
-- STEP 4: CREATE CONTACT_COMMISSIONS TABLE
-- =====================================

-- Create fresh table (partner_commissions never existed in this version)
CREATE TABLE IF NOT EXISTS public.contact_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  show_id uuid REFERENCES public.shows(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_commissions_contact_idx ON public.contact_commissions (contact_id);
CREATE INDEX contact_commissions_show_idx ON public.contact_commissions (show_id);
CREATE INDEX contact_commissions_status_idx ON public.contact_commissions (status);

COMMENT ON TABLE public.contact_commissions IS 'Tracks commission payments to contacts (typically agents/managers with commission_rate)';

-- =====================================
-- STEP 5: CREATE VENUE_CONTACTS TABLE
-- =====================================

-- Create fresh table (venue_promoters never existed in this version)
CREATE TABLE IF NOT EXISTS public.venue_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(venue_id, contact_id)
);

CREATE INDEX venue_contacts_venue_idx ON public.venue_contacts (venue_id);
CREATE INDEX venue_contacts_contact_idx ON public.venue_contacts (contact_id);
CREATE INDEX venue_contacts_primary_idx ON public.venue_contacts (is_primary) WHERE is_primary = true;

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

-- Skip - old tables never existed in this version
-- (They were in migrations that were removed during cleanup)

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

