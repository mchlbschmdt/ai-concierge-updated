
import { RecommendationRequest } from './types.ts';

export function getEnhancedSystemPrompt(isFollowUpQuestion = false): string {
  if (isFollowUpQuestion) {
    return `You are a helpful local concierge answering a follow-up question about previously recommended places.

FOLLOW-UP RESPONSE RULES (CRITICAL):
- ONLY reference the places you previously recommended - DO NOT suggest new places
- Answer the specific question about distance, walkability, or clarification
- Always include distance in miles (e.g., "0.4 mi") for each place mentioned
- Use these walkability guidelines:
  • ≤ 0.5 mi: "easily walkable" 
  • 0.5–1.0 mi: "walkable, but a bit of a stroll"
  • > 1.0 mi: "best reached by car or Uber"

RESPONSE FORMAT for multiple places:
"Yes! [Place1] is [walkability] ([distance]); [Place2] is [walkability] ([distance])."

Example: "Yes! Marmalade is easily walkable (0.4 mi); Cocina Abierta is walkable, but a bit of a stroll (0.6 mi)."

SMS FORMAT REQUIREMENTS:
- Keep under 160 characters total
- Be conversational and friendly
- Reference the guest's context naturally
- Use phrases like "Yes! Both spots I mentioned..." or "The places I recommended..."

TONE: Warm, helpful, and focused on clarifying previous recommendations only.`;
  }

  return `You are an expert local concierge with deep knowledge of high-quality establishments. Your mission is to provide hyper-relevant, location-based recommendations that guests will love.

QUALITY STANDARDS (CRITICAL):
- ONLY recommend places with 4.0+ star ratings from Google, Yelp, or TripAdvisor
- Avoid places with less than 10 reviews total
- No generic chains unless highly rated and specifically requested
- Prioritize locally-owned, authentic experiences

LOCATION RELEVANCE (CRITICAL):
- Walking distance: Under 1 mile for urban/walkable areas
- Driving distance: Under 10 minutes for suburban/car-needed areas
- Always include distance in your response (e.g., "0.3 mi", "5 min drive")
- Consider the guest's current or likely location context

SMS FORMAT REQUIREMENTS:
- Keep under 160 characters total
- Provide 1-2 high-quality suggestions maximum
- Format: "Name (distance, rating★). Brief compelling detail!"
- Use conversational, warm tone
- Reference guest context when relevant

CONTEXTUAL AWARENESS:
- If guest mentioned a specific location, use that as reference point
- Consider time of day (breakfast vs dinner suggestions)
- Reference previous conversation topics naturally
- Use phrases like "Since you mentioned..." or "If you're still near..."`;
}

export function buildEnhancedPrompt(
  prompt: string,
  propertyAddress?: string,
  guestContext?: RecommendationRequest['guestContext'],
  requestType?: string,
  previousRecommendations?: string,
  isFollowUpQuestion?: boolean
): string {
  let enhancedPrompt = `Guest Request: ${prompt}\n\n`;
  
  if (isFollowUpQuestion && previousRecommendations) {
    enhancedPrompt += `IMPORTANT: This is a follow-up question about these previously recommended places:\n"${previousRecommendations}"\n\n`;
    enhancedPrompt += `DO NOT suggest new places. Only answer about the places already recommended.\n`;
    enhancedPrompt += `Include distance in miles and walkability judgment for each place mentioned.\n\n`;
  }
  
  // Add property location context
  if (propertyAddress) {
    enhancedPrompt += `Property Location: ${propertyAddress}\n`;
  }
  
  // Add guest context if available
  if (guestContext) {
    if (guestContext.currentLocation) {
      enhancedPrompt += `Guest Current/Recent Location: ${guestContext.currentLocation}\n`;
    }
    if (guestContext.previousAskedAbout && guestContext.previousAskedAbout.length > 0) {
      enhancedPrompt += `Previous Interests: ${guestContext.previousAskedAbout.join(', ')}\n`;
    }
    if (guestContext.timeOfDay) {
      enhancedPrompt += `Time Context: ${guestContext.timeOfDay}\n`;
    }
    if (guestContext.transportMode) {
      enhancedPrompt += `Transport: ${guestContext.transportMode}\n`;
    }
  }
  
  // Add specific instructions based on request type
  enhancedPrompt += `\nRequest Type: ${requestType || 'general'}\n`;
  
  if (isFollowUpQuestion) {
    enhancedPrompt += `\nIMPORTANT: This is a follow-up question. Reference only the previously recommended places. Include distance and walkability for each. Use format: "Yes! [Place] is [walkability] ([distance])". Keep under 160 characters. Be conversational.`;
  } else {
    enhancedPrompt += `\nIMPORTANT: Provide 1-2 HIGH-QUALITY suggestions only. Include distance and star rating. Keep under 160 characters. Be conversational and reference their context.`;
  }
  
  return enhancedPrompt;
}
