
import { Conversation } from './types.ts';

export class NameHandler {
  static checkIfNameProvided(message: string, conversation: Conversation): { hasName: boolean, extractedName: string | null } {
    // If guest name is already captured, return it
    if (conversation.conversation_context?.guest_name) {
      return { hasName: true, extractedName: conversation.conversation_context.guest_name };
    }

    // Only try to capture name if we're in confirmed state and don't have a name yet
    if (conversation.conversation_state !== 'confirmed') {
      return { hasName: false, extractedName: null }; // Don't capture name before confirmation
    }

    // Check if message contains a name pattern
    const namePatterns = [
      /^(?:my name is|i'm|i am|call me)\s+([a-zA-Z]+)/i,
      /^hi,?\s*(?:my name is|i'm|i am)\s+([a-zA-Z]+)/i,
      /^hello,?\s*(?:my name is|i'm|i am)\s+([a-zA-Z]+)/i,
      /^([a-zA-Z]+)$/,  // Single word response (could be a name)
      /^it's\s+([a-zA-Z]+)/i,
      /^this is\s+([a-zA-Z]+)/i
    ];

    const cleanMessage = message.trim();
    
    for (const pattern of namePatterns) {
      const match = cleanMessage.match(pattern);
      if (match) {
        const potentialName = match[1];
        
        // Enhanced exclusion list - things that are definitely not names
        const excludeWords = [
          'yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'hello', 'hi', 'hey',
          'good', 'great', 'fine', 'wifi', 'parking', 'restaurant', 'beach',
          'food', 'help', 'information', 'directions', 'check', 'time',
          'what', 'where', 'when', 'how', 'can', 'could', 'would', 'should',
          'need', 'want', 'like', 'love', 'hate', 'know', 'think', 'see'
        ];
        
        // Check if it's a valid name (not in exclude list and reasonable length)
        if (!excludeWords.includes(potentialName.toLowerCase()) && 
            potentialName.length > 1 && 
            potentialName.length < 20 &&
            /^[a-zA-Z]+$/.test(potentialName)) { // Only letters, no numbers or special chars
          
          // Capitalize first letter
          const formattedName = potentialName.charAt(0).toUpperCase() + potentialName.slice(1).toLowerCase();
          return { hasName: false, extractedName: formattedName }; // Return false for hasName, but provide extracted name
        }
      }
    }

    return { hasName: false, extractedName: null };
  }

  static detectNameRefusal(message: string): boolean {
    const refusalPatterns = [
      /^no$/i,
      /^nope$/i,
      /^no thanks?$/i,
      /^i don'?t want to$/i,
      /^i'd rather not$/i,
      /^skip$/i,
      /^pass$/i,
      /^not telling$/i,
      /^none of your business$/i,
      /^prefer not to$/i,
      /^i'd prefer not to$/i,
      /^rather not say$/i,
      /^don'?t want to share$/i,
      /^keep it private$/i,
      /^anonymous$/i,
      /^secret$/i,
      /^mystery$/i
    ];

    const cleanMessage = message.trim();
    return refusalPatterns.some(pattern => pattern.test(cleanMessage));
  }

  static generateCleverRefusalResponse(): string {
    const cleverResponses = [
      "No worries, I'll just call you 'Mystery Guest' 😎 How can I help with your stay?",
      "That's okay, 'The Guest Formerly Known as Anonymous' works too! What do you need?",
      "Secret agent mode activated! 🕵️ What can I assist you with?",
      "Alright, 'Incognito Traveler' it is! How can I help?",
      "Got it, 'VIP Guest' works perfectly! What questions do you have?",
      "No problem, 'Adventure Seeker' - what can I help you discover?",
      "Cool, I'll go with 'Mysterious Visitor'! What do you need to know?",
      "Perfect, 'Anonymous Explorer' has a nice ring to it! How can I assist?"
    ];

    return cleverResponses[Math.floor(Math.random() * cleverResponses.length)];
  }

  static generateDirectQuestionResponse(): string {
    const directResponses = [
      "Straight to business, I like it! 😊 Happy to help -",
      "Perfect timing! Let me help you with that -",
      "Love the enthusiasm! Here's what I can tell you -",
      "Right to the point! I've got you covered -",
      "Excellent question! Here's the scoop -",
      "You're all set to explore! Let me help -",
      "Great question! I'm on it -"
    ];

    return directResponses[Math.floor(Math.random() * directResponses.length)];
  }

  static shouldAskForName(message: string, conversation: Conversation): boolean {
    // Don't ask for name if already have it
    if (conversation.conversation_context?.guest_name) {
      return false;
    }

    // Don't ask for name if not confirmed yet
    if (conversation.conversation_state !== 'confirmed') {
      return false;
    }

    // Don't ask for name if this message is providing a name
    const nameCheck = this.checkIfNameProvided(message, conversation);
    if (nameCheck.extractedName) {
      return false;
    }

    // Don't ask for name if they refused
    if (this.detectNameRefusal(message)) {
      return false;
    }

    // Don't ask for name if it's just a greeting
    const greetingKeywords = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (this.isSimpleGreeting(message, greetingKeywords)) {
      return false;
    }

    // Don't ask for name if they're making a direct service request
    if (this.isDirectServiceRequest(message)) {
      return false;
    }

    // Only ask for name if it's a general inquiry and we haven't asked recently
    return !conversation.conversation_context?.name_request_made;
  }

  static isDirectServiceRequest(message: string): boolean {
    const serviceKeywords = [
      'wifi', 'wi-fi', 'password', 'internet', 'parking', 'park',
      'check in', 'check out', 'checkin', 'checkout',
      'restaurant', 'food', 'eat', 'drink', 'bar', 'coffee',
      'directions', 'activities', 'things to do'
    ];
    
    const lowerMessage = message.toLowerCase();
    return serviceKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private static isSimpleGreeting(message: string, greetingKeywords: string[]): boolean {
    const cleanMessage = message.trim().toLowerCase();
    return greetingKeywords.some(greeting => cleanMessage === greeting || cleanMessage.startsWith(greeting + ' '));
  }
}
