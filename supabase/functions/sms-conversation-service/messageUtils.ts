
import { Conversation } from './types.ts';

export class MessageUtils {
  static ensureSmsLimit(text: string, maxLength: number = 160): string[] {
    if (text.length <= maxLength) {
      return [text];
    }
    
    const segments = [];
    let remainingText = text;
    
    while (remainingText.length > 0) {
      if (remainingText.length <= maxLength) {
        segments.push(remainingText);
        break;
      }
      
      // Find the best break point (prefer sentence or word boundaries)
      let breakPoint = maxLength;
      const sentenceBreak = remainingText.lastIndexOf('.', maxLength);
      const questionBreak = remainingText.lastIndexOf('?', maxLength);
      const exclamationBreak = remainingText.lastIndexOf('!', maxLength);
      const newlineBreak = remainingText.lastIndexOf('\n', maxLength);
      const spaceBreak = remainingText.lastIndexOf(' ', maxLength);
      
      // Prefer sentence endings, then word boundaries
      if (sentenceBreak > maxLength * 0.7) breakPoint = sentenceBreak + 1;
      else if (questionBreak > maxLength * 0.7) breakPoint = questionBreak + 1;
      else if (exclamationBreak > maxLength * 0.7) breakPoint = exclamationBreak + 1;
      else if (newlineBreak > maxLength * 0.7) breakPoint = newlineBreak + 1;
      else if (spaceBreak > maxLength * 0.7) breakPoint = spaceBreak;
      
      segments.push(remainingText.substring(0, breakPoint).trim());
      remainingText = remainingText.substring(breakPoint).trim();
    }
    
    return segments;
  }

  static isConversationPaused(lastInteractionTimestamp: string | null): boolean {
    if (!lastInteractionTimestamp) return false;
    
    const lastInteraction = new Date(lastInteractionTimestamp);
    const now = new Date();
    const hoursSinceLastInteraction = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastInteraction > 2; // Consider paused after 2+ hours
  }

  static matchesAnyKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  static matchesLocationKeywords(text: string): boolean {
    const locationKeywords = [
      'restaurant', 'food', 'eat', 'dining', 'drink', 'bar', 'coffee', 'cafe',
      'activities', 'things to do', 'attractions', 'beach', 'shopping',
      'directions', 'how to get', 'where is', 'near', 'nearby', 'close'
    ];
    return this.matchesAnyKeywords(text, locationKeywords);
  }

  static matchesServiceKeywords(text: string): boolean {
    const serviceKeywords = [
      'wifi', 'wi-fi', 'internet', 'password', 'network',
      'parking', 'park', 'car', 'garage',
      'check in', 'check out', 'checkin', 'checkout'
    ];
    return this.matchesAnyKeywords(text, serviceKeywords);
  }

  static guessTimezoneFromAddress(address: string | null): string {
    if (!address) return 'UTC';
    
    const addressLower = address.toLowerCase();
    
    // US time zones
    if (addressLower.includes('ca') || addressLower.includes('california')) return 'America/Los_Angeles';
    if (addressLower.includes('ny') || addressLower.includes('new york')) return 'America/New_York';
    if (addressLower.includes('fl') || addressLower.includes('florida')) return 'America/New_York';
    if (addressLower.includes('tx') || addressLower.includes('texas')) return 'America/Chicago';
    if (addressLower.includes('il') || addressLower.includes('chicago')) return 'America/Chicago';
    if (addressLower.includes('wa') || addressLower.includes('washington')) return 'America/Los_Angeles';
    if (addressLower.includes('or') || addressLower.includes('oregon')) return 'America/Los_Angeles';
    if (addressLower.includes('nv') || addressLower.includes('nevada')) return 'America/Los_Angeles';
    if (addressLower.includes('az') || addressLower.includes('arizona')) return 'America/Phoenix';
    if (addressLower.includes('co') || addressLower.includes('colorado')) return 'America/Denver';
    if (addressLower.includes('ut') || addressLower.includes('utah')) return 'America/Denver';
    
    // Default to Eastern for US addresses
    if (addressLower.includes('usa') || addressLower.includes('united states')) return 'America/New_York';
    
    return 'UTC';
  }
}
