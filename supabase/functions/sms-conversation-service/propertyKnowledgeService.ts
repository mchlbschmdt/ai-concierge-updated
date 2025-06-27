
import { Property } from './types.ts';

export class PropertyKnowledgeService {
  static searchKnowledgeBase(property: Property, query: string): string | null {
    if (!property.knowledge_base) {
      return null;
    }

    const lowerQuery = query.toLowerCase();
    const knowledgeBase = property.knowledge_base.toLowerCase();

    // Search for relevant information in knowledge base
    const queryWords = lowerQuery.split(' ').filter(word => word.length > 2);
    let relevantSections: string[] = [];

    // Split knowledge base into sections and search
    const sections = property.knowledge_base.split(/\n\s*\n/);
    
    for (const section of sections) {
      const lowerSection = section.toLowerCase();
      const matchCount = queryWords.filter(word => lowerSection.includes(word)).length;
      
      if (matchCount > 0) {
        relevantSections.push(section.trim());
      }
    }

    return relevantSections.length > 0 ? relevantSections[0] : null;
  }

  static generateClarifyingQuestion(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('washer') || lowerQuery.includes('laundry')) {
      return "Just to clarify, are you referring to the in-unit washer or the laundry room?";
    } else if (lowerQuery.includes('pool')) {
      return "Are you asking about the pool heater, pool access, or pool rules?";
    } else if (lowerQuery.includes('hot tub')) {
      return "Are you looking for instructions on how to use the hot tub or turn on the jets?";
    } else if (lowerQuery.includes('key') || lowerQuery.includes('lock')) {
      return "Are you asking about the front door lock, unit key, or parking access?";
    } else {
      return "Could you provide a bit more detail about what specifically you're looking for?";
    }
  }

  static shouldContactHost(query: string): boolean {
    const hostContactKeywords = [
      'broken', 'not working', 'problem', 'issue', 'help', 'emergency',
      'urgent', 'repair', 'maintenance', 'contact host', 'call host'
    ];
    
    const lowerQuery = query.toLowerCase();
    return hostContactKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  static generateHostContactOffer(): string {
    return "Would you like me to contact your host about this?";
  }
}
