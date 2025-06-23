
import { Conversation } from './types.ts';

export class NameHandler {
  static checkIfNameProvided(message: string, conversation: Conversation): { hasName: boolean, extractedName: string | null } {
    // If guest name is already captured, return it
    if (conversation.conversation_context?.guest_name) {
      return { hasName: true, extractedName: conversation.conversation_context.guest_name };
    }

    // Only try to capture name if we're in confirmed state and don't have a name yet
    if (conversation.conversation_state !== 'confirmed') {
      return { hasName: true, extractedName: null }; // Don't capture name before confirmation
    }

    // Check if message contains a name pattern
    const namePatterns = [
      /^(?:my name is|i'm|i am|call me)\s+(\w+)/i,
      /^hi,?\s*(?:my name is|i'm|i am)\s+(\w+)/i,
      /^hello,?\s*(?:my name is|i'm|i am)\s+(\w+)/i,
      /^(\w+)$/,  // Single word response (could be a name)
      /^it's\s+(\w+)/i,
      /^this is\s+(\w+)/i
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
          return { hasName: true, extractedName: formattedName };
        }
      }
    }

    return { hasName: false, extractedName: null };
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

    // Don't ask for name if it's just a greeting
    const greetingKeywords = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (this.isSimpleGreeting(message, greetingKeywords)) {
      return false;
    }

    // Ask for name if they're making a request but we don't have their name yet
    return true;
  }

  private static isSimpleGreeting(message: string, greetingKeywords: string[]): boolean {
    const cleanMessage = message.trim().toLowerCase();
    return greetingKeywords.some(greeting => cleanMessage === greeting || cleanMessage.startsWith(greeting + ' '));
  }
}
