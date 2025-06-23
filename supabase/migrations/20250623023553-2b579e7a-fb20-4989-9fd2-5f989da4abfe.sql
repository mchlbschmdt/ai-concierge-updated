
-- Add missing columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS cleaning_instructions text,
ADD COLUMN IF NOT EXISTS special_notes text;
