import { Property } from './types.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';

export class PropertyDataExtractorEnhanced {
  
  static extractTvInfo(property: Property, message: string, conversationContext?: any): { response: string; hasData: boolean } {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let hasData = false;
    
    // Check if we've already shared TV info recently
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, 'tv_info');
    if (recentShare.shared) {
      return {
        response: `As I mentioned, ${recentShare.summary}. Is there something specific about the TV you'd like to know more about?`,
        hasData: true
      };
    }
    
    // Search knowledge base for TV information
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      
      // Look for TV-related information
      const tvMatch = kb.match(/tv[^.\n]*[.\n]/gi) || 
                      kb.match(/television[^.\n]*[.\n]/gi) ||
                      kb.match(/streaming[^.\n]*[.\n]/gi);
      
      if (tvMatch && tvMatch.length > 0) {
        response += `📺 ${tvMatch[0].trim()} `;
        hasData = true;
      }
    }
    
    // Check special notes for TV location/instructions
    if (property.special_notes) {
      const notes = property.special_notes.toLowerCase();
      if (notes.includes('tv') || notes.includes('television')) {
        const tvInfo = this.extractSpecificInfo(property.special_notes, 'tv', 'television');
        if (tvInfo) {
          response += tvInfo;
          hasData = true;
        }
      }
    }
    
    if (!hasData) {
      response = `📺 The property has a TV. `;
      hasData = true;
    }
    
    return { response: response.trim(), hasData };
  }
  
  static extractEquipmentTroubleshooting(property: Property, message: string, equipmentType: string, conversationContext?: any): { response: string; hasData: boolean } {
    let response = '';
    let hasData = false;
    
    // Check if we've already provided troubleshooting for this equipment
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, `troubleshoot_${equipmentType}`);
    if (recentShare.shared) {
      return {
        response: `I shared troubleshooting steps earlier. ${recentShare.summary}. Is it still not working?`,
        hasData: true
      };
    }
    
    // Search knowledge base for troubleshooting steps
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      const lowerKb = kb.toLowerCase();
      
      // Look for troubleshooting keywords near equipment type
      const troubleshootMatch = kb.match(new RegExp(`${equipmentType}[^.]*(?:troubleshoot|fix|repair|not working)[^.\n]*[.\n]`, 'gi')) ||
                                kb.match(new RegExp(`(?:troubleshoot|fix|repair)[^.]*${equipmentType}[^.\n]*[.\n]`, 'gi'));
      
      if (troubleshootMatch && troubleshootMatch.length > 0) {
        response += `🔧 ${troubleshootMatch[0].trim()} `;
        hasData = true;
      }
    }
    
    // Generic troubleshooting advice if no specific info found
    if (!hasData && equipmentType) {
      response = `🔧 I don't have specific troubleshooting steps for the ${equipmentType} in the property guide. `;
    }
    
    return { response: response.trim(), hasData };
  }
  
  static extractAdditionalServices(property: Property, message: string, conversationContext?: any): { response: string; hasData: boolean } {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let hasData = false;
    
    // Check if we've already shared services info
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, 'additional_services');
    if (recentShare.shared) {
      return {
        response: `As I mentioned, ${recentShare.summary}. Would you like more details?`,
        hasData: true
      };
    }
    
    // Search knowledge base for services
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      
      // Look for service-related information
      const serviceMatches = [
        kb.match(/laundry[^.\n]*[.\n]/gi),
        kb.match(/housekeeping[^.\n]*[.\n]/gi),
        kb.match(/cleaning[^.\n]*[.\n]/gi),
        kb.match(/towel[^.\n]*[.\n]/gi),
        kb.match(/concierge[^.\n]*[.\n]/gi)
      ].filter(m => m !== null);
      
      if (serviceMatches.length > 0) {
        serviceMatches.forEach(matches => {
          if (matches) {
            matches.forEach(match => {
              response += `🛎️ ${match.trim()} `;
            });
          }
        });
        hasData = true;
      }
    }
    
    return { response: response.trim(), hasData };
  }
  
  static extractResortAmenities(property: Property, message: string, conversationContext?: any): { response: string; hasData: boolean } {
    let response = '';
    let hasData = false;
    
    // Check if we've already shared resort amenities
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, 'resort_amenities');
    if (recentShare.shared) {
      return {
        response: `As I mentioned, ${recentShare.summary}. Need more details about any of these?`,
        hasData: true
      };
    }
    
    // Search knowledge base and local recommendations for resort amenities
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      
      // Look for resort-specific information
      const resortMatches = [
        kb.match(/resort pool[^.\n]*[.\n]/gi),
        kb.match(/resort gym[^.\n]*[.\n]/gi),
        kb.match(/resort spa[^.\n]*[.\n]/gi),
        kb.match(/resort restaurant[^.\n]*[.\n]/gi),
        kb.match(/on-?site[^.\n]*[.\n]/gi)
      ].filter(m => m !== null);
      
      if (resortMatches.length > 0) {
        response += '🏨 Resort amenities: ';
        resortMatches.forEach(matches => {
          if (matches) {
            matches.forEach(match => {
              response += `${match.trim()} `;
            });
          }
        });
        hasData = true;
      }
    }
    
    // Also check local_recommendations for resort info
    if (property.local_recommendations && property.local_recommendations.toLowerCase().includes('resort')) {
      const resortInfo = this.extractSpecificInfo(property.local_recommendations, 'resort');
      if (resortInfo) {
        response += resortInfo;
        hasData = true;
      }
    }
    
    return { response: response.trim(), hasData };
  }
  
  private static extractSpecificInfo(text: string, ...keywords: string[]): string {
    const sentences = text.split(/[.!?]+/);
    const relevantSentences: string[] = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (keywords.some(keyword => lowerSentence.includes(keyword))) {
        relevantSentences.push(sentence.trim());
      }
    }
    
    return relevantSentences.slice(0, 2).join('. ') + (relevantSentences.length > 0 ? '.' : '');
  }
}
