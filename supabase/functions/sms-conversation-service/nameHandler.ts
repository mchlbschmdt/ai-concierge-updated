
import { Conversation } from './types.ts';

export class NameHandler {
  static checkIfNameProvided(message: string, conversation: Conversation): { hasName: boolean, extractedName: string | null } {
    // Skip name capture if already confirmed or still getting property ID
    if (conversation.conversation_state !== 'confirmed' || conversation.conversation_context?.guest_name) {
      return { hasName: true, extractedName: conversation.conversation_context?.guest_name };
    }

    // Check if message contains a name pattern
    const namePatterns = [
      /^(my name is|i'm|i am|call me) (\w+)/i,
      /^(\w+)$/,  // Single word response
      /^hi,? (my name is|i'm|i am) (\w+)/i
    ];

    for (const pattern of namePatterns) {
      const match = message.trim().match(pattern);
      if (match) {
        const name = match[2] || match[1];
        // Exclude common non-name responses
        const excludeWords = ['yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'hello', 'hi', 'hey'];
        if (!excludeWords.includes(name.toLowerCase()) && name.length > 1) {
          return { hasName: true, extractedName: name };
        }
      }
    }

    return { hasName: false, extractedName: null };
  }
}
