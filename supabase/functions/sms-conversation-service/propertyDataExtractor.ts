import { Property1434Handler } from './property1434Data.ts';

export interface PropertyDataResponse {
  content: string;
  hasData: boolean;
  dataType: 'amenities' | 'checkout' | 'emergency' | 'access' | 'general' | 'garbage' | 'grocery' | 'transportation';
}

export class PropertyDataExtractor {
  
  // NEW: Main property data extraction method with Property 1434 hardcoded data
  static extractPropertyData(property: any, intent: string, message: string): PropertyDataResponse {
    // ⭐ PRIORITY: Check if this is property 1434 and use hardcoded data
    console.log('🏠 Property detection:', { property_id: property?.property_id, code: property?.code });
    const isProperty1434 = Property1434Handler.isProperty1434(property?.code || property?.property_id);
    
    if (isProperty1434) {
      console.log('✅ Property 1434 detected, using hardcoded data for intent:', intent);
      const hardcodedResponse = this.getProperty1434Data(intent, message);
      if (hardcodedResponse.hasData) {
        console.log('📚 Using hardcoded property data');
        return hardcodedResponse;
      }
    }
    switch (intent) {
      case 'ask_access':
        return this.extractAccessInfo(property);
      case 'ask_wifi':
        return this.extractWifiInfo(property);
      case 'ask_parking':
        return this.extractParkingInfo(property);
      case 'ask_checkout_time':
        return this.extractCheckoutInfo(property);
      case 'ask_checkin_time':
        return this.extractCheckinInfo(property);
      case 'ask_emergency_contact':
        return this.extractEmergencyContact(property);
      case 'ask_amenity':
        return this.extractAmenityInfo(property, message);
      case 'ask_garbage':
        return this.extractGarbageInfo(property);
      case 'ask_grocery':
        return this.extractGroceryInfo(property);
      case 'ask_transportation_no_car':
        return this.extractTransportationInfo(property);
      case 'ask_grocery_transport':
        return this.extractGroceryTransportInfo(property);
      default:
        return { content: '', hasData: false, dataType: 'general' };
    }
  }
  
  // ⭐ NEW: Get hardcoded data for Property 1434
  private static getProperty1434Data(intent: string, message: string): PropertyDataResponse {
    const lowerMessage = message.toLowerCase();
    
    // Pool queries
    if (intent === 'ask_amenity' && lowerMessage.includes('pool')) {
      return {
        content: Property1434Handler.getPoolInfo(),
        hasData: true,
        dataType: 'amenities'
      };
    }
    
    // Hot tub queries
    if (intent === 'ask_amenity' && (lowerMessage.includes('hot tub') || lowerMessage.includes('jacuzzi'))) {
      return {
        content: Property1434Handler.getHotTubInfo(),
        hasData: true,
        dataType: 'amenities'
      };
    }
    
    // Game room queries
    if (intent === 'ask_amenity' && (lowerMessage.includes('game') || lowerMessage.includes('arcade'))) {
      return {
        content: Property1434Handler.getGameRoomInfo(),
        hasData: true,
        dataType: 'amenities'
      };
    }
    
    // Checkout queries
    if (intent === 'ask_checkout_time') {
      return {
        content: Property1434Handler.getCheckoutInfo(),
        hasData: true,
        dataType: 'checkout'
      };
    }
    
    // Garbage queries
    if (intent === 'ask_garbage') {
      return {
        content: Property1434Handler.getGarbageInfo(),
        hasData: true,
        dataType: 'garbage'
      };
    }
    
    // Grocery queries
    if (intent === 'ask_grocery' || intent === 'ask_grocery_transport') {
      return {
        content: Property1434Handler.getGroceryInfo(),
        hasData: true,
        dataType: 'grocery'
      };
    }
    
    // Transportation queries
    if (intent === 'ask_transportation_no_car' || intent === 'ask_grocery_transport') {
      return {
        content: Property1434Handler.getTransportationInfo(),
        hasData: true,
        dataType: 'transportation'
      };
    }
    
    // Emergency contact
    if (intent === 'ask_emergency_contact') {
      return {
        content: Property1434Handler.getEmergencyContact(),
        hasData: true,
        dataType: 'emergency'
      };
    }
    
    return { content: '', hasData: false, dataType: 'general' };
  }

  // NEW: Extract WiFi info
  static extractWifiInfo(property: any): PropertyDataResponse {
    if (property.wifi_name && property.wifi_password) {
      return {
        content: `📶 WiFi Details:\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}`,
        hasData: true,
        dataType: 'general'
      };
    }
    return { content: '', hasData: false, dataType: 'general' };
  }

  // NEW: Extract parking info
  static extractParkingInfo(property: any): PropertyDataResponse {
    if (property.parking_instructions) {
      return {
        content: `🚗 Parking Instructions:\n${property.parking_instructions}`,
        hasData: true,
        dataType: 'general'
      };
    }
    return { content: '', hasData: false, dataType: 'general' };
  }

  // NEW: Extract check-in info
  static extractCheckinInfo(property: any): PropertyDataResponse {
    if (property.check_in_time) {
      let content = `🏠 Check-in time: ${property.check_in_time}`;
      if (property.access_instructions) {
        content += `\n\n🔑 Access: ${property.access_instructions}`;
      }
      return {
        content,
        hasData: true,
        dataType: 'general'
      };
    }
    return { content: '', hasData: false, dataType: 'general' };
  }
  
  static extractAmenityInfo(property: any, message: string): PropertyDataResponse {
    const lowerMessage = message.toLowerCase();
    
    // CRITICAL FIX: Block amenity extraction for troubleshooting messages
    const troubleshootingKeywords = [
      'not working', 'broken', 'issue', 'problem', 'trouble', 'help with',
      'won\'t work', 'doesn\'t work', 'isn\'t working', 'can\'t get', 'won\'t turn on',
      'not turning on', 'stopped working', 'fix', 'repair', 'malfunction'
    ];
    
    if (troubleshootingKeywords.some(keyword => lowerMessage.includes(keyword))) {
      console.log('🚫 Blocking amenity extraction for troubleshooting message');
      return { content: '', hasData: false, dataType: 'amenities' };
    }
    
    let amenities = [];
    
    try {
      amenities = property.amenities ? JSON.parse(property.amenities) : [];
    } catch (e) {
      // If amenities is already an array or parsing fails
      amenities = Array.isArray(property.amenities) ? property.amenities : [];
    }
    
    const specialNotes = property.special_notes || '';
    
    let response = '';
    let hasData = false;
    
    // Pool information - SPECIFIC DETECTION (including pool heat)
    if (lowerMessage.includes('pool')) {
      const isPoolHeatQuestion = lowerMessage.includes('pool heat') || 
        (lowerMessage.includes('heat') && lowerMessage.includes('pool')) ||
        (lowerMessage.includes('heated') && lowerMessage.includes('pool')) ||
        (lowerMessage.includes('heating') && lowerMessage.includes('pool'));
      
      const hasPool = amenities.some((a: string) => a.toLowerCase().includes('pool'));
      let hasPoolHeatAnswer = false;
      
      if (hasPool) {
        // Handle pool heat specific questions FIRST
        if (isPoolHeatQuestion) {
          const kb = property.knowledge_base || '';
          let poolHeatSentence = '';
          
          // Try to find pool heating information in knowledge base
          const match = kb.match(/pool heating[^.\n]*[.\n]/i) || 
                       kb.match(/optional pool heating[^.\n]*\$\d+[^.\n]*[.\n]/i) ||
                       kb.match(/heating available[^.\n]*[.\n]/i);
          
          if (match) {
            poolHeatSentence = match[0].trim();
            response += `🏊‍♀️ ${poolHeatSentence} `;
            hasPoolHeatAnswer = true;
            hasData = true;
          } else {
            // Fallback if no specific pool heat info found
            response += `🏊‍♀️ Pool heat isn't automatically included. It's available as an add-on at $25/day. Contact your host to add pool heating! `;
            hasPoolHeatAnswer = true;
            hasData = true;
          }
        }
        
        // Add general pool info only if we didn't already answer about pool heat
        if (!hasPoolHeatAnswer) {
          response += '🏊‍♀️ Yes! The property has a pool. ';
          hasData = true;
        }
        
        // Add pool operation details from special notes
        if (specialNotes.toLowerCase().includes('pool')) {
          const poolInfo = this.extractPoolInfo(specialNotes);
          if (poolInfo) response += poolInfo + ' ';
        }
        
        // Only add Seven Eagles recommendation for GENERAL pool questions
        // NOT for specific questions like "is pool heat included?"
        const isSpecificQuestion = lowerMessage.includes('pool heat') || 
                                   lowerMessage.includes('heated') || 
                                   lowerMessage.includes('heating') ||
                                   lowerMessage.includes('temperature') ||
                                   lowerMessage.includes('how to');
        
        if (!isSpecificQuestion && property.local_recommendations && property.local_recommendations.includes('Seven Eagles pool')) {
          response += '\n\nFor the best pool experience, check out the Seven Eagles pool on the resort—it has spas and gorgeous views!';
        }
      } else {
        response += '🏊‍♀️ No pool at this property. ';
        hasData = true;
      }
    }
    
    // Hot tub information - SPECIFIC DETECTION
    if (lowerMessage.includes('hot tub') || lowerMessage.includes('jacuzzi') || lowerMessage.includes('spa')) {
      const hasHotTub = amenities.some((a: string) => a.toLowerCase().includes('hot tub') || a.toLowerCase().includes('spa'));
      if (hasHotTub) {
        if (response) response += '\n\n';
        response += '🛁 Yes! There\'s a hot tub available. ';
        hasData = true;
        
        if (specialNotes.toLowerCase().includes('hot tub')) {
          const hotTubInfo = this.extractHotTubInfo(specialNotes);
          if (hotTubInfo) response += hotTubInfo;
        }
      } else {
        if (response) response += '\n\n';
        response += '🛁 No hot tub at this property. ';
        hasData = true;
      }
    }
    
    // Game room information - SPECIFIC DETECTION
    if (lowerMessage.includes('game room') || lowerMessage.includes('games') || lowerMessage.includes('entertainment')) {
      const hasGameRoom = amenities.some((a: string) => 
        a.toLowerCase().includes('game') || a.toLowerCase().includes('entertainment')
      );
      
      if (hasGameRoom) {
        if (response) response += '\n\n';
        response += '🎮 Yes! The property has entertainment/game facilities. ';
        hasData = true;
      } else {
        if (response) response += '\n\n';
        response += '🎮 No dedicated game room at this property. ';
        hasData = true;
      }
    }
    
    // BBQ Grill information
    if (lowerMessage.includes('grill') || lowerMessage.includes('bbq') || lowerMessage.includes('barbecue')) {
      const hasGrill = amenities.some((a: string) => a.toLowerCase().includes('grill') || a.toLowerCase().includes('bbq'));
      if (hasGrill) {
        if (response) response += '\n\n';
        response += '🔥 Yes! There\'s a BBQ grill available for you to use!';
        hasData = true;
      } else {
        if (response) response += '\n\n';
        response += '🔥 No grill at this property. ';
        hasData = true;
      }
    }
    
    
    // WiFi information
    if (lowerMessage.includes('wifi') || lowerMessage.includes('internet') || lowerMessage.includes('password')) {
      if (property.wifi_name && property.wifi_password) {
        response += `📶 WiFi Info:\nNetwork: "${property.wifi_name}"\nPassword: "${property.wifi_password}"\n\nYou should be all set to connect! 📱`;
        hasData = true;
      } else {
        response += '📶 WiFi is available - check your welcome guide or contact your host for the network details! 📱';
        hasData = true;
      }
    }
    
    // Air conditioning information
    if ((lowerMessage.includes('ac') || lowerMessage.includes('air conditioning') || lowerMessage.includes('cooling')) && amenities.includes('Air Conditioning')) {
      response += '❄️ Yes! Air conditioning is available to keep you comfortable! 🌡️';
      
      if (specialNotes.includes('HVAC') || specialNotes.includes('A/C')) {
        const acNote = specialNotes.match(/The HVAC.*?(?=\n\n|\.$|$)/i);
        if (acNote) {
          response += `\n\n💡 Tip: ${acNote[0]}`;
        }
      }
      hasData = true;
    }
    
    // Game room / entertainment
    if (lowerMessage.includes('game room') || lowerMessage.includes('entertainment')) {
      // Check if property has game room amenities
      const hasGameRoom = amenities.some((amenity: string) => 
        amenity.toLowerCase().includes('game') || 
        amenity.toLowerCase().includes('entertainment')
      );
      
      if (hasGameRoom) {
        response += '🎮 Yes! The property has entertainment/game facilities. ';
        hasData = true;
      } else {
        response += 'This property doesn\'t have a dedicated game room, but ';
        if (amenities.includes('Pool')) {
          response += 'you can enjoy the pool area for fun! ';
        }
        response += 'Let me know if you\'d like recommendations for nearby entertainment venues.';
        hasData = true;
      }
    }
    
    // General amenities list
    if (lowerMessage.includes('amenities') && !hasData) {
      response = `🏡 Here are the property amenities: ${amenities.join(', ')}. `;
      hasData = true;
    }
    
    return {
      content: response.trim(),
      hasData,
      dataType: 'amenities'
    };
  }
  
  static extractCheckoutInfo(property: any): PropertyDataResponse {
    const checkoutTime = property.check_out_time || '';
    const cleaningInstructions = property.cleaning_instructions || '';
    
    if (!checkoutTime && !cleaningInstructions) {
      return {
        content: '',
        hasData: false,
        dataType: 'checkout'
      };
    }
    
    let response = '';
    
    if (checkoutTime) {
      response += `⏰ Checkout time: ${checkoutTime}\n\n`;
    }
    
    if (cleaningInstructions) {
      response += `📝 Before you leave:\n${cleaningInstructions}\n\n`;
    }
    
    // Add helpful closing
    if (!cleaningInstructions && checkoutTime) {
      response += 'Just leave the keys and close the door behind you. Have a safe trip!';
    }
    
    return {
      content: response.trim(),
      hasData: true,
      dataType: 'checkout'
    };
  }
  
  static extractEmergencyContact(property: any): PropertyDataResponse {
    const emergencyContact = property.emergency_contact || '';
    
    if (!emergencyContact) {
      return {
        content: '',
        hasData: false,
        dataType: 'emergency'
      };
    }
    
    const response = `🚨 Emergency Contact:\n${emergencyContact}\n\nDon't hesitate to reach out if you need anything!`;
    
    return {
      content: response,
      hasData: true,
      dataType: 'emergency'
    };
  }
  
  static extractAccessInfo(property: any): PropertyDataResponse {
    const accessInstructions = property.access_instructions || '';
    const emergencyContact = property.emergency_contact || '';
    
    if (!accessInstructions) {
      return {
        content: '',
        hasData: false,
        dataType: 'access'
      };
    }
    
    let response = `🔑 Access Instructions:\n${accessInstructions}`;
    
    // Always add emergency contact for access issues
    if (emergencyContact) {
      response += `\n\n🚨 Having trouble? Contact: ${emergencyContact}`;
    }
    
    return {
      content: response,
      hasData: true,
      dataType: 'access'
    };
  }
  
  // NEW: Extract garbage/trash collection info
  static extractGarbageInfo(property: any): PropertyDataResponse {
    // Check if Property 1434
    if (Property1434Handler.isProperty1434(property?.code || property?.property_id)) {
      return {
        content: Property1434Handler.getGarbageInfo(),
        hasData: true,
        dataType: 'garbage'
      };
    }
    
    // Generic response for other properties
    return {
      content: 'Please check with your host for garbage collection schedule.',
      hasData: false,
      dataType: 'general'
    };
  }
  
  // NEW: Extract grocery store info
  static extractGroceryInfo(property: any): PropertyDataResponse {
    // Check if Property 1434
    if (Property1434Handler.isProperty1434(property?.code || property?.property_id)) {
      return {
        content: Property1434Handler.getGroceryInfo(),
        hasData: true,
        dataType: 'grocery'
      };
    }
    
    // Try to extract from local recommendations
    const localRecs = property.local_recommendations || '';
    if (localRecs.includes('grocery') || localRecs.includes('Publix') || localRecs.includes('Aldi')) {
      const groceryMatch = localRecs.match(/\*\*\*Groceries[^*]*\*\*\*[^*]*/i);
      if (groceryMatch) {
        return {
          content: '🛒 ' + groceryMatch[0].replace(/\*\*\*/g, '').trim(),
          hasData: true,
          dataType: 'grocery'
        };
      }
    }
    
    return { content: '', hasData: false, dataType: 'general' };
  }
  
  // NEW: Extract transportation info
  static extractTransportationInfo(property: any): PropertyDataResponse {
    // Check if Property 1434
    if (Property1434Handler.isProperty1434(property?.code || property?.property_id)) {
      return {
        content: Property1434Handler.getTransportationInfo(),
        hasData: true,
        dataType: 'transportation'
      };
    }
    
    // Try to extract from local recommendations
    const localRecs = property.local_recommendations || '';
    if (localRecs.includes('shuttle') || localRecs.includes('transportation')) {
      const shuttleMatch = localRecs.match(/\*\*\*Disney Shuttle[^*]*\*\*\*[^*]*/i);
      if (shuttleMatch) {
        return {
          content: '🚌 ' + shuttleMatch[0].replace(/\*\*\*/g, '').trim(),
          hasData: true,
          dataType: 'transportation'
        };
      }
    }
    
    return { content: '', hasData: false, dataType: 'general' };
  }
  
  static extractGroceryTransportInfo(property: any): PropertyDataResponse {
    // Check if Property 1434 first
    if (Property1434Handler.isProperty1434(property?.code || property?.property_id)) {
      return {
        content: `${Property1434Handler.getGroceryInfo()}\n\n${Property1434Handler.getTransportationInfo()}`,
        hasData: true,
        dataType: 'general'
      };
    }
    
    const localRecs = property.local_recommendations || '';
    
    let response = '';
    let hasData = false;
    
    // Look for grocery information in local recommendations
    if (localRecs.includes('Aldi') || localRecs.includes('Publix') || localRecs.includes('grocery')) {
      const groceryInfo = this.extractGroceryInfoText(localRecs);
      if (groceryInfo) {
        response += groceryInfo + ' ';
        hasData = true;
      }
    }
    
    // Add transportation info
    if (localRecs.includes('shuttle') || localRecs.includes('Disney')) {
      const transportInfo = this.extractTransportInfoText(localRecs);
      if (transportInfo) {
        response += transportInfo;
        hasData = true;
      }
    }
    
    if (!hasData) {
      response = 'Let me get the nearest grocery stores and transportation options for you.';
    }
    
    return {
      content: response.trim(),
      hasData,
      dataType: 'general'
    };
  }
  
  private static extractPoolInfo(notes: string): string {
    const poolMatch = notes.match(/pool[^.]*\.?/i);
    return poolMatch ? poolMatch[0] + ' ' : '';
  }
  
  private static extractHotTubInfo(notes: string): string {
    const hotTubMatch = notes.match(/hot tub[^.]*\.?/i);
    return hotTubMatch ? hotTubMatch[0] + ' ' : '';
  }
  
  // Renamed to avoid conflicts
  private static extractGroceryInfoText(recommendations: string): string {
    const groceryMatch = recommendations.match(/\*\*\*Groceries[^*]*\*\*\*[^*]*/i);
    if (groceryMatch) {
      return groceryMatch[0].replace(/\*\*\*/g, '').trim();
    }
    
    // Look for Aldi/Publix mentions
    if (recommendations.includes('Aldi') && recommendations.includes('Publix')) {
      return '🛒 Right outside the resort gates, you\'ll find both Aldi and Publix for groceries—super convenient!';
    }
    
    return '';
  }
  
  private static extractTransportInfoText(recommendations: string): string {
    const shuttleMatch = recommendations.match(/\*\*\*Disney Shuttle[^*]*\*\*\*[^*]*/i);
    if (shuttleMatch) {
      return '🚌 ' + shuttleMatch[0].replace(/\*\*\*/g, '').trim();
    }
    
    return '';
  }
}