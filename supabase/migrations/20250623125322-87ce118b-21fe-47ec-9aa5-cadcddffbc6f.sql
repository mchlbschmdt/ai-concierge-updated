
-- Create locations table for geocoded places
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  lat DECIMAL(10,8),
  lon DECIMAL(11,8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(city, state)
);

-- Create travel conversations table for guest state
CREATE TABLE public.travel_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT,
  location_id UUID REFERENCES public.locations(id),
  location_json JSONB,
  preferences_json JSONB DEFAULT '{}'::jsonb,
  step TEXT NOT NULL DEFAULT 'ASK_LOCATION',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create travel messages table for full conversation history
CREATE TABLE public.travel_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.travel_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  body TEXT NOT NULL,
  intent_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create curated links table for admin-managed recommendations
CREATE TABLE public.curated_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.travel_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for travel_conversations (readable by all authenticated users, modifiable by service)
CREATE POLICY "Anyone can view travel conversations" ON public.travel_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can manage travel conversations" ON public.travel_conversations FOR ALL TO service_role USING (true);

-- RLS policies for travel_messages (readable by all authenticated users, modifiable by service)
CREATE POLICY "Anyone can view travel messages" ON public.travel_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can manage travel messages" ON public.travel_messages FOR ALL TO service_role USING (true);

-- RLS policies for locations (readable by all, manageable by authenticated users)
CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage locations" ON public.locations FOR ALL TO authenticated USING (true);

-- RLS policies for curated_links (readable by all, manageable by authenticated users)
CREATE POLICY "Anyone can view curated links" ON public.curated_links FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage curated links" ON public.curated_links FOR ALL TO authenticated USING (true);

-- Create helpful functions
CREATE OR REPLACE FUNCTION public.rpc_upsert_travel_conversation(
  _phone_number TEXT,
  _name TEXT DEFAULT NULL,
  _location_id UUID DEFAULT NULL,
  _location_json JSONB DEFAULT NULL,
  _preferences_json JSONB DEFAULT NULL,
  _step TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  INSERT INTO public.travel_conversations (
    phone_number, name, location_id, location_json, preferences_json, step, updated_at
  )
  VALUES (
    _phone_number, _name, _location_id, _location_json, _preferences_json, _step, now()
  )
  ON CONFLICT (phone_number)
  DO UPDATE SET
    name = COALESCE(_name, travel_conversations.name),
    location_id = COALESCE(_location_id, travel_conversations.location_id),
    location_json = COALESCE(_location_json, travel_conversations.location_json),
    preferences_json = COALESCE(_preferences_json, travel_conversations.preferences_json),
    step = COALESCE(_step, travel_conversations.step),
    updated_at = now()
  RETURNING id INTO conversation_id;
  
  RETURN conversation_id;
END;
$$;

-- Function to get curated links for a location and categories
CREATE OR REPLACE FUNCTION public.rpc_get_curated_links(
  _location_id UUID,
  _categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  title TEXT,
  description TEXT,
  url TEXT,
  weight INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.category,
    cl.title,
    cl.description,
    cl.url,
    cl.weight
  FROM public.curated_links cl
  WHERE cl.location_id = _location_id
    AND (_categories IS NULL OR cl.category = ANY(_categories))
  ORDER BY cl.weight DESC, cl.created_at DESC;
END;
$$;
