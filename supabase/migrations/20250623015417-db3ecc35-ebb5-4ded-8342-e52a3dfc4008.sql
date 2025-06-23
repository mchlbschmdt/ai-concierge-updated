
-- Create the guests table for storing guest information
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  property_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to the guests table
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Create policies for the guests table (allowing all operations for authenticated users)
CREATE POLICY "Allow all operations for authenticated users" 
  ON public.guests 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Create an index on property_id for faster queries
CREATE INDEX idx_guests_property_id ON public.guests(property_id);

-- Create an index on phone for faster lookups
CREATE INDEX idx_guests_phone ON public.guests(phone);
