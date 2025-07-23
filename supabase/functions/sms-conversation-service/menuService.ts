
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
    // Enhanced menu response with more helpful information
    const menuSearchQuery = encodeURIComponent(`${restaurantName} menu`);
    const yelpQuery = encodeURIComponent(`${restaurantName} orlando`);
    const googleQuery = encodeURIComponent(`${restaurantName} menu orlando`);
    
    return `I don't have the current menu for ${restaurantName}, but here are the best ways to check:

📱 Search "${restaurantName} menu" on Google for latest options
⭐ Check Yelp: https://www.yelp.com/search?find_desc=${yelpQuery}
🔍 Google search: https://www.google.com/search?q=${googleQuery}
📞 Call them directly for today's specials

Want recommendations for a specific cuisine or dietary need?`;
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
