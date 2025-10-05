-- Migration for waitlist, partners, parsed emails/contracts, and enhanced schedule features
-- Created: 2025-10-05

-- =====================================
-- WAITLIST TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('artist', 'manager', 'agent', 'venue', 'promoter', 'other')),
  company TEXT,
  phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'converted', 'declined')),
  source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX waitlist_email_idx ON public.waitlist (email);
CREATE INDEX waitlist_status_idx ON public.waitlist (status);
CREATE INDEX waitlist_role_idx ON public.waitlist (role);

COMMENT ON TABLE public.waitlist IS 'Stores waitlist signups for the October 31st launch';

-- =====================================
-- PARTNERS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT, -- e.g., 'Tour Manager', 'Booking Agent', 'Venue Coordinator'
  company TEXT,
  commission_rate NUMERIC(5,2) DEFAULT 4.00, -- Default 4% commission
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX partners_org_idx ON public.partners (org_id);
CREATE INDEX partners_status_idx ON public.partners (status);
CREATE INDEX partners_email_idx ON public.partners (email);

COMMENT ON TABLE public.partners IS 'Stores partner relationships for commission tracking';
COMMENT ON COLUMN public.partners.commission_rate IS '4% commission model for partners as discussed in meeting';

-- =====================================
-- PARTNER COMMISSIONS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  show_id UUID REFERENCES public.shows(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX partner_commissions_partner_idx ON public.partner_commissions (partner_id);
CREATE INDEX partner_commissions_show_idx ON public.partner_commissions (show_id);
CREATE INDEX partner_commissions_status_idx ON public.partner_commissions (status);

COMMENT ON TABLE public.partner_commissions IS 'Tracks 4% commission payments to partners';

-- =====================================
-- PARSED EMAILS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS public.parsed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  from_email TEXT,
  raw_content TEXT NOT NULL,
  parsed_data JSONB, -- Stores extracted show details, venue info, contacts
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX parsed_emails_org_idx ON public.parsed_emails (org_id);
CREATE INDEX parsed_emails_status_idx ON public.parsed_emails (status);
CREATE INDEX parsed_emails_from_idx ON public.parsed_emails (from_email);

COMMENT ON TABLE public.parsed_emails IS 'Stores AI-parsed email content for show/venue extraction';

-- =====================================
-- PARSED CONTRACTS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS public.parsed_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  parsed_data JSONB, -- Stores extracted contract details (fees, dates, terms)
  confidence NUMERIC(3,2), -- AI confidence score 0.00-1.00
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX parsed_contracts_org_idx ON public.parsed_contracts (org_id);
CREATE INDEX parsed_contracts_status_idx ON public.parsed_contracts (status);
CREATE INDEX parsed_contracts_confidence_idx ON public.parsed_contracts (confidence DESC);

COMMENT ON TABLE public.parsed_contracts IS 'Stores AI-parsed contract documents with extracted show details';

-- =====================================
-- ADD EXTERNAL CALENDAR ID TO SCHEDULE ITEMS
-- =====================================
ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS external_calendar_id TEXT;

CREATE INDEX IF NOT EXISTS schedule_items_external_calendar_idx 
ON public.schedule_items (external_calendar_id);

COMMENT ON COLUMN public.schedule_items.external_calendar_id IS 'Links to external calendar events for sync (Google Calendar, iCal, etc.)';

-- =====================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================

-- Waitlist is publicly writable but only readable by admins
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
ON public.waitlist FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Only service role can read waitlist"
ON public.waitlist FOR SELECT
TO authenticated
USING (false); -- Only service role can read

-- Partners - org members can read, owners/admins can write
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view partners"
ON public.partners FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = partners.org_id
    AND org_members.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners/admins can manage partners"
ON public.partners FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = partners.org_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = partners.org_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
);

-- Partner commissions - same as partners
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view commissions"
ON public.partner_commissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    JOIN public.org_members ON org_members.org_id = partners.org_id
    WHERE partners.id = partner_commissions.partner_id
    AND org_members.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners/admins can manage commissions"
ON public.partner_commissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    JOIN public.org_members ON org_members.org_id = partners.org_id
    WHERE partners.id = partner_commissions.partner_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners
    JOIN public.org_members ON org_members.org_id = partners.org_id
    WHERE partners.id = partner_commissions.partner_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin')
  )
);

-- Parsed emails - org members access
ALTER TABLE public.parsed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage parsed emails"
ON public.parsed_emails FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = parsed_emails.org_id
    AND org_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = parsed_emails.org_id
    AND org_members.user_id = auth.uid()
  )
);

-- Parsed contracts - org members access
ALTER TABLE public.parsed_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage parsed contracts"
ON public.parsed_contracts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = parsed_contracts.org_id
    AND org_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = parsed_contracts.org_id
    AND org_members.user_id = auth.uid()
  )
);

-- =====================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON public.waitlist
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_commissions_updated_at BEFORE UPDATE ON public.partner_commissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsed_emails_updated_at BEFORE UPDATE ON public.parsed_emails
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsed_contracts_updated_at BEFORE UPDATE ON public.parsed_contracts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
