
export class KidFriendlyFilterService {
  static enhancePromptForKids(basePrompt: string, kidAges: string[]): string {
    let enhancement = '\n\n🧒 FAMILY-FRIENDLY REQUIREMENTS:\n';
    
    if (kidAges.includes('infant') || kidAges.includes('toddler')) {
      enhancement += '• High chairs & changing tables available\n';
      enhancement += '• Quick service or casual dining preferred\n';
      enhancement += '• Quiet, family-friendly atmosphere\n';
      enhancement += '• Simple menu options for young children\n';
    }
    
    if (kidAges.includes('young_child')) {
      enhancement += '• Kids menu with familiar options\n';
      enhancement += '• Activities or entertainment for kids\n';
      enhancement += '• Reasonable wait times\n';
      enhancement += '• Tolerant of noise/activity\n';
    }
    
    if (kidAges.includes('tween') || kidAges.includes('teen')) {
      enhancement += '• Variety of options appealing to older kids\n';
      enhancement += '• Interactive or unique dining experience\n';
      enhancement += '• Not too "babyish" but still family-appropriate\n';
    }
    
    enhancement += '\nMUST prioritize family-friendly venues only!';
    
    return basePrompt + enhancement;
  }
  
  static getKidFriendlyAttractionAdvice(kidAges: string[], locationContext: any): string {
    let response = '👨‍👩‍👧‍👦 Family-Friendly Tips:\n\n';
    
    if (kidAges.includes('infant') || kidAges.includes('toddler')) {
      response += '🍼 With little ones:\n';
      response += '• Disney has baby care centers at all parks\n';
      response += '• Bring stroller (or rent one)\n';
      response += '• Plan for nap times\n';
      response += '• Many "no height requirement" rides\n\n';
    }
    
    if (kidAges.includes('young_child')) {
      response += '🎠 Ages 3-9:\n';
      response += '• Magic Kingdom = best for this age\n';
      response += '• Character meet & greets\n';
      response += '• Check height requirements before visit\n';
      response += '• Download Disney app for wait times\n\n';
    }
    
    if (kidAges.includes('tween') || kidAges.includes('teen')) {
      response += '🎢 Older kids/teens:\n';
      response += '• Hollywood Studios & Universal = thrill rides\n';
      response += '• Slinky Dog, Rock n Roller Coaster, Guardians\n';
      response += '• Universal\'s Velocicoaster & Hagrid\'s\n';
      response += '• Consider park hopper for variety\n\n';
    }
    
    response += '💡 Pro tip: Arrive early, take midday break, return for evening!';
    
    return response;
  }
}
