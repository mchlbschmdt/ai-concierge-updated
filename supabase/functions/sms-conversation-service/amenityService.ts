
export class AmenityService {
  static detectAmenityQuery(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('water park') || lowerMessage.includes('pool hours') || lowerMessage.includes('swimming')) {
      return 'water_park';
    }
    if (lowerMessage.includes('shuttle') || lowerMessage.includes('transportation') || lowerMessage.includes('disney shuttle')) {
      return 'shuttle';
    }
    if (lowerMessage.includes('gym') || lowerMessage.includes('fitness') || lowerMessage.includes('workout')) {
      return 'fitness';
    }
    if (lowerMessage.includes('spa') || lowerMessage.includes('wellness') || lowerMessage.includes('massage')) {
      return 'spa';
    }
    if (lowerMessage.includes('restaurant') || lowerMessage.includes('dining') || lowerMessage.includes('room service')) {
      return 'dining';
    }
    if (lowerMessage.includes('parking') || lowerMessage.includes('garage') || lowerMessage.includes('valet')) {
      return 'parking';
    }
    
    return null;
  }

  static generateAmenityResponse(amenityType: string, propertyType: string, propertyName: string): string {
    switch (amenityType) {
      case 'water_park':
        if (propertyType === 'reunion_resort') {
          return `🏊‍♀️ The Reunion Resort Water Park is typically open 10 AM - 6 PM (seasonal hours may vary)

🎟️ Guest wristbands available at the front desk
🚗 Located at the Grande complex
🌊 Features lazy river, waterslides, and family pool

Want directions to the water park or info about other pools on property?

Or were you asking about a different water park nearby?`;
        } else if (propertyType === 'disney_area') {
          return `🏊‍♀️ Disney area water park options:

🌊 Disney's Blizzard Beach & Typhoon Lagoon
🎢 Fun Spot Orlando (classic water park)
🎡 Icon Park attractions with water features

Were you asking about Disney parks specifically, or looking for something closer to ${propertyName}?

Want help with tickets or transportation?`;
        }
        return `🏊‍♀️ Orlando water park options near ${propertyName}:

🌊 Disney water parks (seasonal)
🎢 Universal's Volcano Bay
🏊‍♀️ Local resort pools and water features

Were you looking for resort pools or public water parks? Want help finding the closest options?`;
        
      case 'shuttle':
        if (propertyType === 'reunion_resort') {
          return `🚌 Reunion Resort shuttle info:

🎢 Disney shuttle: Runs from Grande Lobby
⏰ Typical schedule: First departure ~9 AM
🎫 Complimentary for resort guests
📱 Check front desk for today's exact times

Want me to help you reserve a spot or get return schedule?

Or were you asking about other transportation options?`;
        } else if (propertyType === 'disney_area') {
          return `🚌 Disney area transportation:

🎢 Disney park shuttles (many properties offer these)
✈️ Airport shuttles and ride services
🚌 Universal Studios shuttles
🚗 Rideshare pickup zones

Would you like me to contact your host for ${propertyName}'s specific shuttle schedule?

Or are you looking for airport transportation?`;
        }
        return `🚌 Transportation options from ${propertyName}:

🎢 Theme park shuttles (check with property)
✈️ Airport transportation services
🚗 Rideshare and taxi services
🚌 Public transportation options

Want me to contact your host for specific shuttle details, or are you looking for airport transportation?`;

      case 'fitness':
        if (propertyType === 'reunion_resort') {
          return `💪 Reunion Resort fitness options:

🏋️‍♀️ Fitness center at Grande complex
⏰ Typically open 6 AM - 10 PM
🎾 Tennis courts and golf course
🏊‍♀️ Pool areas for lap swimming

Want directions to the fitness center or info about tennis/golf reservations?`;
        }
        return `💪 Fitness options near ${propertyName}:

🏋️‍♀️ On-site fitness facilities (check with property)
🏃‍♀️ Local gyms and fitness centers
🎾 Tennis courts and recreation areas
🏊‍♀️ Pool areas for exercise

Want me to check what's available at your specific property?`;

      case 'spa':
        if (propertyType === 'reunion_resort') {
          return `🧘‍♀️ Spa and wellness at Reunion:

💆‍♀️ Eleven Spa at Reunion Resort
⏰ Typically open 9 AM - 7 PM
📞 Reservations recommended
🌿 Full service spa treatments

Want help with spa reservations or info about specific treatments?`;
        }
        return `🧘‍♀️ Spa and wellness near ${propertyName}:

💆‍♀️ Resort spa services (check availability)
🌿 Local spa and wellness centers
🧘‍♀️ Massage and therapy options
💅 Salon services

Want me to help find spa options in your area?`;

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
