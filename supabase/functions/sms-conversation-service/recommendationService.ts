
import { Conversation, Property } from './types.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { MessageUtils } from './messageUtils.ts';

export class RecommendationService {
  constructor(private supabase: any, private conversationManager: any) {}

  async getEnhancedRecommendations(property: Property, originalMessage: string, conversation: Conversation) {
    console.log(`🎯 Getting enhanced recommendations for: ${originalMessage}`);
    
    try {
      const propertyAddress = property?.address || 'the property';
      const propertyName = property?.property_name || 'your accommodation';
      const context = conversation?.conversation_context || {};
      const timezone = conversation?.timezone || 'UTC';
      const guestName = context?.guest_name;
      
      const greeting = ResponseGenerator.getTimeAwareGreeting(timezone);
      const personalizedGreeting = ResponseGenerator.getPersonalizedFoodGreeting(originalMessage, greeting, guestName);
      const clarifyingQuestion = ResponseGenerator.getClarifyingQuestion(originalMessage);
      const helpfulOffer = ResponseGenerator.getHelpfulOffer(this.categorizeRequest(originalMessage));
      
      const guestContext = this.extractGuestContext(originalMessage, context, conversation);
      const requestType = this.categorizeRequest(originalMessage);
      const previousRecommendations = conversation?.last_recommendations || null;
      
      console.log('📍 Guest context extracted:', guestContext);
      console.log('🏷️ Request type:', requestType);
      console.log('📝 Previous recommendations:', previousRecommendations);

      const enhancedPayload = {
        prompt: `${originalMessage}

ENHANCED RESPONSE FORMAT REQUIRED:
1. Start with: "${personalizedGreeting}"
2. Provide 1-2 recommendations with format: "Name (distance, rating★): Brief description—${ResponseGenerator.getDistanceFraming('0.3')}"
3. Ask: "${clarifyingQuestion}"
4. End with: "${helpfulOffer}"

CRITICAL REQUIREMENTS:
- Only show places with 4.0+ ratings
- Include exact distance (e.g., "0.2 mi")
- Use distance framing: ≤0.5mi="just a quick walk", 0.5-1.5mi="short Uber/bike ride", >1.5mi="quick drive"
- Keep total response under 160 characters
- Be conversational and helpful`,
        propertyAddress: `${propertyName}, ${propertyAddress}`,
        guestContext: guestContext,
        requestType: requestType,
        previousRecommendations: previousRecommendations
      };

      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify(enhancedPayload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Enhanced recommendations received');
        
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation,
          conversation_context: {
            ...context,
            lastRecommendationType: requestType,
            lastGuestContext: guestContext
          }
        });
        
        return {
          response: MessageUtils.ensureSmsLimit(data.recommendation),
          shouldUpdateState: false
        };
      } else {
        throw new Error(`Enhanced recommendations API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting enhanced recommendations:', error);
      
      return {
        response: "Having trouble with recommendations right now. Try again soon or ask about WiFi, parking, or check-in details.",
        shouldUpdateState: false
      };
    }
  }

  async getContextualRecommendations(property: Property, type: string, conversation: Conversation) {
    try {
      const propertyName = property?.property_name || 'your accommodation';
      const propertyAddress = property?.address || 'the property';
      const context = conversation?.conversation_context || {};
      const previousAskedAbout = context.askedAbout || [];
      const guestName = context?.guest_name;
      
      let contextNote = '';
      if (previousAskedAbout.length > 0) {
        contextNote = `Guest previously asked about: ${previousAskedAbout.join(', ')}. `;
      }

      const guestNameNote = guestName ? `Guest's name is ${guestName}. ` : '';

      const prompt = `You are a local concierge. Guest at ${propertyName}, ${propertyAddress}. ${guestNameNote}${contextNote}Request: ${type}

CRITICAL: Response must be under 160 characters for SMS. Be warm and conversational. If recommendations don't fit, give 1-2 best options briefly.

${contextNote ? 'Reference previous interests naturally if relevant.' : ''}
${guestName ? `Address the guest by name (${guestName}) when appropriate.` : ''}`;

      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation
        });
        
        return {
          response: MessageUtils.ensureSmsLimit(data.recommendation),
          shouldUpdateState: false
        };
      } else {
        throw new Error(`OpenAI API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return {
        response: "Having trouble with recommendations. Try asking about WiFi, parking, or check-in details.",
        shouldUpdateState: false
      };
    }
  }

  private extractGuestContext(message: string, context: any, conversation: Conversation): string {
    const askedAbout = context.askedAbout || [];
    const lastMessage = conversation.last_message_type;
    
    if (lastMessage === 'recommendations') {
      return message;
    }

    if (askedAbout.includes('wifi')) {
      return message;
    }

    if (askedAbout.includes('parking')) {
      return message;
    }

    return message;
  }

  private categorizeRequest(message: string): string {
    const keywords = [
      'wifi', 'wi-fi', 'internet', 'password', 'network',
      'parking', 'park', 'car', 'garage',
      'check in', 'check out', 'checkin', 'checkout',
      'beach', 'restaurant', 'food', 'eat', 'dining', 'drink', 'bar',
      'things to do', 'attractions', 'activities', 'directions'
    ];

    for (const keyword of keywords) {
      if (message.toLowerCase().includes(keyword)) {
        return keyword;
      }
    }

    return 'general';
  }
}
