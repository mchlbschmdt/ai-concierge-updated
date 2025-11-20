-- Add management company and service fees to properties table
ALTER TABLE public.properties 
ADD COLUMN management_company_name TEXT,
ADD COLUMN service_fees JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient JSON queries on service_fees
CREATE INDEX idx_properties_service_fees ON public.properties USING GIN (service_fees);

-- Add column comments for documentation
COMMENT ON COLUMN public.properties.management_company_name IS 'Name of property management company or host (e.g., "Lauren & Mike")';
COMMENT ON COLUMN public.properties.service_fees IS 'Structured service pricing data: {service_key: {price, unit, description, notes}}';