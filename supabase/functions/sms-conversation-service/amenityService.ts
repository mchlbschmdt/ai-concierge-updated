
export class AmenityService {
  static detectAmenityQuery(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // BBQ/Grill detection
    if (lowerMessage.includes('grill') || lowerMessage.includes('bbq') || lowerMessage.includes('barbecue')) {
      return 'grill';
    }
    // Pool detection  
    if (lowerMessage.includes('pool') || lowerMessage.includes('swimming') || lowerMessage.includes('water park')) {
      return 'pool';
    }
    // Hot tub detection
    if (lowerMessage.includes('hot tub') || lowerMessage.includes('spa') || lowerMessage.includes('jacuzzi')) {
      return 'hot_tub';
    }
    // Air conditioning
    if (lowerMessage.includes('ac') || lowerMessage.includes('air conditioning') || lowerMessage.includes('cooling')) {
      return 'air_conditioning';
    }
    // WiFi
    if (lowerMessage.includes('wifi') || lowerMessage.includes('internet') || lowerMessage.includes('password')) {
      return 'wifi';
    }
    // Parking
    if (lowerMessage.includes('parking') || lowerMessage.includes('garage') || lowerMessage.includes('valet')) {
      return 'parking';
    }
    // Shuttle/Transportation
    if (lowerMessage.includes('shuttle') || lowerMessage.includes('transportation') || lowerMessage.includes('disney shuttle')) {
      return 'shuttle';
    }
    // Fitness/Gym
    if (lowerMessage.includes('gym') || lowerMessage.includes('fitness') || lowerMessage.includes('workout')) {
      return 'fitness';
    }
    // Dining
    if (lowerMessage.includes('restaurant') || lowerMessage.includes('dining') || lowerMessage.includes('room service')) {
      return 'dining';
    }
    
    return null;
  }

  static generateAmenityResponse(amenityType: string, propertyType: string, propertyName: string, propertyData?: any): string {
    // First check actual property amenities if available
    if (propertyData?.amenities) {
      const amenities = typeof propertyData.amenities === 'string' 
        ? JSON.parse(propertyData.amenities) 
        : propertyData.amenities;
      
      switch (amenityType) {
        case 'grill':
          if (amenities.includes('BBQ Grill')) {
            return `🔥 Yes! There's a BBQ grill available for you to use! Perfect for grilling up some dinner. 🍖

Want me to recommend what groceries to pick up for a cookout?`;
          } else {
            return `🔥 No grill at this property, but I can recommend great BBQ restaurants nearby if you're craving grilled food! 🍖`;
          }
          
        case 'pool':
          if (amenities.includes('Pool')) {
            return `🏊‍♀️ Yes! There's a pool for you to enjoy! ${propertyData.special_notes?.includes('pool') ? 'Check your welcome guide for any pool-specific instructions.' : ''}

Perfect for cooling off! 🌊`;
          } else {
            return `🏊‍♀️ No pool at this property, but I can find nearby pools or water parks if you'd like! 🌊`;
          }
          
        case 'hot_tub':
          if (amenities.includes('Hot Tub')) {
            let response = `🛁 Yes! There's a hot tub for you to relax in! ♨️`;
            
            // Add specific instructions if available
            if (propertyData.special_notes?.includes('hot tub') || propertyData.special_notes?.includes('Hot Tub')) {
              response += `\n\n${propertyData.special_notes.split('Hot Tub Info:')[1]?.split('\n\n')[0] || 'Check your welcome guide for operating instructions!'}`;
            }
            
            return response;
          } else {
            return `🛁 No hot tub at this property, but I can recommend nearby spas if you're looking to relax! ♨️`;
          }
          
        case 'air_conditioning':
          if (amenities.includes('Air Conditioning')) {
            let response = `❄️ Yes! Air conditioning is available to keep you comfortable! 🌡️`;
            
            if (propertyData.special_notes?.includes('HVAC') || propertyData.special_notes?.includes('A/C')) {
              response += `\n\n💡 Tip: ${propertyData.special_notes.split('HVAC')[1]?.split('\n\n')[0] || 'Check your welcome guide for AC instructions!'}`;
            }
            
            return response;
          } else {
            return `❄️ AC info not specified, but most properties have climate control. Check with your host if needed! 🌡️`;
          }
          
        case 'wifi':
          if (propertyData.wifi_name && propertyData.wifi_password) {
            return `📶 WiFi Info:
Network: "${propertyData.wifi_name}"
Password: "${propertyData.wifi_password}"

You should be all set to connect! 📱`;
          } else {
            return `📶 WiFi is available - check your welcome guide or contact your host for the network details! 📱`;
          }
      }
    }

    // Fallback to generic responses
    switch (amenityType) {
      case 'grill':
        return `🔥 Let me check if there's a BBQ grill available for you to use! 🍖`;
        
      case 'pool':
      case 'water_park':
        return `🏊‍♀️ I don't have confirmed water park details for ${propertyName} in the guide. Want me to check with your host, or would you prefer nearby public options?`;

      case 'shuttle':
        return `🚌 I don't have confirmed shuttle info for ${propertyName}. I can ask your host for the current schedule, or help you sort out rideshare/airport transport — which would help?`;

      case 'fitness':
        return `💪 I don't have confirmed fitness/gym details for ${propertyName} in the guide. Want me to check with your host?`;

      case 'spa':
        return `🧘‍♀️ I don't have confirmed spa details for ${propertyName}. Want me to check with your host for on-site options, or find nearby spas?`;

      case 'dining':
        return `🍽️ Dining options at ${propertyName}:

🏨 On-site restaurants (check with front desk)
🍕 Room service availability
🥡 Nearby delivery options
🍽️ Local restaurant recommendations

Want specific restaurant recommendations or help with room service?`;

      case 'parking':
        return `🚗 Parking at ${propertyName}:

🏨 Resort parking (usually complimentary)
🅿️ Designated guest parking areas
🔐 Security and access information
🚗 Valet services (if available)

Want directions to parking or info about valet services?`;
        
      default:
        return `🏨 I can help you find information about amenities at ${propertyName}. What specific amenity were you asking about?

🏊‍♀️ Pools and water features
🍽️ Dining and restaurants  
🚌 Transportation and shuttles
💪 Fitness and recreation
🧘‍♀️ Spa and wellness

Just let me know what you're looking for!`;
    }
  }

  static generateAmenityFollowUp(amenityType: string, propertyType: string): string {
    switch (amenityType) {
      case 'water_park':
        return "Want pool hours, wristband info, or directions to other water attractions?";
      case 'shuttle':
        return "Need the exact pickup time, return schedule, or other transportation options?";
      case 'fitness':
        return "Want hours, directions, or info about specific equipment/activities?";
      case 'spa':
        return "Want to make a reservation or learn about specific treatments?";
      case 'dining':
        return "Want specific restaurant recommendations or room service info?";
      case 'parking':
        return "Need directions to parking or details about valet services?";
      default:
        return "Want more details about this amenity or help with something else?";
    }
  }
}
