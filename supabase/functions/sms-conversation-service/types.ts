
export interface Conversation {
  id?: string;
  phone_number: string;
  property_id?: string;
  conversation_state: 'awaiting_property_id' | 'awaiting_confirmation' | 'confirmed';
  conversation_context: any;
  preferences: any;
  timezone: string;
  last_interaction_timestamp: string;
  property_confirmed?: boolean;
  guest_name?: string;
  last_recommendations?: string;
  last_message_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Property {
  id?: string;
  property_id?: string;
  property_name: string;
  address: string;
  code?: string;
  wifi_name?: string;
  wifi_password?: string;
  parking_instructions?: string;
  check_in_time?: string;
  check_out_time?: string;
  access_instructions?: string;
  directions_to_property?: string;
  emergency_contact?: string;
  house_rules?: string;
  amenities?: string;
  local_recommendations?: string;
  cleaning_instructions?: string;
  special_notes?: string;
  knowledge_base?: string;
  management_company_name?: string;
  service_fees?: {
    [key: string]: {
      price?: number;
      unit?: 'per_day' | 'per_booking' | 'per_person' | 'flat_fee';
      description?: string;
      notes?: string;
    }
  };
}

export interface ProcessMessageResult {
  response: string;
  shouldUpdateState: boolean;
}

export interface MultiMessageResult {
  messages: string[];
  shouldUpdateState: boolean;
}

export interface IntentResult {
  intent: string;
  confidence: number;
  subIntents?: string[];
  isMultiPart: boolean;
  hasKids?: boolean;
  kidAges?: string[];
  isCheckoutSoon?: boolean;
}
