
export class AmenityService {
  static detectAmenityQuery(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('water park') || lowerMessage.includes('pool hours')) {
      return 'water_park';
    }
    if (lowerMessage.includes('shuttle') || lowerMessage.includes('transportation')) {
      return 'shuttle';
    }
    if (lowerMessage.includes('gym') || lowerMessage.includes('fitness')) {
      return 'fitness';
    }
    if (lowerMessage.includes('spa') || lowerMessage.includes('wellness')) {
      return 'spa';
    }
    
    return null;
  }

  static generateAmenityResponse(amenityType: string, propertyType: string, propertyName: string): string {
    switch (amenityType) {
      case 'water_park':
        if (propertyType === 'reunion_resort') {
          return `The Reunion Resort Water Park is typically open from 10 AM to 6 PM (seasonal hours may vary). Want me to help with wristband info or directions?

Or were you asking about a different water park nearby?`;
        } else if (propertyType === 'disney_area') {
          return `There are several water parks in the Disney area:

• Disney's Blizzard Beach & Typhoon Lagoon
• Fun Spot Orlando
• Icon Park attractions

Were you looking for Disney parks specifically or something closer to ${propertyName}?`;
        }
        return `I can help you find water parks near ${propertyName}. Were you looking for resort pools or public water parks?`;
        
      case 'shuttle':
        if (propertyType === 'reunion_resort') {
          return `The Disney shuttle typically runs from the Grande Lobby at scheduled times (usually starting around 9 AM). Want me to help confirm the current schedule?

Or were you asking about a different shuttle service?`;
        } else if (propertyType === 'disney_area') {
          return `Many Disney area properties offer shuttle services. Check with your property host for:

• Disney park shuttles
• Airport transportation
• Universal Studios shuttles

Would you like me to contact your host for shuttle details?`;
        }
        return `I can help you find transportation options from ${propertyName}. Were you looking for airport shuttles or theme park transportation?`;
        
      default:
        return `I can help you find information about amenities at ${propertyName}. What specific amenity were you asking about?`;
    }
  }
}
