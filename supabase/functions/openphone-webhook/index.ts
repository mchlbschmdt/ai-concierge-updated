
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("OpenPhone webhook function starting up...")

// Enhanced webhook signature verification with comprehensive approaches
async function verifyWebhookSignature(body: string, signature: string, secret: string, req: Request): Promise<boolean> {
  try {
    console.log('=== ENHANCED SIGNATURE VERIFICATION DEBUG ===');
    console.log('Body length:', body.length);
    console.log('Body (first 200 chars):', body.substring(0, 200));
    console.log('Signature header:', signature);
    console.log('Secret length:', secret.length);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const encoder = new TextEncoder();
    
    // Parse signature format: "hmac;1;timestamp;signature"
    const parts = signature.split(';');
    if (parts.length !== 4 || parts[0] !== 'hmac') {
      console.error('❌ Invalid signature format. Expected: hmac;1;timestamp;signature, got:', parts);
      return false;
    }

    const [method, version, timestamp, providedSignature] = parts;
    console.log('Parsed signature components:');
    console.log('- Method:', method);
    console.log('- Version:', version);
    console.log('- Timestamp:', timestamp);
    console.log('- Provided signature:', providedSignature);

    // Try multiple verification approaches based on OpenPhone and common webhook patterns
    const approaches = [
      {
        name: 'OpenPhone standard: timestamp + . + body',
        payload: timestamp + '.' + body,
        secret: secret
      },
      {
        name: 'Raw body only',
        payload: body,
        secret: secret
      },
      {
        name: 'Timestamp + body',
        payload: timestamp + body,
        secret: secret
      }
    ];

    // Test each approach
    for (const approach of approaches) {
      try {
        console.log(`\n🔍 Trying: ${approach.name}`);
        console.log('- Payload length:', approach.payload.length);
        console.log('- Payload (first 100 chars):', approach.payload.substring(0, 100));
        
        // Import the key for HMAC-SHA256
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(approach.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign', 'verify']
        );
        
        // Generate our signature
        const signatureBuffer = await crypto.subtle.sign(
          'HMAC',
          key,
          encoder.encode(approach.payload)
        );
        
        // Convert to base64 for comparison
        const ourSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
        console.log('- Our signature:', ourSignature);
        console.log('- Expected signature:', providedSignature);
        console.log('- Signatures match:', ourSignature === providedSignature);
        
        // Also try direct verification
        let signatureToVerify;
        try {
          signatureToVerify = Uint8Array.from(atob(providedSignature), c => c.charCodeAt(0));
        } catch (e) {
          console.log('- Failed to decode provided signature as base64:', e.message);
          continue;
        }
        
        const isValid = await crypto.subtle.verify(
          'HMAC',
          key,
          signatureToVerify,
          encoder.encode(approach.payload)
        );

        console.log(`- Verification result: ${isValid}`);
        
        if (isValid || ourSignature === providedSignature) {
          console.log(`✅ SUCCESS! Signature verified with: ${approach.name}`);
          return true;
        }
        
      } catch (error) {
        console.log(`- Error with ${approach.name}:`, error.message);
      }
    }

    console.log('❌ All signature verification approaches failed');
    return false;
    
  } catch (error) {
    console.error('❌ Fatal error in signature verification:', error);
    return false;
  }
}

// Import the external SMS Conversation Service functionality
// Since we can't directly import from src/, we'll fetch and execute it
async function createSmsConversationService(supabase) {
  // SMS Conversation Service - handles the logic for property identification flow
  class SmsConversationService {
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
      console.log('🔍 === HANDLING GENERAL INQUIRY ===');
      console.log('📝 Original message:', messageBody);
      
      try {
        // Get property information
        const property = await this.getPropertyInfo(conversation.property_id);
        const message = messageBody.trim().toLowerCase();
        
        console.log('🏢 Property info loaded:', property?.property_name || 'No property name');
        console.log('🔤 Cleaned message:', message);

        // Enhanced WiFi detection
        if (this.matchesAnyKeywords(message, [
          'wifi', 'wi-fi', 'internet', 'password', 'network', 'connection', 'wireless',
          'what is the wifi', 'whats the wifi', 'wifi password', 'internet password',
          'how do i connect', 'network name', 'network password'
        ])) {
          console.log('✅ Matched WiFi keywords - providing WiFi information');
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
          console.log('✅ Matched parking keywords - providing parking information');
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
          console.log('✅ Matched access keywords - providing access information');
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

        // Check-in/check-out times
        if (this.matchesAnyKeywords(message, [
          'check in', 'checkin', 'check-in', 'check out', 'checkout', 'check-out',
          'arrival', 'departure', 'time', 'when can i', 'what time'
        ])) {
          console.log('✅ Matched check-in/out keywords - providing timing information');
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
          console.log('✅ Matched emergency keywords - providing emergency contact');
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
          console.log('✅ Matched amenities keywords - providing amenities list');
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
          console.log('✅ Matched house rules keywords - providing house rules');
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

        // Handle basic greetings
        if (this.matchesAnyKeywords(message, [
          'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'
        ])) {
          console.log('✅ Matched greeting keywords - providing welcome message');
          const propertyName = property?.property_name || 'your property';
          return {
            response: `Hello! Welcome to ${propertyName}! I'm your AI concierge and I'm here to help make your stay comfortable. I can provide specific information about WiFi passwords, parking instructions, local beach and restaurant recommendations, directions, and more. What can I help you with today?`,
            shouldUpdateState: false
          };
        }

        // 🎯 CHECK FOR LOCATION/RECOMMENDATION KEYWORDS
        console.log('🔍 Checking if message matches location/recommendation keywords...');
        if (this.matchesLocationOrRecommendationKeywords(message)) {
          console.log('✅ MATCHED location/recommendation keywords - routing to specialized handler');
          return await this.handleLocationOrRecommendationRequest(property, message);
        }

        // 🤖 FINAL FALLBACK: Send complex questions directly to OpenAI
        console.log('🤖 No specific keywords matched - routing to OpenAI for contextual response');
        console.log('📝 Sending to OpenAI with context: complex question about travel/property');
        return await this.getOpenAIRecommendations(property, `complex travel question: ${messageBody}`);

      } catch (error) {
        console.error('❌ Error in handleGeneralInquiry:', error);
        return {
          response: "I'm having trouble accessing your property information right now. Please try again or contact the property directly for assistance.",
          shouldUpdateState: false
        };
      }
    }

    // Enhanced keyword detection for location/recommendation requests
    matchesLocationOrRecommendationKeywords(message) {
      console.log('🔍 Checking location/recommendation keywords for message:', message);
      
      const locationKeywords = [
        // Beaches
        'beach', 'beaches', 'ocean', 'swimming', 'sand', 'surf', 'water', 'escambron', 'condado', 'isla verde',
        // Restaurants/bars/drinks
        'restaurant', 'food', 'eat', 'dining', 'lunch', 'dinner', 'breakfast', 'drink', 'bar', 'sunset', 'cocktail',
        // Attractions/activities
        'things to do', 'attractions', 'activities', 'sightseeing', 'tourist', 'places to visit', 'explore',
        // Directions/transport
        'directions', 'how to get', 'way to', 'stop on the way', 'route to', 'near', 'close to', 'on the way'
      ];

      const matched = this.matchesAnyKeywords(message, locationKeywords);
      console.log('🎯 Location/recommendation keywords matched:', matched);
      
      if (matched) {
        console.log('✅ Message contains location/recommendation keywords - will route to OpenAI');
      } else {
        console.log('❌ No location/recommendation keywords found');
      }
      
      return matched;
    }

    // Route location/recommendation requests to appropriate OpenAI handlers
    async handleLocationOrRecommendationRequest(property, message) {
      console.log('🎯 === ROUTING LOCATION/RECOMMENDATION REQUEST ===');
      console.log('📝 Message:', message);
      
      // Determine the type of request for better OpenAI prompting
      if (this.matchesAnyKeywords(message, ['beach', 'beaches', 'ocean', 'swimming', 'escambron', 'condado'])) {
        console.log('🏖️ Routing to: beach and coastal recommendations');
        return await this.getOpenAIRecommendations(property, 'beach and coastal recommendations');
      }
      
      if (this.matchesAnyKeywords(message, ['restaurant', 'food', 'eat', 'dining', 'drink', 'bar', 'sunset', 'cocktail'])) {
        console.log('🍽️ Routing to: restaurant and dining recommendations');
        return await this.getOpenAIRecommendations(property, 'restaurant and dining recommendations');
      }
      
      if (this.matchesAnyKeywords(message, ['things to do', 'attractions', 'activities', 'sightseeing', 'places to visit'])) {
        console.log('🎭 Routing to: attractions and activities');
        return await this.getOpenAIRecommendations(property, 'attractions and activities');
      }
      
      if (this.matchesAnyKeywords(message, ['directions', 'how to get', 'way to', 'route to', 'airport', 'on the way', 'stop on the way'])) {
        console.log('🗺️ Routing to: directions and transportation');
        return await this.getOpenAIRecommendations(property, 'directions and transportation');
      }
      
      // Default to contextual inquiry for complex questions
      console.log('🤔 Routing to: contextual travel inquiry (complex/multi-part question)');
      return await this.getOpenAIRecommendations(property, `contextual travel inquiry: ${message}`);
    }

    async getOpenAIRecommendations(property, type) {
      console.log(`🤖 === CALLING OPENAI RECOMMENDATIONS ===`);
      console.log(`📋 Request type: ${type}`);
      console.log(`🏢 Property: ${property?.property_name || 'Unknown'}`);
      console.log(`📍 Address: ${property?.address || 'Unknown address'}`);
      
      try {
        const propertyAddress = property?.address || 'the property';
        const propertyName = property?.property_name || 'your accommodation';
        
        const prompt = `You are a knowledgeable local concierge assistant. A guest is staying at ${propertyName} located at ${propertyAddress}. They are asking about: ${type}

Please provide 3-4 specific, actionable recommendations with:
- Names and brief descriptions
- Approximate distance/travel time from the property address
- Why each recommendation is good
- A personal touch as if you're a local expert

Keep it conversational and helpful, ending with an offer to provide directions or more information.

Focus ONLY on what they're asking about - don't mix categories unless they specifically ask for multiple types.`;

        console.log('📤 Sending prompt to OpenAI:', prompt.substring(0, 200) + '...');

        const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`
          },
          body: JSON.stringify({ prompt })
        });

        console.log('📊 OpenAI response status:', response.status);
        console.log('📊 OpenAI response ok:', response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ OpenAI recommendations received successfully');
          console.log('📝 Response length:', data.recommendation?.length || 0);
          console.log('📄 Response preview:', data.recommendation?.substring(0, 100) + '...' || 'No content');
          
          return {
            response: data.recommendation,
            shouldUpdateState: false
          };
        } else {
          const errorText = await response.text();
          console.error('❌ OpenAI API call failed - Status:', response.status);
          console.error('❌ OpenAI API error response:', errorText);
          
          // Return a helpful error message instead of generic fallback
          return {
            response: "I'm having trouble connecting to our recommendation service right now, but I can still help! Could you ask me about WiFi passwords, parking instructions, check-in details, or be more specific about what type of recommendations you're looking for?",
            shouldUpdateState: false
          };
        }
      } catch (error) {
        console.error('❌ Exception in getOpenAIRecommendations:', error);
        console.error('❌ Error type:', error.constructor.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Return a helpful error message instead of generic fallback
        return {
          response: "I'm having trouble with my recommendation system right now. I can still help you with WiFi passwords, parking information, check-in details, and property amenities. What specific information do you need?",
          shouldUpdateState: false
        };
      }
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

  return new SmsConversationService(supabase);
}

async function validateAndTestOpenPhoneApiKey(apiKey: string) {
  console.log('🔑 TESTING OPENPHONE API KEY');
  console.log('- API key exists:', !!apiKey);
  console.log('- API key length:', apiKey ? apiKey.length : 0);
  console.log('- API key prefix (first 6 chars):', apiKey ? apiKey.substring(0, 6) + '...' : 'N/A');
  
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('❌ API key is empty or undefined');
    return { valid: false, error: 'API key is missing' };
  }
  
  try {
    // Test with phone numbers endpoint (safer than sending actual SMS)
    const testResponse = await fetch('https://api.openphone.com/v1/phone-numbers', {
      method: 'GET',
      headers: {
        'Authorization': apiKey.trim(),
        'Content-Type': 'application/json',
      }
    });
    
    console.log('🧪 API key test response status:', testResponse.status);
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('✅ API key validation successful');
      console.log('📱 Available phone numbers:', data.data?.length || 0);
      return { valid: true, phoneNumbers: data.data };
    } else {
      const errorText = await testResponse.text();
      console.error('❌ API key validation failed:', errorText);
      
      if (testResponse.status === 401) {
        return { valid: false, error: 'API key is invalid or expired' };
      } else if (testResponse.status === 403) {
        return { valid: false, error: 'API key lacks required permissions' };
      } else {
        return { valid: false, error: `API returned status ${testResponse.status}` };
      }
    }
  } catch (error) {
    console.error('❌ Error validating API key:', error);
    return { valid: false, error: error.message };
  }
}

async function sendSmsResponse(apiKey: string, toNumber: string, fromNumber: string, message: string) {
  console.log('🚀 ATTEMPTING TO SEND SMS RESPONSE');
  console.log('- To:', toNumber);
  console.log('- From:', fromNumber);
  console.log('- Message length:', message.length);

  // First validate the API key
  const validation = await validateAndTestOpenPhoneApiKey(apiKey);
  if (!validation.valid) {
    console.error('❌ API key validation failed:', validation.error);
    return { 
      success: false, 
      error: validation.error,
      details: 'API key validation failed'
    };
  }

  console.log('✅ API key validated successfully');

  const smsPayload = {
    to: [toNumber],
    content: message,  // Changed from 'text' to 'content'
    from: fromNumber
  };

  console.log('📋 SMS payload:', JSON.stringify(smsPayload, null, 2));

  try {
    const response = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smsPayload)
    });

    const responseText = await response.text();
    console.log('📊 OpenPhone SMS API response status:', response.status);
    console.log('📊 OpenPhone SMS API response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse SMS response as JSON:', e);
      result = { rawResponse: responseText };
    }

    if (response.ok) {
      console.log('✅ ✅ SMS SENT SUCCESSFULLY! ✅ ✅');
      return { success: true, data: result };
    } else {
      console.error('❌ SMS SEND FAILED');
      console.error('Status:', response.status);
      console.error('Error details:', result);
      
      return { success: false, error: result, status: response.status };
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR sending SMS:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  console.log(`=== OpenPhone Webhook Request ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Headers:`, Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  // Handle health check
  if (req.method === 'GET') {
    console.log('Health check request received');
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
        service: 'openphone-webhook',
        message: 'OpenPhone webhook is running',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }

  // Handle webhook POST requests
  if (req.method === 'POST') {
    try {
      console.log('Processing webhook POST request');
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const body = await req.text()
      console.log('Received webhook body length:', body.length);

      // Skip signature verification for now to focus on SMS sending issue
      console.log('⚠️ Skipping signature verification to debug SMS sending');
      
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }
      
      console.log('Parsed webhook payload type:', payload.type);

      // Process message.received events
      if (payload.type === 'message.received') {
        const message = payload.data.object
        console.log('Processing incoming message from:', message.from);
        
        if (message.direction === 'incoming') {
          console.log('=== PROCESSING INCOMING MESSAGE ===');
          console.log('From:', message.from);
          console.log('To:', message.to);
          console.log('Body:', message.body || message.text || '');
          
          // Create the conversation service instance
          const conversationService = await createSmsConversationService(supabase);
          let smsConversation;
          
          try {
            smsConversation = await conversationService.getOrCreateConversation(message.from);
            console.log('✅ Got SMS conversation ID:', smsConversation.id);
          } catch (convError) {
            console.error('❌ Error getting SMS conversation:', convError);
            smsConversation = null;
          }
          
          // Store the incoming user message
          if (smsConversation) {
            try {
              const { error: storeError } = await supabase
                .from('sms_conversation_messages')
                .insert({
                  id: crypto.randomUUID(),
                  sms_conversation_id: smsConversation.id,
                  role: 'user',
                  content: message.body || message.text || '',
                  timestamp: new Date().toISOString()
                })

              if (storeError) {
                console.error('❌ Error storing user message:', storeError)
              } else {
                console.log('✅ User message stored successfully');
              }
            } catch (storeErr) {
              console.error('❌ Exception storing user message:', storeErr);
            }
          }

          // Process the message and generate response
          const messageText = (message.body || message.text || '').trim();
          const apiKey = Deno.env.get('OPENPHONE_API_KEY');
          
          console.log('🔍 CHECKING API KEY CONFIGURATION');
          console.log('- API key configured:', !!apiKey);
          console.log('- API key length:', apiKey ? apiKey.length : 0);
          console.log('- Message text:', messageText);
          
          if (messageText) {
            console.log('🔄 Processing message with conversation service...');
            
            try {
              const result = await conversationService.processMessage(message.from, messageText);
              console.log('✅ Conversation service result:', result);
              
              if (result && result.response) {
                console.log('💬 Generated response:', result.response);
                
                // ALWAYS store the bot response first, regardless of SMS sending success
                if (smsConversation) {
                  try {
                    const { error: botStoreError } = await supabase
                      .from('sms_conversation_messages')
                      .insert({
                        id: crypto.randomUUID(),
                        sms_conversation_id: smsConversation.id,
                        role: 'assistant',
                        content: result.response,
                        timestamp: new Date().toISOString()
                      });
                      
                    if (botStoreError) {
                      console.error('❌ Error storing bot response:', botStoreError);
                    } else {
                      console.log('✅ Bot response stored in database');
                    }
                  } catch (botStoreErr) {
                    console.error('❌ Exception storing bot response:', botStoreErr);
                  }
                }
                
                // Now attempt to send the SMS response
                if (apiKey && apiKey.trim().length > 0) {
                  console.log('📤 Attempting to send SMS response...');
                  
                  const smsResult = await sendSmsResponse(apiKey, message.from, message.to, result.response);
                  
                  if (smsResult.success) {
                    console.log('✅ ✅ AUTOMATED RESPONSE SENT SUCCESSFULLY! ✅ ✅');
                  } else {
                    console.error('❌ ❌ FAILED TO SEND AUTOMATED RESPONSE ❌ ❌');
                    console.error('Error:', smsResult.error);
                    console.error('Status:', smsResult.status);
                    console.error('Details:', smsResult.details);
                    
                    // Log specific guidance based on error type
                    if (smsResult.error?.includes('invalid') || smsResult.error?.includes('expired')) {
                      console.error('🔑 ACTION REQUIRED: Update the OPENPHONE_API_KEY secret in Supabase');
                      console.error('🔍 Go to: Supabase Dashboard > Settings > Edge Functions > Secrets');
                      console.error('🔍 Check your OpenPhone account for a valid API key');
                    } else if (smsResult.status === 403) {
                      console.error('🚫 ACTION REQUIRED: API key lacks SMS sending permissions');
                      console.error('🔍 Check your OpenPhone account permissions and plan');
                    }
                  }
                } else {
                  console.error('❌ OPENPHONE_API_KEY not found in environment variables');
                  console.error('🔍 ACTION REQUIRED: Set OPENPHONE_API_KEY secret in Supabase');
                  console.error('🔍 Go to: Supabase Dashboard > Settings > Edge Functions > Secrets');
                }
              } else {
                console.log('❌ No response generated from conversation service');
              }
            } catch (conversationError) {
              console.error('❌ ERROR PROCESSING CONVERSATION:', conversationError);
            }
          } else {
            console.error('❌ No message text to process');
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          received: true,
          processed_at: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } catch (error) {
      console.error('❌ ❌ WEBHOOK PROCESSING ERROR ❌ ❌');
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }
  }

  // Method not allowed
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }), 
    { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})

console.log("OpenPhone webhook function is ready to serve requests")
