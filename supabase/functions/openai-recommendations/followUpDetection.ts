// PHASE 3: Stricter follow-up detection to prevent category confusion
export function checkIfFollowUpQuestion(prompt: string, previousRecommendations?: string, requestType?: string, previousRequestType?: string): boolean {
  if (!previousRecommendations) return false;
  
  // PHASE 3: Only treat as follow-up if request categories match
  // e.g., don't treat "breakfast" as follow-up to "coffee"
  if (requestType && previousRequestType && requestType !== previousRequestType) {
    console.log(`⏭️ Not a follow-up: category changed from ${previousRequestType} to ${requestType}`);
    return false;
  }
  
  const followUpKeywords = [
    'walk to', 'walking', 'walkable', 'can i walk', 'how far',
    'distance', 'drive to', 'driving', 'close', 'near', 'nearby',
    'either of those', 'those places', 'them', 'it', 'any of them',
    'the restaurant', 'the cafe', 'the spot', 'those spots',
    'how long', 'minutes', 'blocks', 'far is', 'close is'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  const hasFollowUpKeyword = followUpKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  if (hasFollowUpKeyword) {
    console.log('✅ Follow-up detected with matching category');
  }
  
  return hasFollowUpKeyword;
}
