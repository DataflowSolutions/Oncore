-- Drop waitlist functionality (no longer needed)

-- Drop policies first
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Only service role can read waitlist" ON public.waitlist;

-- Drop trigger
DROP TRIGGER IF EXISTS update_waitlist_updated_at ON public.waitlist;

-- Drop indexes
DROP INDEX IF EXISTS public.waitlist_email_idx;
DROP INDEX IF EXISTS public.waitlist_status_idx;
DROP INDEX IF EXISTS public.waitlist_role_idx;

-- Drop table
DROP TABLE IF EXISTS public.waitlist;
