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
    // Always offer for troubleshooting issues
    if (context.isTroubleshooting) {
      return true;
    }
    
    // Offer if no knowledge was found
    if (!context.knowledgeFound) {
      return true;
    }
    
    // Offer for urgent matters even if some info was found
    if (context.isUrgent) {
      return true;
    }
    
    return false;
  }
  
  static generateHostContactOffer(
    property: Property | null,
    context: HostContactContext,
    conversationContext?: any
  ): string {
    const hasHostContact = property?.emergency_contact;
    
    // Critical/Urgent issues - immediate action
    if (context.isUrgent || context.category === 'access' || context.category === 'plumbing') {
      if (hasHostContact) {
        return `🚨 This needs immediate attention! Your host is: ${property.emergency_contact}. I'm also sending them a notification about this issue.`;
      }
      return `🚨 This needs immediate attention! I'm notifying your property manager right now. They'll reach out to you shortly.`;
    }
    
    // Troubleshooting issues - helpful and proactive
    if (context.isTroubleshooting) {
      const equipment = context.equipmentType || context.category || 'this';
      
      if (hasHostContact) {
        return `Let's get this fixed for you! Would you like me to contact your property manager about the ${equipment} issue? They can usually help quickly. You can also reach them at: ${property.emergency_contact}`;
      }
      return `Let's get this fixed for you! Would you like me to notify your property manager about the ${equipment} issue? They can usually help quickly.`;
    }
    
    // Information not available - offer to connect
    if (!context.knowledgeFound) {
      const topic = context.topic || 'that';
      
      // Check if we've already offered host contact recently
      const recentlyOfferedContact = conversationContext?.last_host_contact_offer_timestamp &&
        (new Date().getTime() - new Date(conversationContext.last_host_contact_offer_timestamp).getTime()) < 300000; // 5 minutes
      
      if (recentlyOfferedContact) {
        return `I still don't have specific information about ${topic}. Let me know if you'd like me to reach out to your host for you!`;
      }
      
      if (hasHostContact) {
        return `I don't see that specific information in the property guide. Would you like me to contact your host about ${topic}? Their contact is: ${property.emergency_contact}`;
      }
      return `I don't see that specific information in the property guide. Would you like me to notify your property manager so they can help you with ${topic}?`;
    }
    
    // General follow-up for complex queries
    return `Need more details about this? I can connect you with your property manager if that would help!`;
  }
  
  static generateFollowUpAfterKnowledge(
    foundKnowledge: boolean,
    topic: string,
    property: Property | null
  ): string {
    if (foundKnowledge) {
      // Don't offer host contact if we found good information
      return `Hope that helps! Let me know if you need anything else! 😊`;
    }
    
    // Offer host contact as a helpful fallback
    const hasHostContact = property?.emergency_contact;
    
    if (hasHostContact) {
      return `I don't have specific details about ${topic} in the guide. Would you like me to contact your host? Their number is: ${property.emergency_contact}`;
    }
    
    return `I don't have specific details about ${topic} in the guide. Would you like me to notify your property manager to help with this?`;
  }
  
  static shouldNotifyHostAutomatically(context: HostContactContext): boolean {
    // Auto-notify for critical issues
    if (context.isUrgent) {
      return true;
    }
    
    // Auto-notify for access issues
    if (context.category === 'access') {
      return true;
    }
    
    // Auto-notify for major plumbing issues
    if (context.category === 'plumbing' && 
        (context.equipmentType?.includes('leak') || context.equipmentType?.includes('flood'))) {
      return true;
    }
    
    return false;
  }
}
