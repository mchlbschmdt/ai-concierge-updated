import { Property } from './types.ts';

export interface PropertySwitchResult {
  isPropertySwitch: boolean;
  newPropertyCode?: string;
  confirmationMessage?: string;
}

export class PropertyContextSwitcher {
  /**
   * Detects if a message contains a new property code
   */
  static detectPropertySwitch(message: string, currentProperty?: Property): PropertySwitchResult {
    const lowerMessage = message.toLowerCase().trim();
    
    // Common property code patterns
    const propertyCodePatterns = [
      /\b(\d{3,4})\b/g, // 3-4 digit codes like 1434, 0404
      /property\s+(\d+)/gi,
      /staying\s+at\s+(\d+)/gi,
      /moved\s+to\s+(\d+)/gi,
      /now\s+at\s+(\d+)/gi,
      /switched\s+to\s+(\d+)/gi
    ];
    
    const contextSwitchPhrases = [
      'staying at property',
      'moved to property',
      'now at property',
      'switched to property',
      'different property',
      'new property',
      'another property'
    ];
    
    // Check for context switch phrases
    const hasContextSwitch = contextSwitchPhrases.some(phrase => lowerMessage.includes(phrase));
    
    // Extract potential property codes
    const extractedCodes: string[] = [];
    
    propertyCodePatterns.forEach(pattern => {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          extractedCodes.push(match[1]);
        }
      }
    });
    
    // If we have codes and context switch indicators, it's likely a property switch
    if (extractedCodes.length > 0 && (hasContextSwitch || this.isStandalonePropertyCode(message))) {
      const newCode = extractedCodes[0];
      
      // Don't switch if it's the same property
      if (currentProperty?.property_code === newCode) {
        return { isPropertySwitch: false };
      }
      
      return {
        isPropertySwitch: true,
        newPropertyCode: newCode,
        confirmationMessage: `I see you're now at property ${newCode}. Let me update your information and help you with recommendations for this location. Could you confirm this is correct? Reply Y for yes or N for no.`
      };
    }
    
    return { isPropertySwitch: false };
  }
  
  /**
   * Checks if a message is just a property code by itself
   */
  private static isStandalonePropertyCode(message: string): boolean {
    const trimmed = message.trim();
    
    // Check if it's just digits (3-4 characters)
    if (/^\d{3,4}$/.test(trimmed)) {
      return true;
    }
    
    // Check if it's just "property XXXX"
    if (/^property\s+\d{3,4}$/i.test(trimmed)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generates a property switch confirmation message
   */
  static generateSwitchConfirmation(newPropertyCode: string, propertyName?: string): string {
    const locationName = propertyName || `Property ${newPropertyCode}`;
    
    return `I see you're asking about ${locationName}. I'll update your context to provide recommendations specific to this location. 

Please confirm: Are you currently staying at ${locationName}? Reply Y to confirm or N if this is incorrect.`;
  }
  
  /**
   * Generates a successful switch message
   */
  static generateSwitchSuccessMessage(propertyName: string, propertyAddress: string): string {
    return `Perfect! I've updated your information for ${propertyName} at ${propertyAddress}. I'm ready to help with local recommendations, amenities, and any questions about your stay. What would you like to know?`;
  }
  
  /**
   * Handles failed property lookup
   */
  static generatePropertyNotFoundMessage(propertyCode: string): string {
    return `I couldn't find property ${propertyCode} in our system. Could you double-check the property code? You can also ask me to help find your property by providing the property name or address.`;
  }
}