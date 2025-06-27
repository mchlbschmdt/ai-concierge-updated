
export class MenuService {
  static extractMenuIntent(message: string): boolean {
    const menuKeywords = [
      'menu', 'what do they have', 'what food', 'food options', 'what dishes',
      'what can i order', 'what do they serve', 'food menu', 'dishes', 'meals'
    ];
    
    const lowerMessage = message.toLowerCase();
    return menuKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static generateMenuResponse(restaurantName: string): string {
    // In a real implementation, this would check a database of known restaurant menus
    // For now, provide a helpful response with search suggestions
    
    const menuSearchQuery = encodeURIComponent(`${restaurantName} menu`);
    const yelpQuery = encodeURIComponent(`${restaurantName} yelp`);
    
    return `I don't have the exact menu for ${restaurantName}, but here are some ways to check:

• Google "${restaurantName} menu" for the latest options
• Check their Yelp page: https://www.yelp.com/search?find_desc=${yelpQuery}
• Call them directly for current specials

Need help with anything else?`;
  }

  static async getMenuLink(restaurantName: string): Promise<string | null> {
    // Placeholder for future menu database integration
    // Could be enhanced with Yelp API, Google Places API, or restaurant partner APIs
    return null;
  }
}
