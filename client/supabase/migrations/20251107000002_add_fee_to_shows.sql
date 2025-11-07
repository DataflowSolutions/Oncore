-- Add fee column to shows table to support parsed email data
-- Stores the performance fee/guarantee for a show

-- Add fee column (using numeric for precise decimal values)
ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS fee numeric(10, 2);

-- Add fee_currency column to support international shows
ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS fee_currency text DEFAULT 'USD';

-- Add index for queries filtering by fee
CREATE INDEX IF NOT EXISTS shows_fee_idx ON public.shows (fee) WHERE fee IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.shows.fee IS 'Performance fee/guarantee amount in the specified currency';
COMMENT ON COLUMN public.shows.fee_currency IS 'Currency code for the fee (e.g., USD, EUR, GBP). Defaults to USD';

-- Note: Using numeric(10, 2) allows for fees up to 99,999,999.99
-- This should cover most show fees while maintaining precision
