
import { Conversation, Property } from './types.ts';
import { MessageUtils } from './messageUtils.ts';

export class ResponseGenerator {
  static getTimeAwareGreeting(timezone = 'UTC'): string {
    try {
      const now = new Date();
      const localTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
      const hour = localTime.getHours();
      
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Hello';
    } catch (error) {
      console.error('Error getting time-aware greeting:', error);
      return 'Hello';
    }
  }

  static getPersonalizedFoodGreeting(message: string, greeting: string, guestName: string | null = null): string {
    const lowerMessage = message.toLowerCase();
    const nameToUse = guestName ? `, ${guestName}` : '';
    
    if (MessageUtils.matchesAnyKeywords(lowerMessage, ['food now', 'hungry', 'eat now', 'dinner now', 'lunch now'])) {
      const urgentPhrases = [
        `${greeting}${nameToUse}! Hungry now? I've got you covered 🙂`,
        `${greeting}${nameToUse}! Ready for a bite? Happy to help 🙂`,
        `${greeting}${nameToUse}! Looks like you're ready for a bite—happy to help 🙂`
      ];
      return urgentPhrases[Math.floor(Math.random() * urgentPhrases.length)];
    }
    
    if (MessageUtils.matchesAnyKeywords(lowerMessage, ['restaurant', 'food', 'eat', 'dining'])) {
      return `${greeting}${nameToUse}! Looking for somewhere great to eat? I've got some perfect spots for you 🙂`;
    }
    
    if (MessageUtils.matchesAnyKeywords(lowerMessage, ['drink', 'bar', 'cocktail', 'beer'])) {
      return `${greeting}${nameToUse}! Ready for drinks? I know some fantastic spots 🙂`;
    }
    
    if (MessageUtils.matchesAnyKeywords(lowerMessage, ['coffee', 'cafe'])) {
      return `${greeting}${nameToUse}! Need your coffee fix? I've got great recommendations 🙂`;
    }
    
    return `${greeting}${nameToUse}! I'd love to help with recommendations 🙂`;
  }

  static getClarifyingQuestion(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (MessageUtils.matchesAnyKeywords(lowerMessage, ['food', 'restaurant', 'eat', 'dining', 'hungry'])) {
      const questions = [
        "Are you in the mood for something quick and casual, or more of a sit-down vibe?",
        "Any cravings—pizza, seafood, tacos?",
        "Feeling like something quick or a nice sit-down meal?"
      ];
      return questions[Math.floor(Math.random() * questions.length)];
    }
    
    if (MessageUtils.matchesAnyKeywords(lowerMessage, ['drink', 'bar', 'cocktail'])) {
      return "Looking for craft cocktails, casual drinks, or maybe rooftop vibes?";
    }
    
    if (MessageUtils.matchesAnyKeywords(lowerMessage, ['things to do', 'activities'])) {
      return "Interested in outdoor activities, cultural spots, or nightlife?";
    }
    
    return "What kind of vibe are you going for?";
  }

  static getDistanceFraming(distance: string): string {
    const distanceNum = parseFloat(distance);
    
    if (distanceNum <= 0.5) {
      return "just a quick walk from where you are";
    } else if (distanceNum <= 1.5) {
      return "best reached with a short Uber or bike ride";
    } else {
      return "a great spot if you're up for a quick drive";
    }
  }

  static getHelpfulOffer(requestType: string): string {
    const offers = [
      "Would you like directions?",
      "Want more options like these?",
      "Need help with anything else—activities, parking, WiFi?"
    ];
    
    if (requestType === 'dining') {
      return "Would you like directions or more dining options?";
    }
    
    return offers[Math.floor(Math.random() * offers.length)];
  }

  static generateContextualFollowUp(conversation: Conversation): string {
    const lastRecommendations = conversation.last_recommendations;
    const lastMessageType = conversation.last_message_type;

    if (lastMessageType === 'recommendations' && lastRecommendations) {
      const followUps = [
        "Hope you enjoyed my suggestions! ",
        "Did my recommendations work out? ",
        "Hope those spots were great! "
      ];
      return followUps[Math.floor(Math.random() * followUps.length)];
    }

    return "";
  }
}
