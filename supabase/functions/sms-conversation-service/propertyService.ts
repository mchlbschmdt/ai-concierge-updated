
import { Property } from './types.ts';

export class PropertyService {
  constructor(private supabase: any) {}

  async findPropertyByCode(code: string): Promise<Property | null> {
    const { data: property, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }

    if (property) {
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

    return null;
  }

  async getPropertyInfo(propertyId: string): Promise<Property | null> {
    if (!propertyId) return null;

    try {
      const { data: property, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      return error ? null : property;
    } catch (error) {
      console.error('Error getting property info:', error);
      return null;
    }
  }

  checkPropertyDataForQuery(property: any, query: string): string | null {
    if (!property) return null;

    const lowerQuery = query.toLowerCase();
    
    // WiFi related queries
    if (this.matchesKeywords(lowerQuery, ['wifi', 'wi-fi', 'internet', 'password', 'network'])) {
      if (property.wifi_name && property.wifi_password) {
        return `WiFi Network: ${property.wifi_name}\nPassword: ${property.wifi_password}`;
      }
    }

    // Parking related queries
    if (this.matchesKeywords(lowerQuery, ['parking', 'park', 'car', 'vehicle'])) {
      if (property.parking_instructions) {
        return `Parking: ${property.parking_instructions}`;
      }
    }

    // Directions related queries
    if (this.matchesKeywords(lowerQuery, ['directions', 'how to get', 'location', 'address', 'where'])) {
      if (property.directions_to_property) {
        return `Directions: ${property.directions_to_property}`;
      }
      if (property.address) {
        return `Address: ${property.address}`;
      }
    }

    // Access/Check-in related queries
    if (this.matchesKeywords(lowerQuery, ['access', 'check in', 'checkin', 'entry', 'key', 'code'])) {
      if (property.access_instructions) {
        return `Access Instructions: ${property.access_instructions}`;
      }
    }

    // Emergency contact queries
    if (this.matchesKeywords(lowerQuery, ['emergency', 'contact', 'help', 'problem', 'issue'])) {
      if (property.emergency_contact) {
        return `Emergency Contact: ${property.emergency_contact}`;
      }
    }

    // House rules queries
    if (this.matchesKeywords(lowerQuery, ['rules', 'policy', 'policies', 'allowed', 'not allowed'])) {
      if (property.house_rules) {
        return `House Rules: ${property.house_rules}`;
      }
    }

    // Local recommendations queries
    if (this.matchesKeywords(lowerQuery, ['food', 'restaurant', 'eat', 'dining', 'drink', 'bar', 'coffee', 'things to do', 'attractions', 'local', 'nearby', 'recommendations'])) {
      if (property.local_recommendations) {
        return `Local Recommendations: ${property.local_recommendations}`;
      }
    }

    // Cleaning instructions
    if (this.matchesKeywords(lowerQuery, ['clean', 'cleaning', 'checkout', 'check out', 'leaving'])) {
      if (property.cleaning_instructions) {
        return `Cleaning Instructions: ${property.cleaning_instructions}`;
      }
    }

    // Special notes or general knowledge base
    if (this.matchesKeywords(lowerQuery, ['hot tub', 'pool', 'amenities', 'facilities', 'how to']) || property.knowledge_base) {
      // Check special notes first
      if (property.special_notes && this.isRelevantToQuery(property.special_notes, query)) {
        return `Special Notes: ${property.special_notes}`;
      }
      
      // Check knowledge base
      if (property.knowledge_base && this.isRelevantToQuery(property.knowledge_base, query)) {
        return property.knowledge_base;
      }
    }

    return null;
  }

  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private isRelevantToQuery(content: string, query: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(' ').filter(word => word.length > 2);
    
    // If at least 30% of query words are found in content, consider it relevant
    const matchedWords = queryWords.filter(word => lowerContent.includes(word));
    return matchedWords.length >= Math.max(1, Math.floor(queryWords.length * 0.3));
  }
}
