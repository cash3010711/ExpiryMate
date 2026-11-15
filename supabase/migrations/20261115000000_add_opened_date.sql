-- Migration: Add nullable opened_date to public.items
-- Tracks when a food item was opened to calculate elapsed days for consumption safety.

ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS opened_date DATE;

COMMENT ON COLUMN public.items.opened_date IS 'Calendar date when the item was opened (YYYY-MM-DD)';
