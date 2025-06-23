
import { Conversation } from './types.ts';

export interface ConversationContext {
  guest_name?: string;
  conversation_topic?: string;
  last_intent?: string;
  delivery_preference?: boolean;
  walkable_preference?: boolean;
  cuisine_preferences?: string[];
  dietary_restrictions?: string[];
  last_recommendations?: string;
  conversation_depth?: number;
  last_clarification?: string;
  successful_recommendations?: string[];
}

export class ConversationContextManager {
  static updateContext(
    existingContext: any, 
    intent: string[], 
    message: string,
    guestName?: string
  ): ConversationContext {
    const context: ConversationContext = {
      ...existingContext,
      conversation_depth: (existingContext?.conversation_depth || 0) + 1
    };

    // Update guest name if provided
    if (guestName) {
      context.guest_name = guestName;
    }

    // Update conversation topic based on intent
    if (intent.includes('food_urgent') || intent.includes('delivery_request')) {
      context.conversation_topic = 'food';
    } else if (intent.includes('coffee_request')) {
      context.conversation_topic = 'coffee';
    } else if (intent.includes('drink_request')) {
      context.conversation_topic = 'drinks';
    }

    // Update preferences based on intent
    if (intent.includes('delivery_request')) {
      context.delivery_preference = true;
      context.walkable_preference = false;
    }
    
    if (intent.includes('walkable_request')) {
      context.walkable_preference = true;
      context.delivery_preference = false;
    }

    // Update dietary restrictions
    if (intent.includes('seafood_avoid')) {
      context.dietary_restrictions = [...(context.dietary_restrictions || []), 'no_seafood'];
    }
    
    if (intent.includes('vegetarian')) {
      context.dietary_restrictions = [...(context.dietary_restrictions || []), 'vegetarian'];
    }

    // Store last intent
    context.last_intent = intent.join(',');

    return context;
  }

  static shouldSkipIntroduction(context: ConversationContext): boolean {
    return (context.conversation_depth || 0) > 1 && 
           context.conversation_topic !== undefined &&
           context.guest_name !== undefined;
  }

  static getConversationalGreeting(context: ConversationContext, timeGreeting: string): string {
    const name = context.guest_name ? `, ${context.guest_name}` : '';
    const depth = context.conversation_depth || 0;

    if (depth === 1) {
      return `${timeGreeting}${name}! Happy to help 🙂`;
    } else if (depth > 1 && context.conversation_topic) {
      return `Got it${name}—`;
    } else {
      return `${timeGreeting}${name}!`;
    }
  }

  static generateSmartFollowUp(context: ConversationContext, recommendationType: string): string {
    const followUps = [];

    if (context.delivery_preference) {
      followUps.push("Want more delivery options?");
      followUps.push("Need help with anything else while you wait?");
    } else if (context.walkable_preference) {
      followUps.push("Want directions to any of these?");
      followUps.push("Looking for dessert nearby too?");
    } else {
      followUps.push("Would you prefer delivery or something walkable?");
    }

    // Add context-specific follow-ups
    if (recommendationType === 'food') {
      followUps.push("Craving anything specific—pizza, seafood, or something casual?");
    } else if (recommendationType === 'coffee') {
      followUps.push("Want a cozy spot to work or quick grab-and-go?");
    }

    // Always include a helpful offer
    followUps.push("Need help with anything else—activities, parking, or local tips?");

    // Return 1-2 relevant follow-ups
    return followUps.slice(0, 2).join('\n');
  }
}
