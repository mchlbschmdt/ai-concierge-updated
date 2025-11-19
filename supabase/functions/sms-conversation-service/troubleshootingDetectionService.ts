
export interface TroubleshootingResult {
  isTroubleshooting: boolean;
  category: 'tv' | 'wifi' | 'appliance' | 'access' | 'heating_cooling' | 'plumbing' | 'pool_hot_tub' | 'equipment' | 'general';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  equipmentType?: string;
}

export class TroubleshootingDetectionService {
  
  static detectTroubleshootingIntent(message: string): TroubleshootingResult {
    const lowerMessage = message.toLowerCase();
    
    // Keywords indicating troubleshooting vs information requests
    const troubleshootingKeywords = [
      'not working', 'broken', "won't", "can't", "doesn't work", 
      'issue', 'problem', 'trouble', 'help with', 'fix', 'repair',
      'stuck', 'jammed', 'leaking', 'not turning on', 'not starting'
    ];
    
    const informationKeywords = [
      'how to', 'where is', 'do you have', 'is there', 'what is',
      'how do i', 'can i', 'instructions', 'guide'
    ];
    
    // Check if it's a troubleshooting request
    const isTroubleshooting = troubleshootingKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    // Don't treat pure information requests as troubleshooting
    const isInformationRequest = informationKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );
    
    if (!isTroubleshooting || isInformationRequest) {
      return {
        isTroubleshooting: false,
        category: 'general',
        urgency: 'low'
      };
    }
    
    // Determine category
    const category = this.detectCategory(lowerMessage);
    
    // Determine urgency
    const urgency = this.detectUrgency(lowerMessage, category);
    
    // Extract equipment type if applicable
    const equipmentType = this.extractEquipmentType(lowerMessage);
    
    return {
      isTroubleshooting: true,
      category,
      urgency,
      equipmentType
    };
  }
  
  private static detectCategory(lowerMessage: string): TroubleshootingResult['category'] {
    // TV issues
    if (lowerMessage.includes('tv') || lowerMessage.includes('television') || 
        lowerMessage.includes('remote') || lowerMessage.includes('hdmi') ||
        lowerMessage.includes('channels') || lowerMessage.includes('streaming')) {
      return 'tv';
    }
    
    // WiFi issues
    if (lowerMessage.includes('wifi') || lowerMessage.includes('internet') ||
        lowerMessage.includes('connection') || lowerMessage.includes('network')) {
      return 'wifi';
    }
    
    // Access issues
    if (lowerMessage.includes('lock') || lowerMessage.includes('key') ||
        lowerMessage.includes('door') || lowerMessage.includes('code') ||
        lowerMessage.includes('can\'t get in')) {
      return 'access';
    }
    
    // Heating/Cooling
    if (lowerMessage.includes('heat') || lowerMessage.includes('ac') ||
        lowerMessage.includes('air conditioning') || lowerMessage.includes('thermostat') ||
        lowerMessage.includes('temperature') || lowerMessage.includes('cold') ||
        lowerMessage.includes('hot')) {
      return 'heating_cooling';
    }
    
    // Plumbing
    if (lowerMessage.includes('leak') || lowerMessage.includes('water') ||
        lowerMessage.includes('toilet') || lowerMessage.includes('sink') ||
        lowerMessage.includes('shower') || lowerMessage.includes('drain')) {
      return 'plumbing';
    }
    
    // Pool/Hot Tub
    if (lowerMessage.includes('pool') || lowerMessage.includes('hot tub') ||
        lowerMessage.includes('spa') || lowerMessage.includes('jets')) {
      return 'pool_hot_tub';
    }
    
    // Appliances
    if (lowerMessage.includes('washer') || lowerMessage.includes('dryer') ||
        lowerMessage.includes('dishwasher') || lowerMessage.includes('microwave') ||
        lowerMessage.includes('oven') || lowerMessage.includes('stove') ||
        lowerMessage.includes('refrigerator') || lowerMessage.includes('fridge')) {
      return 'appliance';
    }
    
    // Equipment (grill, coffee maker, etc.)
    if (lowerMessage.includes('grill') || lowerMessage.includes('coffee maker') ||
        lowerMessage.includes('equipment')) {
      return 'equipment';
    }
    
    return 'general';
  }
  
  private static detectUrgency(lowerMessage: string, category: TroubleshootingResult['category']): TroubleshootingResult['urgency'] {
    // Critical keywords
    const criticalKeywords = ['emergency', 'urgent', 'flooding', 'no water', 'no heat', 'locked out'];
    if (criticalKeywords.some(kw => lowerMessage.includes(kw))) {
      return 'critical';
    }
    
    // High urgency categories
    if (category === 'access' || category === 'plumbing' || category === 'heating_cooling') {
      return 'high';
    }
    
    // Medium urgency categories
    if (category === 'wifi' || category === 'appliance') {
      return 'medium';
    }
    
    // Low urgency
    return 'low';
  }
  
  private static extractEquipmentType(lowerMessage: string): string | undefined {
    const equipmentTypes = [
      'tv', 'remote', 'wifi', 'lock', 'key', 'thermostat', 'ac',
      'washer', 'dryer', 'dishwasher', 'microwave', 'oven', 'stove',
      'refrigerator', 'fridge', 'grill', 'coffee maker', 'pool', 'hot tub',
      'toilet', 'sink', 'shower', 'door'
    ];
    
    for (const type of equipmentTypes) {
      if (lowerMessage.includes(type)) {
        return type;
      }
    }
    
    return undefined;
  }
}
