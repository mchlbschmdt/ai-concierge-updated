
export class LocationService {
  static async getPropertyCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // For now, return null to use existing OpenAI-based distance estimation
      // This can be enhanced with Google Maps Geocoding API integration
      return null;
    } catch (error) {
      console.error('Error getting property coordinates:', error);
      return null;
    }
  }

  static async getAccurateDistance(
    propertyAddress: string,
    restaurantName: string
  ): Promise<{ distance: string; duration: string } | null> {
    try {
      // Placeholder for Google Maps Distance Matrix API integration
      // For now, return null to use existing OpenAI-based distance estimation
      return null;
    } catch (error) {
      console.error('Error getting accurate distance:', error);
      return null;
    }
  }

  static determinePropertyType(address: string): string {
    const lowerAddress = address.toLowerCase();
    
    if (lowerAddress.includes('reunion') || lowerAddress.includes('reunion resort')) {
      return 'reunion_resort';
    }
    if (lowerAddress.includes('disney') || lowerAddress.includes('kissimmee')) {
      return 'disney_area';
    }
    if (lowerAddress.includes('universal') || lowerAddress.includes('orlando')) {
      return 'universal_area';
    }
    
    return 'general_property';
  }
}
