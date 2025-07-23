
export class MenuService {
  static extractMenuIntent(message: string): boolean {
    const menuKeywords = [
      'menu', 'what do they have', 'what food', 'food options', 'what dishes',
      'what can i order', 'what do they serve', 'food menu', 'dishes', 'meals',
      'do they have', 'any vegan', 'vegetarian options', 'gluten free'
    ];
    
    const lowerMessage = message.toLowerCase();
    return menuKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static generateMenuResponse(restaurantName: string, propertyAddress?: string): string {
    // v3.1 Enhanced menu response with contextual follow-ups
    const menuSearchQuery = encodeURIComponent(`${restaurantName} menu`);
    const yelpQuery = encodeURIComponent(`${restaurantName} orlando`);
    const googleQuery = encodeURIComponent(`${restaurantName} menu orlando`);
    
    return `Here's how to find ${restaurantName}'s menu:

📱 Search "${restaurantName} menu" on Google for latest options
⭐ Check Yelp: https://www.yelp.com/search?find_desc=${yelpQuery}
🔍 Google search: https://www.google.com/search?q=${googleQuery}
📞 Call them directly for today's specials

Want me to find similar restaurants or help with dietary preferences?`;
  }

  // Enhanced menu follow-up with vibe and visual context
  static generateMenuFollowUp(restaurantName: string, context: string): string {
    if (context.includes('photo') || context.includes('picture') || context.includes('vibe') || context.includes('atmosphere')) {
      const yelpQuery = encodeURIComponent(`${restaurantName} orlando`);
      const googleQuery = encodeURIComponent(`${restaurantName} photos orlando`);
      
      return `Check ${restaurantName}'s vibe and photos:
⭐ Yelp: https://www.yelp.com/search?find_desc=${yelpQuery}
📸 Google: https://www.google.com/search?q=${googleQuery}&tbm=isch

Want similar spots or different atmosphere?`;
    }
    
    if (context.includes('outdoor') || context.includes('patio')) {
      return `${restaurantName} has outdoor seating! Want me to find their contact info or suggest other patio restaurants?`;
    }
    
    if (context.includes('busy') || context.includes('crowd')) {
      return `${restaurantName} can get busy during peak hours. Want me to suggest quieter alternatives or call-ahead info?`;
    }
    
    return `Want me to find more info about ${restaurantName} or suggest similar restaurants?`;
  }

  static async getMenuLink(restaurantName: string): Promise<string | null> {
    // Enhanced menu link detection with known restaurant database
    const restaurantLower = restaurantName.toLowerCase();
    
    // Known restaurant menu links
    const knownMenus = {
      'paddlefish': 'https://www.paddlefishrestaurant.com/menus/',
      'homecomin': 'https://www.homecominkitchen.com/menus/',
      'boathouse': 'https://www.theboathouseorlando.com/menus/',
      'wharf': 'https://www.iconparkorlando.com/restaurants/the-wharf/',
      'raglan road': 'https://www.raglanroad.com/menus/',
      'wolfgang puck': 'https://www.wolfgangpuck.com/dining/bar-grill-disney-springs/',
    };
    
    for (const [key, url] of Object.entries(knownMenus)) {
      if (restaurantLower.includes(key)) {
        return url;
      }
    }
    
    return null;
  }

  static generateSpecificFoodResponse(message: string, restaurantName: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Detect specific food queries
    if (lowerMessage.includes('pizza')) {
      return `${restaurantName} does serve pizza! Their wood-fired options are popular. Want me to find their full menu or suggest other pizza places nearby?`;
    }
    
    if (lowerMessage.includes('vegan') || lowerMessage.includes('vegetarian')) {
      return `${restaurantName} has vegetarian options! For specific vegan choices, I'd recommend calling them or checking their online menu. Want me to find other vegan-friendly spots nearby?`;
    }
    
    if (lowerMessage.includes('gluten free')) {
      return `${restaurantName} offers gluten-free options! Most Orlando restaurants are accommodating. Want me to find their contact info or suggest other gluten-free friendly places?`;
    }
    
    if (lowerMessage.includes('seafood')) {
      return `${restaurantName} has excellent seafood! They're known for fresh catches. Want me to find their current specials or suggest other seafood spots?`;
    }
    
    return `${restaurantName} has a diverse menu! Want me to find their full menu online or suggest similar restaurants nearby?`;
  }

  static detectSpecificFoodQuery(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    const foodTypes = [
      'pizza', 'burger', 'seafood', 'italian', 'mexican', 'chinese', 'sushi',
      'vegan', 'vegetarian', 'gluten free', 'steak', 'chicken', 'pasta'
    ];
    
    for (const foodType of foodTypes) {
      if (lowerMessage.includes(foodType)) {
        return foodType;
      }
    }
    
    return null;
  }
}
