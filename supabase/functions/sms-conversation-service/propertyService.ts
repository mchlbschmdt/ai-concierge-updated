
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
        check_out_time: property.check_out_time || '11:00 AM'
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
}
