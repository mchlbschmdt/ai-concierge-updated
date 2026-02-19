
import { Property } from './types.ts';
import { PropertyLocationAnalyzer } from './propertyLocationAnalyzer.ts';

export class PropertyService {
  constructor(private supabase: any) {}

  // Add the missing static method that was being called
  static async getPropertyByPhone(supabase: any, phoneNumber: string): Promise<Property | null> {
    console.log('🔍 PropertyService: Looking up property by phone number:', phoneNumber);
    
    try {
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
        const baseProperty = {
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
        
        // Enrich with uploaded files content
        const enrichedProperty = this.enrichPropertyWithLocationContext(baseProperty);
        enrichedProperty.uploaded_files_content = await this.fetchUploadedFilesContent(supabase, property.id);
        return enrichedProperty;
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
        const baseProperty = {
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

        const enriched = PropertyService.enrichPropertyWithLocationContext(baseProperty);
        enriched.uploaded_files_content = await PropertyService.fetchUploadedFilesContent(this.supabase, property.id);
        return enriched;
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
        const baseProperty = {
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

        const enriched = PropertyService.enrichPropertyWithLocationContext(baseProperty);
        enriched.uploaded_files_content = await PropertyService.fetchUploadedFilesContent(this.supabase, property.id);
        return enriched;
      }

      console.log("❌ PropertyService: Property not found for ID:", propertyId);
      return null;
    } catch (error) {
      console.error("❌ PropertyService: Error getting property info:", error);
      return null;
    }
  }

  static async linkPhoneToProperty(supabase: any, phoneNumber: string, propertyId: string): Promise<boolean> {
    console.log("🔗 PropertyService: Linking phone to property:", phoneNumber, "->", propertyId);
    
    try {
      const { error } = await supabase
        .from('sms_conversations')
        .update({
          property_id: propertyId,
          property_confirmed: true,
          conversation_state: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('phone_number', phoneNumber);

      if (error) {
        console.error("❌ PropertyService: Error linking phone to property:", error);
        return false;
      }

      console.log("✅ PropertyService: Successfully linked phone to property");
      return true;
    } catch (error) {
      console.error("❌ PropertyService: Error in linkPhoneToProperty:", error);
      return false;
    }
  }

  /**
   * Fetch uploaded file contents for a property from Supabase Storage
   */
  static async fetchUploadedFilesContent(supabase: any, propertyId: string): Promise<string> {
    try {
      console.log('📁 PropertyService: Fetching uploaded files for property:', propertyId);

      const { data: files, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('metadata->>property_id', propertyId);

      if (error) {
        console.error('❌ PropertyService: Error fetching file_uploads:', error);
        return '';
      }

      if (!files || files.length === 0) {
        console.log('📁 PropertyService: No uploaded files found for property');
        return '';
      }

      console.log(`📁 PropertyService: Found ${files.length} uploaded files`);

      const textTypes = ['application/json', 'text/plain', 'text/csv'];
      const contentParts: string[] = [];

      for (const file of files) {
        if (!textTypes.includes(file.file_type)) {
          console.log(`📁 Skipping non-text file: ${file.original_name} (${file.file_type})`);
          continue;
        }

        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('property-files')
            .download(file.storage_path);

          if (downloadError) {
            console.error(`❌ Error downloading ${file.original_name}:`, downloadError);
            continue;
          }

          const text = await fileData.text();
          // Truncate to 3000 chars per file
          const truncated = text.length > 3000 ? text.substring(0, 3000) + '... [truncated]' : text;
          contentParts.push(`--- File: ${file.original_name} ---\n${truncated}`);
          console.log(`✅ Loaded file content: ${file.original_name} (${text.length} chars)`);
        } catch (fileErr) {
          console.error(`❌ Error reading file ${file.original_name}:`, fileErr);
        }
      }

      return contentParts.join('\n\n');
    } catch (error) {
      console.error('❌ PropertyService: Error in fetchUploadedFilesContent:', error);
      return '';
    }
  }
  
  /**
   * Enrich property with location context for better recommendations
   */
  static enrichPropertyWithLocationContext(property: Property): Property {
    const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
    const resortAmenities = locationContext.resort 
      ? PropertyLocationAnalyzer.getResortAmenities(locationContext.resort)
      : [];
    
    return {
      ...property,
      location_context: locationContext,
      resort_amenities: resortAmenities
    };
  }
}
