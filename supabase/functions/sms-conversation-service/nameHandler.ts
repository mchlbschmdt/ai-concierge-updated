
import { Conversation } from './types.ts';

export class NameHandler {
  static checkIfNameProvided(message: string, conversation: Conversation): { hasName: boolean, extractedName: string | null } {
    console.log('🔍 NameHandler.checkIfNameProvided called with:', { message, guestName: conversation.conversation_context?.guest_name });
    
    // If guest name is already captured, return it
    if (conversation.conversation_context?.guest_name) {
      console.log('✅ Guest name already exists:', conversation.conversation_context.guest_name);
      return { hasName: true, extractedName: conversation.conversation_context.guest_name };
    }

    // Only try to capture name if we're in confirmed state and don't have a name yet
    if (conversation.conversation_state !== 'confirmed') {
      console.log('❌ Not in confirmed state, not capturing name');
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
    console.log('🔍 Checking patterns against clean message:', cleanMessage);
    
    for (const pattern of namePatterns) {
      const match = cleanMessage.match(pattern);
      console.log('🔍 Pattern test:', pattern, 'Match:', match);
      if (match) {
        const potentialName = match[1];
        console.log('🔍 Potential name found:', potentialName);
        
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
          console.log('✅ Valid name detected and formatted:', formattedName);
          return { hasName: true, extractedName: formattedName }; // FIXED: Return true for hasName
        } else {
          console.log('❌ Name rejected - excluded word or invalid format');
        }
      }
    }

    console.log('❌ No valid name pattern found');
    return { hasName: false, extractedName: null };
  }

  static detectAndExtractName(message: string): { nameDetected: boolean, extractedName: string | null } {
    console.log('🔍 NameHandler.detectAndExtractName called with:', message);
    
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
    console.log('🔍 Checking patterns against clean message:', cleanMessage);
    
    for (const pattern of namePatterns) {
      const match = cleanMessage.match(pattern);
      if (match) {
        const potentialName = match[1];
        console.log('🔍 Potential name found:', potentialName);
        
        // Enhanced exclusion list
        const excludeWords = [
          'yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'hello', 'hi', 'hey',
          'good', 'great', 'fine', 'wifi', 'parking', 'restaurant', 'beach',
          'food', 'help', 'information', 'directions', 'check', 'time',
          'what', 'where', 'when', 'how', 'can', 'could', 'would', 'should',
          'need', 'want', 'like', 'love', 'hate', 'know', 'think', 'see'
        ];
        
        if (!excludeWords.includes(potentialName.toLowerCase()) && 
            potentialName.length > 1 && 
            potentialName.length < 20 &&
            /^[a-zA-Z]+$/.test(potentialName)) {
          
          const formattedName = potentialName.charAt(0).toUpperCase() + potentialName.slice(1).toLowerCase();
          console.log('✅ Valid name detected and formatted:', formattedName);
          return { nameDetected: true, extractedName: formattedName };
        }
      }
    }

    console.log('❌ No valid name pattern found');
    return { nameDetected: false, extractedName: null };
  }

  static generateNameResponse(name: string): string {
    const responses = [
      `Nice to meet you, ${name}! How can I help you today?`,
      `Hello ${name}! What can I assist you with?`,
      `Hi ${name}! I'm here to help with any questions about your stay.`,
      `Great to meet you, ${name}! What would you like to know?`,
      `Welcome ${name}! How can I make your stay better?`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  static detectNameRefusal(message: string): boolean {
    console.log('🚫 NameHandler.detectNameRefusal called with:', message);
    
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
    const isRefusal = refusalPatterns.some(pattern => pattern.test(cleanMessage));
    console.log('🚫 Name refusal detected:', isRefusal);
    return isRefusal;
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
    console.log('🤔 NameHandler.shouldAskForName called');
    console.log('🤔 Context:', {
      hasGuestName: !!conversation.conversation_context?.guest_name,
      state: conversation.conversation_state,
      nameRequestMade: conversation.conversation_context?.name_request_made
    });
    
    // Don't ask for name if already have it
    if (conversation.conversation_context?.guest_name) {
      console.log('❌ Already have guest name');
      return false;
    }

    // Don't ask for name if not confirmed yet
    if (conversation.conversation_state !== 'confirmed') {
      console.log('❌ Not confirmed state');
      return false;
    }

    // Don't ask for name if this message is providing a name
    const nameCheck = this.checkIfNameProvided(message, conversation);
    if (nameCheck.extractedName) {
      console.log('❌ Message contains name');
      return false;
    }

    // Don't ask for name if they refused
    if (this.detectNameRefusal(message)) {
      console.log('❌ Name refused in this message');
      return false;
    }

    // Don't ask for name if it's just a greeting
    const greetingKeywords = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (this.isSimpleGreeting(message, greetingKeywords)) {
      console.log('❌ Simple greeting detected');
      return false;
    }

    // Don't ask for name if they're making a direct service request
    if (this.isDirectServiceRequest(message)) {
      console.log('❌ Direct service request detected');
      return false;
    }

    // Don't ask for name if we've already asked
    if (conversation.conversation_context?.name_request_made) {
      console.log('❌ Name request already made');
      return false;
    }

    console.log('✅ Should ask for name');
    return true;
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
