
export class MessageUtils {
  static SMS_CHAR_LIMIT = 160;

  static ensureSmsLimit(response: string): string[] {
    if (response.length <= this.SMS_CHAR_LIMIT) {
      return [response];
    }

    // Split into multiple segments
    const segments: string[] = [];
    let remaining = response;
    let segmentIndex = 1;
    
    // Calculate how many segments we'll need
    const totalSegments = Math.ceil(response.length / (this.SMS_CHAR_LIMIT - 10)); // Reserve space for "1/2" indicator
    
    while (remaining.length > 0) {
      let segmentLength = this.SMS_CHAR_LIMIT;
      
      // Reserve space for continuation indicator if we have multiple segments
      if (totalSegments > 1) {
        const indicator = ` ${segmentIndex}/${totalSegments}`;
        segmentLength = this.SMS_CHAR_LIMIT - indicator.length;
      }
      
      if (remaining.length <= segmentLength) {
        // Last segment
        let finalSegment = remaining;
        if (totalSegments > 1) {
          finalSegment += ` ${segmentIndex}/${totalSegments}`;
        }
        segments.push(finalSegment);
        break;
      }
      
      // Find a good break point (prefer word boundaries)
      let breakPoint = segmentLength;
      const lastSpace = remaining.lastIndexOf(' ', segmentLength - 1);
      if (lastSpace > segmentLength * 0.8) { // Only use word boundary if it's not too far back
        breakPoint = lastSpace;
      }
      
      let segment = remaining.substring(0, breakPoint);
      if (totalSegments > 1) {
        segment += ` ${segmentIndex}/${totalSegments}`;
      }
      
      segments.push(segment);
      remaining = remaining.substring(breakPoint).trim();
      segmentIndex++;
    }
    
    return segments;
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
    const diffMinutes = (now.getTime() - lastInteraction.getTime()) / (1000 * 60);
    
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
