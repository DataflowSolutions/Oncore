-- Migration: Add Promoters System with Venue Relationships
-- Created: 2025-10-16
-- Purpose: Replace partners table with proper promoters system that links to venues

-- =====================================
-- PROMOTERS TABLE
-- =====================================
-- Promoters are external contacts who manage venues/shows in specific regions
CREATE TABLE IF NOT EXISTS public.promoters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  city TEXT, -- Primary city/region they operate in
  country TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX promoters_org_idx ON public.promoters (org_id);
CREATE INDEX promoters_status_idx ON public.promoters (status);
CREATE INDEX promoters_email_idx ON public.promoters (email);
CREATE INDEX promoters_city_idx ON public.promoters (city);

COMMENT ON TABLE public.promoters IS 'External promoters who manage venues and shows in specific regions';
COMMENT ON COLUMN public.promoters.city IS 'Primary city/region the promoter operates in (e.g., Mumbai, Berlin)';

-- =====================================
-- VENUE_PROMOTERS JUNCTION TABLE
-- =====================================
-- Many-to-many relationship: A promoter can work with multiple venues,
-- and a venue can have multiple promoters
CREATE TABLE IF NOT EXISTS public.venue_promoters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Primary contact for this venue
  notes TEXT, -- Venue-specific notes about this promoter relationship
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(venue_id, promoter_id) -- Prevent duplicate links
);

CREATE INDEX venue_promoters_venue_idx ON public.venue_promoters (venue_id);
CREATE INDEX venue_promoters_promoter_idx ON public.venue_promoters (promoter_id);
CREATE INDEX venue_promoters_primary_idx ON public.venue_promoters (is_primary) WHERE is_primary = true;

COMMENT ON TABLE public.venue_promoters IS 'Links promoters to venues they work with (many-to-many)';
COMMENT ON COLUMN public.venue_promoters.is_primary IS 'Mark primary contact for this venue';

-- =====================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================

-- Promoters - Org members can read, owners/admins can write
ALTER TABLE public.promoters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view promoters"
ON public.promoters FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = promoters.org_id
    AND org_members.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners/admins can manage promoters"
ON public.promoters FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = promoters.org_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = promoters.org_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
);

-- Venue-Promoter Links - Org members can read, owners/admins can write
ALTER TABLE public.venue_promoters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view venue-promoter links"
ON public.venue_promoters FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venues
    JOIN public.org_members ON org_members.org_id = venues.org_id
    WHERE venues.id = venue_promoters.venue_id
    AND org_members.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners/admins can manage venue-promoter links"
ON public.venue_promoters FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venues
    JOIN public.org_members ON org_members.org_id = venues.org_id
    WHERE venues.id = venue_promoters.venue_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.venues
    JOIN public.org_members ON org_members.org_id = venues.org_id
    WHERE venues.id = venue_promoters.venue_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
);

-- =====================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================

CREATE OR REPLACE FUNCTION update_promoters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promoters_updated_at
BEFORE UPDATE ON public.promoters
FOR EACH ROW
EXECUTE FUNCTION update_promoters_updated_at();

-- =====================================
-- MIGRATION NOTE
-- =====================================
-- This creates a new promoters system separate from the existing partners table
-- The partners table is kept for commission tracking purposes
-- Promoters focus on venue relationships and regional management
