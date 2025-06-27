
export class ContextualResponseService {
  static generateHelpfulFallback(context: any, lastIntent?: string, propertyType?: string): string {
    const guestName = context?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    // Context-aware fallbacks based on conversation history
    if (lastIntent === 'ask_food_recommendations' || context?.dining_conversation_state) {
      return `${namePrefix}want help with a different restaurant, specific cuisine, or dining vibe?`;
    }
    
    if (lastIntent === 'ask_wifi' || context?.wifi_troubleshooting_state) {
      return `${namePrefix}still having WiFi trouble, or can I help with something else like checkout time or local recommendations?`;
    }
    
    if (lastIntent === 'ask_amenity' || lastIntent === 'amenity_request') {
      return `${namePrefix}want info about other amenities, or help with dining and local recommendations?`;
    }
    
    if (lastIntent === 'ask_activities') {
      return `${namePrefix}want more activity ideas, restaurant recommendations, or property info?`;
    }
    
    // Property-specific helpful suggestions
    if (propertyType === 'reunion_resort') {
      return `${namePrefix}I can help with:
• Restaurant recommendations near Reunion
• Water park hours and shuttle times  
• WiFi, parking, or checkout details
• Local activities and attractions

What would be most helpful?`;
    }
    
    if (propertyType === 'disney_area') {
      return `${namePrefix}I can help with:
• Disney dining and park recommendations
• Shuttle schedules and transportation
• WiFi, parking, or property details
• Local activities beyond the parks

What can I help you with?`;
    }
    
    // General helpful fallback
    return `${namePrefix}I can help with:
• Restaurant and dining recommendations
• WiFi, parking, or checkout details  
• Local activities and attractions
• Property amenities and services

What would be most helpful right now?`;
  }

  static generateClarificationQuestion(message: string, context: any): string {
    const lowerMessage = message.toLowerCase();
    const guestName = context?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    // Detect vague requests and provide specific clarification
    if (lowerMessage.includes('there') || lowerMessage.includes('here') || lowerMessage.includes('that place')) {
      return `${namePrefix}just to clarify—were you asking about WiFi, dining, or something else specific?`;
    }
    
    if (lowerMessage.includes('they') || lowerMessage.includes('it')) {
      const lastRestaurant = context?.last_recommended_restaurant;
      if (lastRestaurant) {
        return `${namePrefix}are you asking about ${lastRestaurant}, or a different restaurant?`;
      }
      return `${namePrefix}want to clarify—are you asking about a restaurant, amenity, or something else?`;
    }
    
    if (lowerMessage.includes('open') || lowerMessage.includes('hours')) {
      return `${namePrefix}are you asking about restaurant hours, amenity hours, or something else?`;
    }
    
    if (lowerMessage.length < 20 && (lowerMessage.includes('yes') || lowerMessage.includes('no'))) {
      return `${namePrefix}got it! What else can I help you with—dining recommendations, WiFi, or property info?`;
    }
    
    return `${namePrefix}I want to make sure I help you with the right thing. Are you looking for:
• Restaurant recommendations
• Property amenities or services
• WiFi or technical help
• Local activities and attractions

What would be most helpful?`;
  }

  static generateNextStepSuggestion(intent: string, propertyType: string, context: any): string {
    const guestName = context?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    switch (intent) {
      case 'ask_food_recommendations':
        return `${namePrefix}want help with reservations, directions to any of these places, or looking for a different cuisine?`;
      
      case 'ask_wifi':
        return `${namePrefix}if you're all set with WiFi, I can help with restaurant recommendations or checkout details!`;
      
      case 'ask_amenity':
        return `${namePrefix}want info about other amenities, dining recommendations, or local activities?`;
      
      case 'ask_activities':
        return `${namePrefix}want specific details about any of these activities, or help with dining recommendations?`;
      
      case 'ask_directions':
        return `${namePrefix}need help with anything else—maybe restaurant recommendations or property amenities?`;
      
      case 'ask_parking':
        return `${namePrefix}all set with parking info? I can help with dining recommendations or local activities!`;
      
      default:
        return this.generateHelpfulFallback(context, intent, propertyType);
    }
  }

  static shouldUseContextualResponse(message: string, context: any): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Messages that clearly need contextual handling
    const contextualTriggers = [
      'there', 'here', 'that place', 'they', 'it', 'the one',
      'what about', 'how about', 'what else', 'anything else'
    ];
    
    return contextualTriggers.some(trigger => lowerMessage.includes(trigger));
  }
}
