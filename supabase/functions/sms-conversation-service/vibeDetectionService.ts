
export class VibeDetectionService {
  static detectVibeIntent(message: string): boolean {
    const vibeKeywords = [
      'vibe', 'ambience', 'atmosphere', 'what\'s it like', 'is it chill', 
      'loud', 'romantic', 'casual', 'fancy', 'upscale', 'family friendly',
      'crowded', 'quiet', 'lively', 'cozy', 'trendy', 'laid back'
    ];
    
    const lowerMessage = message.toLowerCase();
    return vibeKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static detectBusynessIntent(message: string): boolean {
    const busynessKeywords = [
      'busy', 'crowded', 'packed', 'how many people', 'wait time',
      'popular times', 'rush hour', 'peak hours', 'slow', 'empty',
      'busy right now', 'how crowded', 'is it busy'
    ];
    
    const lowerMessage = message.toLowerCase();
    return busynessKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static detectPropertySpecificIntent(message: string): boolean {
    const propertyKeywords = [
      'how to use', 'where is', 'detergent', 'pool heater', 'hot tub',
      'washer', 'dryer', 'thermostat', 'remote control', 'key', 'lock',
      'in-unit', 'laundry', 'kitchen', 'bathroom', 'bedroom', 'living room'
    ];
    
    const lowerMessage = message.toLowerCase();
    return propertyKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static generateVibeResponse(placeName: string, vibeDescription: string, photoUrl?: string): string {
    let response = `${placeName} has a ${vibeDescription} vibe.`;
    
    if (photoUrl) {
      response += ` Here's a photo to get the vibe: ${photoUrl}`;
    } else {
      // Generate Google Images search link
      const searchQuery = encodeURIComponent(`${placeName} restaurant interior photos`);
      response += ` Check out photos here: https://www.google.com/search?tbm=isch&q=${searchQuery}`;
    }
    
    return response;
  }

  static generateBusynessResponse(placeName: string, currentHour: number, placeType: string): string {
    let busynessLevel = 'moderate';
    let timeContext = '';
    
    // Time-based logic for different venue types
    if (placeType.includes('breakfast') || placeType.includes('diner')) {
      if (currentHour >= 7 && currentHour <= 10) {
        busynessLevel = 'busy';
        timeContext = 'breakfast rush';
      } else if (currentHour >= 11 && currentHour <= 14) {
        busynessLevel = 'moderate';
        timeContext = 'lunch time';
      } else {
        busynessLevel = 'quiet';
        timeContext = 'off-peak hours';
      }
    } else if (placeType.includes('restaurant') || placeType.includes('dining')) {
      if (currentHour >= 18 && currentHour <= 20) {
        busynessLevel = 'busy';
        timeContext = 'dinner rush';
      } else if (currentHour >= 12 && currentHour <= 14) {
        busynessLevel = 'moderate';
        timeContext = 'lunch time';
      } else {
        busynessLevel = 'quiet';
        timeContext = 'off-peak hours';
      }
    } else if (placeType.includes('bar') || placeType.includes('cocktail')) {
      if (currentHour >= 19 && currentHour <= 23) {
        busynessLevel = 'busy';
        timeContext = 'evening crowd';
      } else {
        busynessLevel = 'quiet';
        timeContext = 'early hours';
      }
    }
    
    return `${placeName} is usually ${busynessLevel} around this time (${timeContext}). ${this.getBusynessAdvice(busynessLevel)}`;
  }

  private static getBusynessAdvice(level: string): string {
    switch (level) {
      case 'busy':
        return 'You might want to call ahead or expect a short wait.';
      case 'moderate':
        return 'Should be a good time to visit.';
      case 'quiet':
        return 'Perfect time for a relaxed experience.';
      default:
        return '';
    }
  }
}
