
// SMS Conversation Service - handles the logic for property identification flow
export class SmsConversationService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getOrCreateConversation(phoneNumber) {
    console.log('Getting or creating conversation for:', phoneNumber);
    
    // Try to get existing conversation
    const { data: existing, error } = await this.supabase
      .from('sms_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching conversation:', error);
    }

    if (existing) {
      console.log('Found existing conversation:', existing);
      return existing;
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await this.supabase
      .from('sms_conversations')
      .insert({
        phone_number: phoneNumber,
        conversation_state: 'awaiting_property_id'
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create conversation:', createError);
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }

    console.log('Created new conversation:', newConversation);
    return newConversation;
  }

  async updateConversationState(phoneNumber, updates) {
    console.log('Updating conversation state for:', phoneNumber, 'with:', updates);
    
    const { data, error } = await this.supabase
      .from('sms_conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber)
      .select()
      .single();

    if (error) {
      console.error('Failed to update conversation:', error);
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    console.log('Updated conversation successfully:', data);
    return data;
  }

  async resetConversation(phoneNumber) {
    console.log('Resetting conversation for:', phoneNumber);
    
    return await this.updateConversationState(phoneNumber, {
      conversation_state: 'awaiting_property_id',
      property_id: null,
      property_confirmed: false
    });
  }

  async findPropertyByCode(code) {
    console.log('Looking up property code:', code);
    
    // First try the properties table
    const { data: property, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error in properties table:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (property) {
      console.log('Found property in properties table:', property);
      return {
        property_id: property.id,
        property_name: property.property_name,
        address: property.address,
        check_in_time: property.check_in_time || '4:00 PM',
        check_out_time: property.check_out_time || '11:00 AM',
        knowledge_base: property.knowledge_base || '',
        local_recommendations: property.local_recommendations || ''
      };
    }

    // Also try the property_codes table as fallback
    const { data: propertyCode, error: codeError } = await this.supabase
      .from('property_codes')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (codeError && codeError.code !== 'PGRST116') {
      console.error('Database error in property_codes table:', codeError);
      throw new Error(`Database error: ${codeError.message}`);
    }

    if (propertyCode) {
      console.log('Found property in property_codes table:', propertyCode);
      return {
        property_id: propertyCode.property_id,
        property_name: propertyCode.property_name,
        address: propertyCode.address
      };
    } else {
      console.log('Property code not found in either table');
    }

    return null;
  }

  async processMessage(phoneNumber, messageBody) {
    console.log('=== PROCESSING MESSAGE ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', messageBody);
    
    try {
      const conversation = await this.getOrCreateConversation(phoneNumber);
      const cleanMessage = messageBody.trim().toLowerCase();

      console.log('Current conversation state:', conversation.conversation_state);
      console.log('Clean message:', cleanMessage);

      // Handle reset commands first
      if (cleanMessage === 'reset' || cleanMessage === 'restart' || cleanMessage === 'start over') {
        console.log('Processing reset command');
        await this.resetConversation(phoneNumber);
        return {
          response: "I've reset our conversation. Please text me your property ID number to get started.",
          shouldUpdateState: true
        };
      }

      switch (conversation.conversation_state) {
        case 'awaiting_property_id':
          return await this.handlePropertyIdInput(conversation, cleanMessage);
        
        case 'awaiting_confirmation':
          return await this.handleConfirmation(conversation, cleanMessage);
        
        case 'confirmed':
          return await this.handleGeneralInquiry(conversation, messageBody);
        
        default:
          console.log('Unknown conversation state, resetting to awaiting_property_id');
          await this.resetConversation(phoneNumber);
          return this.getWelcomeMessage();
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "I'm sorry, I encountered an error. Please try again or text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  async handlePropertyIdInput(conversation, input) {
    console.log('Handling property ID input:', input);
    
    // Extract numbers from the message (in case they type "Property 1234" or "1234")
    const propertyCode = input.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      console.log('No property code found in input');
      return {
        response: "Hi! To get started, please text me your property ID number. You should have received this in your booking confirmation. If you need help, text 'reset' to start over.",
        shouldUpdateState: false
      };
    }

    console.log('Extracted property code:', propertyCode);

    try {
      const property = await this.findPropertyByCode(propertyCode);
      
      if (!property) {
        console.log('Property not found for code:', propertyCode);
        return {
          response: `I couldn't find a property with ID ${propertyCode}. Please check your booking confirmation and try again with the correct property ID. You can also text 'reset' to start over.`,
          shouldUpdateState: false
        };
      }

      console.log('Found property, updating conversation state to awaiting_confirmation');
      // Update conversation with property info and move to confirmation state
      await this.updateConversationState(conversation.phone_number, {
        property_id: property.property_id || property.id,
        conversation_state: 'awaiting_confirmation'
      });

      return {
        response: `Great! It looks like you're staying at ${property.property_name} (${property.address}). Is this correct? Please reply Y for Yes or N for No.`,
        shouldUpdateState: true
      };
    } catch (error) {
      console.error('Error finding property:', error);
      return {
        response: "I'm having trouble looking up that property ID. Please try again in a moment or text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmation(conversation, input) {
    console.log('Handling confirmation with input:', input);
    
    // Normalize input for comparison
    const normalizedInput = input.toLowerCase().trim();
    console.log('Normalized input:', normalizedInput);
    
    const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'true', '1', 'ok', 'okay', 'yup', 'sure', 'absolutely', 'definitely'].includes(normalizedInput);
    const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect', 'false', '0', 'nah', 'negative'].includes(normalizedInput);

    console.log('Is yes?', isYes);
    console.log('Is no?', isNo);

    if (isYes) {
      console.log('User confirmed property - updating to confirmed state');
      await this.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed'
      });

      return {
        response: "Perfect! I'm your AI concierge for your stay. I can help you with specific information about WiFi, parking, directions, local recommendations, and more. What would you like to know?",
        shouldUpdateState: true
      };
    } else if (isNo) {
      console.log('User rejected property - resetting to awaiting_property_id');
      await this.updateConversationState(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id'
      });

      return {
        response: "No problem! Let's make sure we have the correct property ID. Can you please provide your property ID again? You can find this in your booking confirmation.",
        shouldUpdateState: true
      };
    } else {
      console.log('Unclear confirmation response:', input);
      return {
        response: "Please reply with Y for Yes or N for No to confirm if this is the correct property. You can also text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  async handleGeneralInquiry(conversation, messageBody) {
    console.log('Handling general inquiry:', messageBody);
    
    try {
      // Get property information
      const property = await this.getPropertyInfo(conversation.property_id);
      const message = messageBody.trim().toLowerCase();
      
      console.log('Property info:', property);
      console.log('User message:', message);

      // Enhanced WiFi detection
      if (this.matchesAnyKeywords(message, [
        'wifi', 'wi-fi', 'internet', 'password', 'network', 'connection', 'wireless',
        'what is the wifi', 'whats the wifi', 'wifi password', 'internet password',
        'how do i connect', 'network name', 'network password'
      ])) {
        if (property?.wifi_name && property?.wifi_password) {
          return {
            response: `Here are your WiFi details:\n\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nJust connect to the network and enter the password. The signal is strongest in the living room. Need help with anything else?`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "WiFi information should be available in your check-in instructions. If you can't find it, please contact the property directly for WiFi details.",
            shouldUpdateState: false
          };
        }
      }

      // Enhanced parking detection
      if (this.matchesAnyKeywords(message, [
        'parking', 'park', 'car', 'vehicle', 'garage', 'spot', 'valet',
        'where can i park', 'where do i park', 'parking instructions',
        'how to park', 'parking garage', 'parking spot'
      ])) {
        if (property?.parking_instructions) {
          return {
            response: `${property.parking_instructions}\n\nDo you need directions to the parking garage or have other parking questions?`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "For parking information, please check your booking confirmation or contact the property directly.",
            shouldUpdateState: false
          };
        }
      }

      // Enhanced access/entry detection
      if (this.matchesAnyKeywords(message, [
        'access', 'entry', 'key', 'code', 'door', 'enter', 'get in', 'unlock', 'lock',
        'how do i get in', 'entry code', 'door code', 'access code',
        'building access', 'front door', 'main entrance'
      ])) {
        if (property?.access_instructions) {
          return {
            response: `${property.access_instructions}\n\nIf you have any trouble accessing the building or unit, please contact our emergency line. Need anything else?`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "Access instructions should be provided closer to your check-in time. If you need immediate access help, please contact the property directly.",
            shouldUpdateState: false
          };
        }
      }

      // Enhanced beach/location recommendations with intelligent parsing
      if (this.matchesAnyKeywords(message, [
        'beach', 'beaches', 'ocean', 'swimming', 'sand', 'surf', 'water',
        'nearest beach', 'closest beach', 'best beach', 'beach recommendation',
        'where can i swim', 'good beaches', 'beach nearby'
      ])) {
        return this.handleBeachRecommendations(property);
      }

      // Restaurant recommendations
      if (this.matchesAnyKeywords(message, [
        'restaurant', 'food', 'eat', 'dining', 'lunch', 'dinner', 'breakfast',
        'where to eat', 'good restaurants', 'food nearby', 'restaurants near',
        'hungry', 'meal', 'cuisine'
      ])) {
        return this.handleRestaurantRecommendations(property);
      }

      // Direction/transportation requests
      if (this.matchesAnyKeywords(message, [
        'airport', 'how to get to', 'directions to', 'taxi', 'uber', 'transport',
        'get to airport', 'airport shuttle', 'public transport', 'bus',
        'how do i get', 'directions', 'travel to'
      ])) {
        return this.handleDirectionsAndTransport(property, message);
      }

      // Attractions and activities
      if (this.matchesAnyKeywords(message, [
        'things to do', 'attractions', 'activities', 'sightseeing', 'tourist',
        'what to see', 'places to visit', 'recommendations', 'fun',
        'entertainment', 'tours', 'explore'
      ])) {
        return this.handleAttractionsRecommendations(property);
      }

      // Check-in/check-out times
      if (this.matchesAnyKeywords(message, [
        'check in', 'checkin', 'check-in', 'check out', 'checkout', 'check-out',
        'arrival', 'departure', 'time', 'when can i', 'what time'
      ])) {
        const checkInTime = property?.check_in_time || '4:00 PM';
        const checkOutTime = property?.check_out_time || '11:00 AM';
        return {
          response: `Check-in is at ${checkInTime} and check-out is at ${checkOutTime}. If you need to arrange an early check-in or late check-out, please contact the property directly. Is there anything else I can help you with?`,
          shouldUpdateState: false
        };
      }

      // Emergency contact
      if (this.matchesAnyKeywords(message, [
        'emergency', 'urgent', 'contact', 'phone', 'help', 'problem', 'issue',
        'trouble', 'emergency contact', 'property manager', 'need help'
      ])) {
        if (property?.emergency_contact) {
          return {
            response: `For urgent matters, here's the emergency contact:\n\n${property.emergency_contact}\n\nDon't hesitate to call if you need immediate assistance!`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "For urgent matters, please contact the property directly using the phone number provided in your booking confirmation.",
            shouldUpdateState: false
          };
        }
      }

      // Amenities
      if (this.matchesAnyKeywords(message, [
        'amenities', 'facilities', 'pool', 'gym', 'laundry', 'kitchen',
        'features', 'what does', 'what is available', 'included'
      ])) {
        if (property?.amenities && property.amenities.length > 0) {
          const amenitiesList = Array.isArray(property.amenities) ? property.amenities : JSON.parse(property.amenities || '[]');
          return {
            response: `Your property includes these amenities:\n\n${amenitiesList.map(a => `• ${a}`).join('\n')}\n\nWould you like more details about any specific amenity?`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "For information about available amenities, please check your booking confirmation or contact the property directly.",
            shouldUpdateState: false
          };
        }
      }

      // House rules
      if (this.matchesAnyKeywords(message, [
        'rules', 'policy', 'allowed', 'smoking', 'pets', 'noise',
        'regulations', 'guidelines', 'house rules', 'policies'
      ])) {
        if (property?.house_rules) {
          return {
            response: `Here are the house rules for your stay:\n\n${property.house_rules}\n\nPlease let me know if you have questions about any of these policies.`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "For property rules and policies, please check your booking confirmation or contact the property directly.",
            shouldUpdateState: false
          };
        }
      }

      // Handle greetings
      if (this.matchesAnyKeywords(message, [
        'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'
      ])) {
        const propertyName = property?.property_name || 'your property';
        return {
          response: `Hello! Welcome to ${propertyName}! I'm your AI concierge and I'm here to help make your stay comfortable. I can provide specific information about WiFi passwords, parking instructions, local beach and restaurant recommendations, directions, and more. What can I help you with today?`,
          shouldUpdateState: false
        };
      }

      // Handle simple confirmations and thanks
      if (this.matchesAnyKeywords(message, [
        'yes', 'y', 'ok', 'okay', 'sure', 'thanks', 'thank you', 'great', 'perfect', 'good'
      ])) {
        return {
          response: `Great! I'm here whenever you need assistance. I can help with:\n\n• WiFi passwords and network info\n• Specific beach recommendations with ratings\n• Restaurant suggestions and directions\n• Transportation to airport or attractions\n• Property amenities and house rules\n\nWhat would you like to know about your stay at ${property?.property_name || 'your property'}?`,
          shouldUpdateState: false
        };
      }

      // Smart default response with property context
      const propertyName = property?.property_name || 'your property';
      return {
        response: `I can help you with specific information about your stay at ${propertyName}! Try asking me:\n\n• "What's the WiFi password?"\n• "Where's the nearest beach?"\n• "Good restaurants nearby?"\n• "How do I get to the airport?"\n• "What amenities are available?"\n\nOr just tell me what you need to know!`,
        shouldUpdateState: false
      };

    } catch (error) {
      console.error('Error in handleGeneralInquiry:', error);
      return {
        response: "I'm having trouble accessing your property information right now. Please try again or contact the property directly for assistance.",
        shouldUpdateState: false
      };
    }
  }

  handleBeachRecommendations(property) {
    console.log('🏖️ DEBUG: Beach recommendations called');
    console.log('🏖️ Property data:', property);
    console.log('🏖️ Local recommendations field:', property?.local_recommendations);
    
    if (property?.local_recommendations) {
      const beachSection = this.extractSection(property.local_recommendations, 'BEACHES');
      console.log('🏖️ Extracted beach section:', beachSection);
      
      if (beachSection) {
        return {
          response: `Here are the best beaches near you:\n\n${beachSection}\n\nCondado Beach is my top recommendation - it's just a 5-minute walk with excellent swimming and beachfront dining! Would you like directions to any of these beaches or more recommendations?`,
          shouldUpdateState: false
        };
      } else {
        console.log('🏖️ DEBUG: Beach section not found, trying fallback parsing');
        // Fallback: try to find beach content differently
        const recommendations = property.local_recommendations;
        if (recommendations.toLowerCase().includes('beach')) {
          // Try to extract just the beach-related content manually
          const lines = recommendations.split(/[.!]\s*/);
          const beachLines = lines.filter(line => 
            line.toLowerCase().includes('beach') || 
            line.toLowerCase().includes('swimming') ||
            line.toLowerCase().includes('condado') ||
            line.toLowerCase().includes('ocean park') ||
            line.toLowerCase().includes('isla verde')
          );
          
          if (beachLines.length > 0) {
            const beachInfo = beachLines.join('. ');
            console.log('🏖️ Fallback beach info found:', beachInfo);
            return {
              response: `Here are the best beaches near you:\n\n${beachInfo}\n\nWould you like directions to any of these beaches or more recommendations?`,
              shouldUpdateState: false
            };
          }
        }
      }
    }
    
    console.log('🏖️ DEBUG: No beach data found, using generic response');
    return {
      response: "I'd recommend checking local travel guides for beach information. The property staff may also have great suggestions for nearby beaches!",
      shouldUpdateState: false
    };
  }

  handleRestaurantRecommendations(property) {
    console.log('🍽️ DEBUG: Restaurant recommendations called');
    console.log('🍽️ Local recommendations field:', property?.local_recommendations);
    
    if (property?.local_recommendations) {
      const restaurantSection = this.extractSection(property.local_recommendations, 'RESTAURANTS');
      console.log('🍽️ Extracted restaurant section:', restaurantSection);
      
      if (restaurantSection) {
        return {
          response: `Here are some excellent restaurants nearby:\n\n${restaurantSection}\n\nMarmalade (3 blocks away) is perfect for fine dining, while La Placita (5 min) offers great local nightlife! Would you like directions to any of these restaurants or different cuisine recommendations?`,
          shouldUpdateState: false
        };
      } else {
        // Fallback parsing for restaurants
        const recommendations = property.local_recommendations;
        if (recommendations.toLowerCase().includes('restaurant')) {
          const lines = recommendations.split(/[.!]\s*/);
          const restaurantLines = lines.filter(line => 
            line.toLowerCase().includes('restaurant') || 
            line.toLowerCase().includes('dining') ||
            line.toLowerCase().includes('marmalade') ||
            line.toLowerCase().includes('placita') ||
            line.toLowerCase().includes('santaella')
          );
          
          if (restaurantLines.length > 0) {
            const restaurantInfo = restaurantLines.join('. ');
            return {
              response: `Here are some excellent restaurants nearby:\n\n${restaurantInfo}\n\nWould you like directions to any of these restaurants?`,
              shouldUpdateState: false
            };
          }
        }
      }
    }
    return {
      response: "For restaurant recommendations, I'd suggest checking travel apps or asking locals. The property staff may also have great dining suggestions!",
      shouldUpdateState: false
    };
  }

  handleDirectionsAndTransport(property, message) {
    if (this.matchesAnyKeywords(message, ['airport'])) {
      if (property?.knowledge_base) {
        const airportInfo = this.extractSection(property.knowledge_base, 'AIRPORT');
        if (airportInfo) {
          return {
            response: `Here's how to get to the airport:\n\n${airportInfo}\n\nTaxis are readily available and take about 20 minutes ($25-35). Would you like me to help you arrange transportation or need directions anywhere else?`,
            shouldUpdateState: false
          };
        }
      }
    }

    if (property?.knowledge_base) {
      const transportInfo = this.extractSection(property.knowledge_base, 'TRANSPORTATION');
      if (transportInfo) {
        return {
          response: `Transportation options:\n\n${transportInfo}\n\nWhat specific destination do you need directions to?`,
          shouldUpdateState: false
        };
      }
    }

    return {
      response: "For transportation and directions, taxis and rideshare services are usually available. Where specifically would you like to go? I can provide more targeted advice.",
      shouldUpdateState: false
    };
  }

  handleAttractionsRecommendations(property) {
    if (property?.local_recommendations) {
      const attractionSection = this.extractSection(property.local_recommendations, 'ATTRACTIONS');
      if (attractionSection) {
        return {
          response: `Here are must-see attractions:\n\n${attractionSection}\n\nOld San Juan (5 min away) is perfect for a day trip with historic forts and colorful buildings! El Yunque Rainforest offers amazing hiking if you have a car. Would you like detailed directions to any of these attractions?`,
          shouldUpdateState: false
        };
      }
    }
    return {
      response: "For local attractions and activities, I'd suggest checking travel guides or asking the property staff for personalized recommendations based on your interests!",
      shouldUpdateState: false
    };
  }

  extractSection(text, sectionName) {
    console.log(`🔍 DEBUG: Extracting section "${sectionName}" from text:`, text);
    
    if (!text || !sectionName) {
      console.log('🔍 DEBUG: Missing text or sectionName');
      return null;
    }

    // Try multiple regex patterns to be more robust
    const patterns = [
      // Original pattern
      new RegExp(`${sectionName}:\\s*([^A-Z]*?)(?=[A-Z]+:|$)`, 'i'),
      // More flexible pattern that allows for different spacing and punctuation
      new RegExp(`${sectionName}\\s*:([^A-Z]*?)(?=[A-Z]+\\s*:|$)`, 'i'),
      // Even more flexible - look for content until next section or end
      new RegExp(`${sectionName}\\s*:([\\s\\S]*?)(?=[A-Z]{2,}\\s*:|$)`, 'i')
    ];

    for (let i = 0; i < patterns.length; i++) {
      console.log(`🔍 DEBUG: Trying pattern ${i + 1}:`, patterns[i]);
      const match = text.match(patterns[i]);
      console.log(`🔍 DEBUG: Pattern ${i + 1} match:`, match);
      
      if (match && match[1]) {
        const result = match[1].trim();
        console.log(`🔍 DEBUG: Successfully extracted with pattern ${i + 1}:`, result);
        return result;
      }
    }

    console.log(`🔍 DEBUG: No match found for section "${sectionName}"`);
    return null;
  }

  async getPropertyInfo(propertyId) {
    if (!propertyId) return null;

    try {
      const { data: property, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching property info:', error);
        return null;
      }

      return property;
    } catch (error) {
      console.error('Error getting property info:', error);
      return null;
    }
  }

  matchesAnyKeywords(message, keywords) {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  getWelcomeMessage() {
    return {
      response: "Welcome! To get started, please text me your property ID number. You should have received this in your booking confirmation. Text 'reset' anytime to restart.",
      shouldUpdateState: false
    };
  }
}
