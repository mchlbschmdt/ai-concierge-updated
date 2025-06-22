
export function checkIfFollowUpQuestion(prompt: string, previousRecommendations?: string): boolean {
  if (!previousRecommendations) return false;
  
  const followUpKeywords = [
    'walk to', 'walking', 'walkable', 'can i walk', 'how far',
    'distance', 'drive to', 'driving', 'close', 'near', 'nearby',
    'either of those', 'those places', 'them', 'it', 'any of them',
    'the restaurant', 'the cafe', 'the spot', 'those spots',
    'how long', 'minutes', 'blocks', 'far is', 'close is'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return followUpKeywords.some(keyword => lowerPrompt.includes(keyword));
}
