import { Property } from './types.ts';

export interface HostContactContext {
  knowledgeFound: boolean;
  isTroubleshooting: boolean;
  isUrgent: boolean;
  category?: string;
  topic?: string;
  equipmentType?: string;
}

export class HostContactService {
  
  static shouldOfferHostContact(context: HostContactContext): boolean {
    if (context.isTroubleshooting) return true;
    if (!context.knowledgeFound) return true;
    if (context.isUrgent) return true;
    return false;
  }
  
  static generateHostContactOffer(
    property: Property | null,
    context: HostContactContext,
    conversationContext?: any
  ): string {
    const hasHostContact = property?.emergency_contact;
    
    // Critical/Urgent issues — immediate, empathetic
    if (context.isUrgent || context.category === 'access' || context.category === 'plumbing') {
      if (hasHostContact) {
        return `I'm so sorry about that — let me get your host on it right away. You can also reach them directly at ${property.emergency_contact}.`;
      }
      return `I'm so sorry about that — I'm notifying your host right now so they can take care of it. They'll reach out to you shortly.`;
    }
    
    // Troubleshooting — helpful, proactive
    if (context.isTroubleshooting) {
      const equipment = context.equipmentType || context.category || 'this';
      if (hasHostContact) {
        return `Let's get that sorted! Want me to reach out to your host about the ${equipment} issue? You can also contact them at ${property.emergency_contact}.`;
      }
      return `Let's get that sorted! Want me to notify your host about the ${equipment} issue?`;
    }
    
    // Information not available — natural, never say "property guide"
    if (!context.knowledgeFound) {
      const topic = context.topic || 'that';
      
      const recentlyOfferedContact = conversationContext?.last_host_contact_offer_timestamp &&
        (Date.now() - new Date(conversationContext.last_host_contact_offer_timestamp).getTime()) < 300000;
      
      if (recentlyOfferedContact) {
        return `I'll need to confirm ${topic} with the host. Want me to reach out for you?`;
      }
      
      if (hasHostContact) {
        return `Let me check on ${topic} for you — would you like me to ask the host? You can also reach them at ${property.emergency_contact}.`;
      }
      return `Let me check on ${topic} with your host and get back to you!`;
    }
    
    return `Need more details? I can check with your host if that would help!`;
  }
  
  static generateFollowUpAfterKnowledge(
    foundKnowledge: boolean,
    topic: string,
    property: Property | null
  ): string {
    if (foundKnowledge) {
      return `Hope that helps! Let me know if you need anything else 😊`;
    }
    
    const hasHostContact = property?.emergency_contact;
    if (hasHostContact) {
      return `I don't have the specifics on ${topic} right now. Want me to check with your host? Their number is ${property.emergency_contact}.`;
    }
    return `I don't have the specifics on ${topic} right now. Want me to check with your host?`;
  }
  
  static shouldNotifyHostAutomatically(context: HostContactContext): boolean {
    if (context.isUrgent) return true;
    if (context.category === 'access') return true;
    if (context.category === 'plumbing' && 
        (context.equipmentType?.includes('leak') || context.equipmentType?.includes('flood'))) {
      return true;
    }
    return false;
  }
}
