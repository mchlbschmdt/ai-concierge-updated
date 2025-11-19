import { Property } from './types.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';
import { PropertyLocationAnalyzer } from './propertyLocationAnalyzer.ts';

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
    const lowerMessage = message.toLowerCase();
    let response = '';
    let hasData = false;
    
    // Check if we've already shared resort info
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, 'resort_amenities');
    if (recentShare.shared) {
      return {
        response: `As I mentioned, ${recentShare.summary}. Would you like details about a specific amenity?`,
        hasData: true
      };
    }
    
    // First check if property has location context with resort info
    if (property.location_context?.resort) {
      const resortName = property.location_context.resort;
      const amenities = property.resort_amenities || [];
      
      if (amenities.length > 0) {
        response = `${resortName} offers:\n`;
        response += amenities.slice(0, 4).map(a => `• ${a}`).join('\n');
        
        if (amenities.length > 4) {
          response += `\n...and more! What would you like to know about?`;
        } else {
          response += `\n\nWould you like details about any of these?`;
        }
        
        hasData = true;
        return { response, hasData };
      }
    }
    
    // Fallback: Check knowledge base for resort/community info
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      const resortInfo = this.extractSpecificInfo(kb, 'resort', 'community', 'amenity', 'pool', 'facility');
      
      if (resortInfo) {
        response = resortInfo;
        hasData = true;
      }
    }
    
    // Check local recommendations for resort info
    if (!hasData && property.local_recommendations) {
      const localRec = property.local_recommendations.toLowerCase();
      if (localRec.includes('resort') || localRec.includes('community')) {
        const resortInfo = this.extractSpecificInfo(property.local_recommendations, 'resort', 'community', 'pool', 'amenity');
        if (resortInfo) {
          response = resortInfo;
          hasData = true;
        }
      }
    }
    
    return { response: response.trim(), hasData };
  }
  
  static extractWeatherInfo(property: Property, message: string, conversationContext?: any): { response: string; hasData: boolean } {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let hasData = false;
    
    // Check if we've already shared weather info recently
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, 'weather_info');
    if (recentShare.shared) {
      return {
        response: `As I mentioned earlier, ${recentShare.summary}. Is there something specific about the weather you'd like to know?`,
        hasData: true
      };
    }
    
    // Step 1: Check knowledge base for weather/climate information
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      
      // Look for weather-related information
      const weatherMatch = kb.match(/(?:weather|climate|temperature|season)[^.\n]{0,200}[.\n]/gi);
      
      if (weatherMatch && weatherMatch.length > 0) {
        response += `🌤️ ${weatherMatch[0].trim()}\n\n`;
        hasData = true;
      }
    }
    
    // Step 2: Check special notes for seasonal/weather tips
    if (property.special_notes) {
      const weatherInfo = this.extractSpecificInfo(
        property.special_notes, 
        'weather', 'temperature', 'rain', 'season', 'climate', 'hot', 'humid'
      );
      if (weatherInfo) {
        response += weatherInfo + '\n\n';
        hasData = true;
      }
    }
    
    // Step 3: Use location context for weather information
    if (property.address) {
      const locationContext = property.location_context as any;
      
      if (locationContext?.region === 'florida') {
        if (!hasData) {
          response += `🌤️ Florida weather: `;
        }
        response += `Typical weather: Hot & humid (80-95°F) with afternoon thunderstorms in summer. Milder & drier (60-75°F) in winter. Bring sunscreen, light clothes, and an umbrella for afternoon showers.`;
        hasData = true;
      } else if (locationContext?.region === 'puerto_rico') {
        if (!hasData) {
          response += `🌤️ Puerto Rico weather: `;
        }
        response += `Tropical climate year-round (75-85°F). Warm & humid with brief rain showers. Pack light, breathable clothes, sunscreen, and swimwear. Rainy season is May-November.`;
        hasData = true;
      }
    }
    
    return { response: response.trim(), hasData };
  }
  
  static extractPackingTips(property: Property, message: string, conversationContext?: any): { response: string; hasData: boolean } {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let hasData = false;
    
    // Check if we've already shared packing tips recently
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, 'packing_tips');
    if (recentShare.shared) {
      return {
        response: `I shared packing suggestions earlier. ${recentShare.summary}. Need anything else?`,
        hasData: true
      };
    }
    
    // Step 1: Check knowledge base for packing suggestions
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      
      // Look for packing-related information
      const packingMatch = kb.match(/(?:pack|bring|essentials|need)[^.\n]{0,200}[.\n]/gi);
      
      if (packingMatch && packingMatch.length > 0) {
        const relevantMatches = packingMatch.filter(match => 
          match.toLowerCase().includes('bring') || 
          match.toLowerCase().includes('pack') ||
          match.toLowerCase().includes('need')
        );
        
        if (relevantMatches.length > 0) {
          response += `🎒 From the property guide:\n${relevantMatches.slice(0, 2).join('\n')}\n\n`;
          hasData = true;
        }
      }
    }
    
    // Step 2: Check special notes for packing tips
    if (property.special_notes) {
      const packingInfo = this.extractSpecificInfo(
        property.special_notes, 
        'pack', 'bring', 'essential', 'need', 'provide', 'supplied'
      );
      if (packingInfo) {
        response += packingInfo + '\n\n';
        hasData = true;
      }
    }
    
    // Step 3: Check what amenities are provided to suggest what NOT to pack
    let providedItems: string[] = [];
    const amenitiesStr = typeof property.amenities === 'string' ? property.amenities : JSON.stringify(property.amenities || '');
    const amenitiesLower = amenitiesStr.toLowerCase();
    
    if (amenitiesLower.includes('towel')) providedItems.push('towels');
    if (amenitiesLower.includes('shampoo') || amenitiesLower.includes('toiletries')) providedItems.push('toiletries');
    if (amenitiesLower.includes('coffee')) providedItems.push('coffee maker');
    if (amenitiesLower.includes('washer')) providedItems.push('laundry facilities');
    
    if (providedItems.length > 0 && !hasData) {
      response += `✅ Provided at property: ${providedItems.join(', ')}.\n\n`;
      hasData = true;
    }
    
    // Step 4: Location-based packing suggestions
    if (property.address) {
      const locationContext = property.location_context as any;
      
      // Pool/beach property packing tips
      if (amenitiesLower.includes('pool') || 
          locationContext?.nearbyAttractions?.some((a: string) => a.includes('beach'))) {
        if (!hasData) {
          response += `🎒 Essential packing tips:\n`;
        }
        response += `• Swimwear & beach towels\n• Sunscreen (SPF 30+)\n• Sunglasses & hat\n• Light, breathable clothing\n`;
        hasData = true;
      }
      
      // Theme park proximity packing tips
      if (locationContext?.distanceToDisney || locationContext?.distanceToUniversal) {
        response += `\n🎢 Theme park tips:\n• Comfortable walking shoes\n• Portable phone charger\n• Small backpack\n• Refillable water bottle`;
        hasData = true;
      }
    }
    
    return { response: response.trim(), hasData };
  }
  
  static extractPackingTips(property: Property, message: string, conversationContext?: any): { response: string; hasData: boolean } {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let hasData = false;
    
    // Check if we've already shared packing tips recently
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, 'packing_tips');
    if (recentShare.shared) {
      return {
        response: `I shared packing suggestions earlier. ${recentShare.summary}. Need anything else?`,
        hasData: true
      };
    }
    
    // Step 1: Check knowledge base for packing suggestions
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      
      // Look for packing-related information
      const packingMatch = kb.match(/(?:pack|bring|essentials|need)[^.\n]{0,200}[.\n]/gi);
      
      if (packingMatch && packingMatch.length > 0) {
        const relevantMatches = packingMatch.filter(match => 
          match.toLowerCase().includes('bring') || 
          match.toLowerCase().includes('pack') ||
          match.toLowerCase().includes('need')
        );
        
        if (relevantMatches.length > 0) {
          response += `🎒 From the property guide:\n${relevantMatches.slice(0, 2).join('\n')}\n\n`;
          hasData = true;
        }
      }
    }
    
    // Step 2: Check special notes for packing tips
    if (property.special_notes) {
      const packingInfo = this.extractSpecificInfo(
        property.special_notes, 
        'pack', 'bring', 'essential', 'need', 'provide', 'supplied'
      );
      if (packingInfo) {
        response += packingInfo + '\n\n';
        hasData = true;
      }
    }
    
    // Step 3: Check what amenities are provided to suggest what NOT to pack
    let providedItems: string[] = [];
    const amenitiesStr = typeof property.amenities === 'string' ? property.amenities : JSON.stringify(property.amenities || '');
    const amenitiesLower = amenitiesStr.toLowerCase();
    
    if (amenitiesLower.includes('towel')) providedItems.push('towels');
    if (amenitiesLower.includes('shampoo') || amenitiesLower.includes('toiletries')) providedItems.push('toiletries');
    if (amenitiesLower.includes('coffee')) providedItems.push('coffee maker');
    if (amenitiesLower.includes('washer')) providedItems.push('laundry facilities');
    
    if (providedItems.length > 0 && !hasData) {
      response += `✅ Provided at property: ${providedItems.join(', ')}.\n\n`;
      hasData = true;
    }
    
    // Step 4: Location-based packing suggestions
    if (property.address) {
      const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
      
      // Pool/beach property packing tips
      if (amenitiesLower.includes('pool') || 
          locationContext?.nearbyAttractions?.some((a: string) => a.includes('beach'))) {
        if (!hasData) {
          response += `🎒 Essential packing tips:\n`;
        }
        response += `• Swimwear & beach towels\n• Sunscreen (SPF 30+)\n• Sunglasses & hat\n• Light, breathable clothing\n`;
        hasData = true;
      }
      
      // Theme park proximity packing tips
      if (locationContext.distanceToDisney || locationContext.distanceToUniversal) {
        response += `\n🎢 Theme park tips:\n• Comfortable walking shoes\n• Portable phone charger\n• Small backpack\n• Refillable water bottle`;
        hasData = true;
      }
    }
    
    return { response: response.trim(), hasData };
  }
  
  static extractBestTimeToVisit(property: Property, message: string, conversationContext?: any): { response: string; hasData: boolean } {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let hasData = false;
    
    // Check for recent shares
    const recentShare = ConversationMemoryManager.wasTopicRecentlyShared(conversationContext, 'best_time_visit');
    if (recentShare.shared) {
      return {
        response: `As I mentioned, ${recentShare.summary}. Need details about a specific park?`,
        hasData: true
      };
    }
    
    // Identify specific park
    const park = this.identifyParkFromMessage(lowerMessage);
    
    // Check knowledge base for timing tips
    if (property.knowledge_base) {
      const kb = property.knowledge_base;
      const timingMatch = kb.match(/(?:best time|crowd|busy|quiet|off-peak|rope drop)[^.\n]{0,250}[.\n]/gi);
      
      if (timingMatch && timingMatch.length > 0) {
        response += `🎢 From local knowledge:\n${timingMatch[0].trim()}\n\n`;
        hasData = true;
      }
    }
    
    // Get location-based park timing intelligence
    const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
    
    if (locationContext.distanceToDisney && (park === 'disney' || park === 'general')) {
      response += this.getDisneyTimingAdvice(park);
      hasData = true;
    }
    
    if (locationContext.distanceToUniversal && (park === 'universal' || park === 'general')) {
      if (hasData) response += '\n\n';
      response += this.getUniversalTimingAdvice();
      hasData = true;
    }
    
    // General theme park timing wisdom
    if (!hasData || park === 'general') {
      response += '\n\n💡 General tips:\n';
      response += '• Arrive at rope drop (30min before opening)\n';
      response += '• Avoid Sat/Sun & holidays\n';
      response += '• Mid-week (Tue-Thu) = shorter lines\n';
      response += '• Early morning & late evening = best times\n';
      response += '• Download park app for real-time wait times';
      hasData = true;
    }
    
    return { response: response.trim(), hasData };
  }
  
  private static identifyParkFromMessage(lowerMessage: string): string {
    if (lowerMessage.includes('magic kingdom') || lowerMessage.includes('mk')) return 'magic_kingdom';
    if (lowerMessage.includes('epcot')) return 'epcot';
    if (lowerMessage.includes('hollywood studios') || lowerMessage.includes('dhs')) return 'hollywood_studios';
    if (lowerMessage.includes('animal kingdom') || lowerMessage.includes('dak')) return 'animal_kingdom';
    if (lowerMessage.includes('universal') || lowerMessage.includes('islands')) return 'universal';
    if (lowerMessage.includes('disney')) return 'disney';
    return 'general';
  }
  
  private static getDisneyTimingAdvice(park: string): string {
    const advice: Record<string, string> = {
      magic_kingdom: '🏰 Magic Kingdom:\n• Most crowded park\n• Best: Tue-Thu early morning\n• Avoid: Weekends & holidays\n• Tip: Arrive 45min before rope drop',
      epcot: '🌍 EPCOT:\n• Less crowded than MK\n• Best: Mon-Wed\n• Festivals = bigger crowds\n• Tip: World Showcase opens at 11am',
      hollywood_studios: '🎬 Hollywood Studios:\n• Rise of Resistance = arrive early\n• Best: Wed-Fri\n• Tip: Virtual queue at 7am',
      animal_kingdom: '🦁 Animal Kingdom:\n• Closes earliest (usually 6-7pm)\n• Best: Mon-Tue early\n• Tip: Animals most active before 11am',
      disney: '🎢 Disney Parks:\n• Magic Kingdom = most crowded\n• Best parks: EPCOT or Animal Kingdom\n• Best days: Tue-Thu\n• Worst days: Weekends & holidays'
    };
    
    return advice[park] || advice.disney;
  }
  
  private static getUniversalTimingAdvice(): string {
    return '⚡ Universal Orlando:\n• Less crowded than Disney\n• Best: Tue-Thu\n• Hagrid\'s & Velocicoaster = early entry\n• Tip: Express Pass worth it on busy days';
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
  
  static extractResortAmenityInfo(property: Property, message: string, conversationContext?: any): { response: string; hasData: boolean } {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let hasData = false;
    
    // Get location context
    const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
    
    // Waterpark detection
    if (lowerMessage.includes('water park') || lowerMessage.includes('waterpark')) {
      if (locationContext.resort === 'reunion') {
        response += '🏊 Reunion Resort Waterpark:\n';
        response += '• 5-acre water park with lazy river\n';
        response += '• Multiple pools & water slides\n';
        response += '• Splash zone for kids\n';
        response += '• Access included with your stay\n\n';
        response += '📍 Location: Near the main clubhouse\n';
        response += '💡 Tip: Bring towels and sunscreen!';
        hasData = true;
      } else {
        response += '🏊 Your property is located at ' + (locationContext.resort || locationContext.neighborhood || 'an Orlando-area resort') + '.\n\n';
        response += 'For water park access details, I recommend contacting the resort front desk or checking your welcome materials. Would you like me to provide the property contact info?';
        hasData = true;
      }
    }
    
    // Resort pool (different from property pool)
    if ((lowerMessage.includes('resort pool') || lowerMessage.includes('main pool')) && 
        !lowerMessage.includes('property pool')) {
      if (locationContext.resort === 'reunion') {
        response += '🏊 Seven Eagles Pool (Main Resort Pool):\n';
        response += '• Infinity-edge pool with stunning views\n';
        response += '• 2 hot tubs/spas\n';
        response += '• Pool bar & food service\n';
        response += '• Gym located nearby\n\n';
        response += '💡 Highly recommended for the best pool experience!';
        hasData = true;
      }
    }
    
    // Resort gym/fitness
    if (lowerMessage.includes('gym') || lowerMessage.includes('fitness') || lowerMessage.includes('workout')) {
      if (property.local_recommendations && property.local_recommendations.toLowerCase().includes('gym')) {
        const gymMatch = property.local_recommendations.match(/gym[^.\n]{0,150}[.\n]/gi);
        if (gymMatch) {
          response += '💪 ' + gymMatch[0].trim();
          hasData = true;
        }
      } else if (locationContext.resort === 'reunion') {
        response += '💪 Fitness Center:\n';
        response += '• Located near Seven Eagles pool\n';
        response += '• Full cardio & weight equipment\n';
        response += '• Open to all resort guests';
        hasData = true;
      }
    }
    
    // Resort restaurants
    if ((lowerMessage.includes('resort restaurant') || lowerMessage.includes('on property') && lowerMessage.includes('eat')) &&
        !lowerMessage.includes('off property')) {
      if (property.local_recommendations && property.local_recommendations.toLowerCase().includes('dining on property')) {
        const diningMatch = property.local_recommendations.match(/\*\*\*Dining On Property\*\*\*[^*]+/i);
        if (diningMatch) {
          response += '🍽️ ' + diningMatch[0].replace(/\*\*\*/g, '').trim();
          hasData = true;
        }
      }
    }
    
    return { response: response.trim(), hasData };
  }
}
