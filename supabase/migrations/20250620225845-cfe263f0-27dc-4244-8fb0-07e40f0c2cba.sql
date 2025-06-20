
-- Add missing fields to properties table for intelligent concierge functionality
ALTER TABLE properties 
ADD COLUMN wifi_name TEXT,
ADD COLUMN wifi_password TEXT,
ADD COLUMN parking_instructions TEXT,
ADD COLUMN access_instructions TEXT,
ADD COLUMN emergency_contact TEXT,
ADD COLUMN amenities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN house_rules TEXT,
ADD COLUMN directions_to_property TEXT;

-- Update the existing San Juan property with sample data
UPDATE properties 
SET 
  wifi_name = 'PlentifulViews-Guest',
  wifi_password = 'Welcome2023!',
  parking_instructions = 'Valet parking available at building entrance. Self-parking garage entrance on Calle de la Fortaleza. Monthly guests receive complimentary parking passes.',
  access_instructions = 'Building entrance is on Ave De La Constitucion. Use key fob for main entrance. Unit 803 keyless entry code will be provided 24 hours before check-in.',
  emergency_contact = 'Property Manager: +1-787-555-0123 (24/7 emergency line)',
  amenities = '["WiFi", "Air Conditioning", "Kitchen", "Washer/Dryer", "Balcony", "Ocean View", "Rooftop Pool", "Gym", "Concierge"]'::jsonb,
  house_rules = 'No smoking inside. Quiet hours 10 PM - 8 AM. Maximum 4 guests. No parties or events. Check-out cleaning required.',
  directions_to_property = 'From Airport: Take Highway PR-26 west toward San Juan (15 min). Exit at Ave De Diego, turn right on Ave De La Constitucion. Building is on the right with "404" signage.',
  local_recommendations = 'BEACHES: Condado Beach (5 min walk) - excellent swimming, beachfront dining. Ocean Park Beach (10 min) - great for surfing, quieter. Isla Verde Beach (15 min) - wider beach, more activities. RESTAURANTS: Marmalade (3 blocks) - fine dining, tasting menu. La Placita (5 min) - local nightlife district. Santaella (10 min) - modern Puerto Rican cuisine. ATTRACTIONS: El Yunque Rainforest (45 min drive) - hiking, waterfalls. Old San Juan (5 min) - historic forts, colorful buildings. Bioluminescent Bay Tour (1 hour) - magical night kayaking.',
  knowledge_base = 'TRANSPORTATION: Taxis readily available. Uber/Lyft operate in area. Car rental recommended for exploring island. Public bus (AMA) connects to major areas. AIRPORT: Luis Muñoz Marín International (SJU) - 20 minutes by car, $25-35 taxi fare. SHOPPING: Plaza Las Americas (20 min) - largest mall in Caribbean. Local markets in Old San Juan for souvenirs. WEATHER: Tropical climate, average 80°F year-round. Hurricane season June-November. Brief afternoon showers common.'
WHERE code = '0404';
