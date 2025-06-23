
export class MessageUtils {
  static SMS_CHAR_LIMIT = 160;

  static ensureSmsLimit(response: string): string {
    if (response.length <= this.SMS_CHAR_LIMIT) {
      return response;
    }
    return response.substring(0, this.SMS_CHAR_LIMIT - 3) + '...';
  }

  static matchesAnyKeywords(message: string, keywords: string[]): boolean {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  static matchesLocationKeywords(message: string): boolean {
    const keywords = [
      'beach', 'restaurant', 'food', 'eat', 'dining', 'drink', 'bar',
      'things to do', 'attractions', 'activities', 'directions'
    ];
    return this.matchesAnyKeywords(message, keywords);
  }

  static matchesServiceKeywords(message: string): boolean {
    const serviceKeywords = [
      'wifi', 'wi-fi', 'internet', 'password', 'network',
      'parking', 'park', 'car', 'garage',
      'check in', 'check out', 'checkin', 'checkout'
    ];
    return this.matchesAnyKeywords(message, serviceKeywords);
  }

  static isConversationPaused(lastInteractionTimestamp: string): boolean {
    if (!lastInteractionTimestamp) return false;
    
    const now = new Date();
    const lastInteraction = new Date(lastInteractionTimestamp);
    const diffMinutes = (now - lastInteraction) / (1000 * 60);
    
    return diffMinutes > 30;
  }

  static guessTimezoneFromAddress(address: string): string {
    if (!address) return 'UTC';
    
    const addressLower = address.toLowerCase();
    const timezoneMap = {
      'san juan': 'America/Puerto_Rico',
      'puerto rico': 'America/Puerto_Rico',
      'miami': 'America/New_York',
      'new york': 'America/New_York',
      'los angeles': 'America/Los_Angeles',
      'chicago': 'America/Chicago'
    };

    for (const [location, timezone] of Object.entries(timezoneMap)) {
      if (addressLower.includes(location)) {
        return timezone;
      }
    }

    return 'UTC';
  }
}
