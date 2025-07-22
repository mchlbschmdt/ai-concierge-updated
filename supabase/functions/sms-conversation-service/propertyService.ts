
import { Property } from './types.ts';

export class PropertyService {
  constructor(private supabase: any) {}

  // Add the missing static method that was being called
  static async getPropertyByPhone(supabase: any, phoneNumber: string): Promise<Property | null> {
    console.log('🔍 PropertyService: Looking up property by phone number:', phoneNumber);
    
    try {
      // First, get the conversation for this phone number
      const { data: conversation, error: convError } = await supabase
        .from('sms_conversations')
        .select('property_id, property_confirmed')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (convError) {
        console.error('❌ PropertyService: Error fetching conversation:', convError);
        return null;
      }

      if (!conversation || !conversation.property_id || !conversation.property_confirmed) {
        console.log('❌ PropertyService: No confirmed property found for phone number:', phoneNumber);
        return null;
      }

      // Now get the property details
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', conversation.property_id)
        .maybeSingle();

      if (propError) {
        console.error('❌ PropertyService: Error fetching property:', propError);
        return null;
      }

      if (property) {
        console.log('✅ PropertyService: Found property for phone:', property.property_name);
        return {
          property_id: property.id,
          property_name: property.property_name,
          address: property.address,
          check_in_time: property.check_in_time || '4:00 PM',
          check_out_time: property.check_out_time || '11:00 AM',
          wifi_name: property.wifi_name,
          wifi_password: property.wifi_password,
          access_instructions: property.access_instructions,
          directions_to_property: property.directions_to_property,
          parking_instructions: property.parking_instructions,
          emergency_contact: property.emergency_contact,
          house_rules: property.house_rules,
          amenities: property.amenities,
          local_recommendations: property.local_recommendations,
          cleaning_instructions: property.cleaning_instructions,
          special_notes: property.special_notes,
          knowledge_base: property.knowledge_base
        };
      }

      console.log('❌ PropertyService: Property not found for ID:', conversation.property_id);
      return null;
    } catch (error) {
      console.error('❌ PropertyService: Error in getPropertyByPhone:', error);
      return null;
    }
  }

  async findPropertyByCode(code: string): Promise<Property | null> {
    console.log("🔍 PropertyService: Looking up property with code:", code);
    
    try {
      const { data: property, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('code', code.toString())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("❌ PropertyService: Database error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (property) {
        console.log("✅ PropertyService: Found property:", property.property_name);
        return {
          property_id: property.id,
          property_name: property.property_name,
          address: property.address,
          check_in_time: property.check_in_time || '4:00 PM',
          check_out_time: property.check_out_time || '11:00 AM',
          wifi_name: property.wifi_name,
          wifi_password: property.wifi_password,
          access_instructions: property.access_instructions,
          directions_to_property: property.directions_to_property,
          parking_instructions: property.parking_instructions,
          emergency_contact: property.emergency_contact,
          house_rules: property.house_rules,
          amenities: property.amenities,
          local_recommendations: property.local_recommendations,
          cleaning_instructions: property.cleaning_instructions,
          special_notes: property.special_notes,
          knowledge_base: property.knowledge_base
        };
      }

      console.log("❌ PropertyService: No property found for code:", code);
      return null;
    } catch (error) {
      console.error("❌ PropertyService: Error in findPropertyByCode:", error);
      throw error;
    }
  }

  async getPropertyById(propertyId: string): Promise<Property | null> {
    console.log("🔍 PropertyService: Getting property by ID:", propertyId);
    
    if (!propertyId) {
      console.log("❌ PropertyService: No property ID provided");
      return null;
    }

    try {
      const { data: property, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) {
        console.error("❌ PropertyService: Error getting property info:", error);
        return null;
      }

      if (property) {
        console.log("✅ PropertyService: Retrieved property:", property.property_name);
        return {
          property_id: property.id,
          property_name: property.property_name,
          address: property.address,
          check_in_time: property.check_in_time,
          check_out_time: property.check_out_time,
          wifi_name: property.wifi_name,
          wifi_password: property.wifi_password,
          access_instructions: property.access_instructions,
          directions_to_property: property.directions_to_property,
          parking_instructions: property.parking_instructions,
          emergency_contact: property.emergency_contact,
          house_rules: property.house_rules,
          amenities: property.amenities,
          local_recommendations: property.local_recommendations,
          cleaning_instructions: property.cleaning_instructions,
          special_notes: property.special_notes,
          knowledge_base: property.knowledge_base
        };
      }

      console.log("❌ PropertyService: Property not found for ID:", propertyId);
      return null;
    } catch (error) {
      console.error("❌ PropertyService: Error getting property info:", error);
      return null;
    }
  }
}
