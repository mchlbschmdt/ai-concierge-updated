import { Conversation } from './types.ts';

export interface DiversificationContext {
  requestType: string;
  previousRecommendations: string[];
  conversationHistory: any[];
  timeOfDay: string;
  guestPreferences: any;
}

export interface DiversificationResult {
  shouldDiversify: boolean;
  rejectedOptions: string[];
  diversificationNote?: string;
}

export class RecommendationDiversifier {
  /**
   * Analyzes if recommendations should be diversified to avoid repetition
   */
  static analyzeForDiversification(context: DiversificationContext): DiversificationResult {
    const { requestType, previousRecommendations, conversationHistory } = context;
    
    // Extract previously recommended place names
    const previousPlaces = this.extractPlaceNames(previousRecommendations);
    const rejectedOptions: string[] = [];
    
    // Check for repetitive recommendations
    const repetitionCount = this.countRepetitions(previousPlaces);
    const shouldDiversify = repetitionCount >= 2 || this.hasOffTopicRepetition(requestType, previousRecommendations);
    
    if (shouldDiversify) {
      // Add frequently recommended places to rejected list
      const frequentPlaces = this.getFrequentlyRecommended(previousPlaces);
      rejectedOptions.push(...frequentPlaces);
      
      // Generate diversification note
      const diversificationNote = this.generateDiversificationNote(requestType, frequentPlaces);
      
      return {
        shouldDiversify: true,
        rejectedOptions,
        diversificationNote
      };
    }
    
    return {
      shouldDiversify: false,
      rejectedOptions: []
    };
  }
  
  /**
   * Extracts place names from recommendation text
   */
  private static extractPlaceNames(recommendations: string[]): string[] {
    const places: string[] = [];
    
    recommendations.forEach(rec => {
      // Look for common restaurant/place name patterns
      const patterns = [
        /([A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)/g, // "Maple Street Biscuit Co"
        /([A-Z][a-z]+ [A-Z][a-z]+)/g, // "Olive Garden"
        /([A-Z][a-z]+['s]+ [A-Z][a-z]+)/g, // "McDonald's Restaurant"
      ];
      
      patterns.forEach(pattern => {
        const matches = rec.match(pattern);
        if (matches) {
          places.push(...matches);
        }
      });
    });
    
    return places;
  }
  
  /**
   * Counts how many times places have been repeated
   */
  private static countRepetitions(places: string[]): number {
    const counts = new Map<string, number>();
    
    places.forEach(place => {
      const normalized = place.toLowerCase().trim();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
    
    return Math.max(...Array.from(counts.values()));
  }
  
  /**
   * Checks if there's off-topic repetition (e.g., breakfast place recommended for dinner)
   */
  private static hasOffTopicRepetition(requestType: string, recommendations: string[]): boolean {
    const breakfastIndicators = ['breakfast', 'biscuit', 'morning', 'brunch'];
    const dinnerRequest = ['dinner', 'evening'].some(word => requestType.toLowerCase().includes(word));
    
    if (dinnerRequest) {
      return recommendations.some(rec => 
        breakfastIndicators.some(indicator => 
          rec.toLowerCase().includes(indicator)
        )
      );
    }
    
    return false;
  }
  
  /**
   * Gets places that have been recommended too frequently
   */
  private static getFrequentlyRecommended(places: string[]): string[] {
    const counts = new Map<string, number>();
    
    places.forEach(place => {
      const normalized = place.toLowerCase().trim();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
    
    // Return places recommended 2+ times
    return Array.from(counts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([place, _]) => place);
  }
  
  /**
   * Generates a note explaining why diversification is happening
   */
  private static generateDiversificationNote(requestType: string, rejectedPlaces: string[]): string {
    if (rejectedPlaces.length === 0) {
      return "Looking for some fresh options for you!";
    }
    
    const placesList = rejectedPlaces.join(', ');
    
    if (requestType.includes('dinner') && rejectedPlaces.some(place => place.includes('breakfast') || place.includes('biscuit'))) {
      return "Since you're looking for dinner options, let me suggest some evening-appropriate restaurants instead.";
    }
    
    return `I'll find some different options since I've already mentioned ${placesList}.`;
  }
  
  /**
   * Creates rejection filters for OpenAI API calls
   */
  static createRejectionFilters(rejectedOptions: string[]): string {
    if (rejectedOptions.length === 0) {
      return "";
    }
    
    const filters = rejectedOptions.map(option => `"${option}"`).join(', ');
    return `Do not recommend ${filters} as they have been suggested recently. Focus on different, fresh options.`;
  }
  
  /**
   * Validates if a recommendation is appropriately categorized
   */
  static validateRecommendationCategory(requestType: string, recommendation: string): boolean {
    const categoryMismatches = [
      {
        request: ['dinner', 'evening', 'supper'],
        inappropriate: ['breakfast', 'morning', 'brunch', 'biscuit']
      },
      {
        request: ['coffee', 'cafe'],
        inappropriate: ['full meal', 'dinner', 'lunch menu']
      },
      {
        request: ['activities', 'attractions', 'things to do'],
        inappropriate: ['restaurant', 'food', 'dining', 'eat']
      }
    ];
    
    const lowerRequest = requestType.toLowerCase();
    const lowerRecommendation = recommendation.toLowerCase();
    
    for (const mismatch of categoryMismatches) {
      const matchesRequest = mismatch.request.some(term => lowerRequest.includes(term));
      const hasInappropriate = mismatch.inappropriate.some(term => lowerRecommendation.includes(term));
      
      if (matchesRequest && hasInappropriate) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Gets conversation history for diversification analysis
   */
  static extractConversationHistory(conversation: Conversation): any[] {
    const context = conversation?.conversation_context || {};
    const flow = context.conversation_flow || {};
    
    return flow.recentTopics || [];
  }
}