export interface PropertyDataResponse {
  content: string;
  hasData: boolean;
  dataType: 'amenities' | 'checkout' | 'emergency' | 'access' | 'general';
}

export class PropertyDataExtractor {
  
  static extractAmenityInfo(property: any, message: string): PropertyDataResponse {
    const lowerMessage = message.toLowerCase();
    const amenities = property.amenities ? JSON.parse(property.amenities) : [];
    const specialNotes = property.special_notes || '';
    
    let response = '';
    let hasData = false;
    
    // BBQ Grill information
    if ((lowerMessage.includes('grill') || lowerMessage.includes('bbq') || lowerMessage.includes('barbecue')) && amenities.includes('BBQ Grill')) {
      response += '🔥 Yes! There\'s a BBQ grill available for you to use! Perfect for grilling up some dinner. 🍖\n\nWant me to recommend what groceries to pick up for a cookout?';
      hasData = true;
    } else if (lowerMessage.includes('grill') || lowerMessage.includes('bbq') || lowerMessage.includes('barbecue')) {
      response += '🔥 No grill at this property, but I can recommend great BBQ restaurants nearby if you\'re craving grilled food! 🍖';
      hasData = true;
    }
    
    // Pool information
    if (lowerMessage.includes('pool') && amenities.includes('Pool')) {
      response += '🏊‍♀️ Yes! The property has a pool. ';
      hasData = true;
      
      if (specialNotes.includes('pool') || specialNotes.includes('Pool')) {
        const poolInfo = this.extractPoolInfo(specialNotes);
        if (poolInfo) response += poolInfo + ' ';
      }
      
      if (property.local_recommendations && property.local_recommendations.includes('Seven Eagles pool')) {
        response += 'For the best pool experience, check out the Seven Eagles pool on the resort—it has spas and gorgeous views!';
      }
    }
    
    // Hot tub information
    if (lowerMessage.includes('hot tub') && amenities.includes('Hot Tub')) {
      response += '🛁 Yes! There\'s a hot tub available. ';
      hasData = true;
      
      if (specialNotes.includes('hot tub') || specialNotes.includes('Hot Tub')) {
        const hotTubInfo = this.extractHotTubInfo(specialNotes);
        if (hotTubInfo) response += hotTubInfo;
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
        content: 'I don\'t have specific checkout information for this property. Let me get that for you from the host.',
        hasData: false,
        dataType: 'checkout'
      };
    }
    
    let response = '';
    
    if (checkoutTime) {
      response += `⏰ Checkout time is ${checkoutTime}. `;
    }
    
    if (cleaningInstructions) {
      response += `📝 Checkout instructions: ${cleaningInstructions}`;
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
        content: 'For any maintenance issues or emergencies, I\'ll help connect you with the property host. What specific issue are you experiencing?',
        hasData: false,
        dataType: 'emergency'
      };
    }
    
    const response = `🚨 For maintenance problems or emergencies, contact: ${emergencyContact}`;
    
    return {
      content: response,
      hasData: true,
      dataType: 'emergency'
    };
  }
  
  static extractAccessInfo(property: any): PropertyDataResponse {
    const accessInstructions = property.access_instructions || '';
    
    if (!accessInstructions) {
      return {
        content: 'I don\'t have the access instructions readily available. Let me get those details for you from the host.',
        hasData: false,
        dataType: 'access'
      };
    }
    
    const response = `🔑 Access instructions: ${accessInstructions}`;
    
    return {
      content: response,
      hasData: true,
      dataType: 'access'
    };
  }
  
  static extractGroceryTransportInfo(property: any): PropertyDataResponse {
    const localRecs = property.local_recommendations || '';
    
    let response = '';
    let hasData = false;
    
    // Look for grocery information in local recommendations
    if (localRecs.includes('Aldi') || localRecs.includes('Publix') || localRecs.includes('grocery')) {
      const groceryInfo = this.extractGroceryInfo(localRecs);
      if (groceryInfo) {
        response += groceryInfo + ' ';
        hasData = true;
      }
    }
    
    // Add transportation info
    if (localRecs.includes('shuttle') || localRecs.includes('Disney')) {
      const transportInfo = this.extractTransportInfo(localRecs);
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
  
  private static extractGroceryInfo(recommendations: string): string {
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
  
  private static extractTransportInfo(recommendations: string): string {
    const shuttleMatch = recommendations.match(/\*\*\*Disney Shuttle[^*]*\*\*\*[^*]*/i);
    if (shuttleMatch) {
      return '🚌 ' + shuttleMatch[0].replace(/\*\*\*/g, '').trim();
    }
    
    return '';
  }
}