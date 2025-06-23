
export class FuzzyMatchingService {
  private static commonTypos: { [key: string]: string[] } = {
    'hot': ['not', 'got', 'hto', 'hoot'],
    'now': ['and', 'noe', 'bow', 'new'],
    'quick': ['quik', 'qiuck', 'quikc', 'quck'],
    'eat': ['eet', 'eeat', 'et'],
    'restaurant': ['restaraunt', 'restraunt', 'resturant'],
    'delivery': ['delivry', 'delevery', 'delievery'],
    'wifi': ['wi-fi', 'wify', 'wiif'],
    'parking': ['parkign', 'parkin'],
    'coffee': ['cofee', 'coffe', 'cofffe'],
    'drink': ['drik', 'drnik', 'drinks'],
    'bar': ['ber', 'barr'],
    'beach': ['beech', 'bach'],
    'directions': ['directons', 'derections'],
  };

  private static intentPatterns: { [key: string]: string[] } = {
    'food_urgent': ['food now', 'hungry now', 'eat now', 'food quick', 'something quick'],
    'delivery_request': ['delivery', 'deliver', 'bring to me', 'order in', 'get delivered'],
    'walkable_request': ['walk', 'walking distance', 'close by', 'nearby'],
    'drive_ok': ['drive', 'uber', 'car', 'ride'],
    'coffee_request': ['coffee', 'cafe', 'caffeine', 'espresso'],
    'drink_request': ['drink', 'bar', 'cocktail', 'beer', 'wine'],
    'seafood_avoid': ['no seafood', 'not seafood', 'avoid seafood', 'allergic fish'],
    'vegetarian': ['vegetarian', 'veggie', 'no meat', 'plant based'],
  };

  static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  static correctTypos(message: string): { correctedMessage: string; corrections: string[] } {
    let correctedMessage = message.toLowerCase();
    const corrections: string[] = [];
    const words = correctedMessage.split(/\s+/);
    
    const correctedWords = words.map(word => {
      // Remove punctuation for matching
      const cleanWord = word.replace(/[.,!?;]/g, '');
      
      for (const [correct, typos] of Object.entries(this.commonTypos)) {
        if (typos.includes(cleanWord)) {
          corrections.push(`"${word}" → "${correct}"`);
          return word.replace(cleanWord, correct);
        }
        
        // More strict fuzzy matching - only for very close typos and longer words
        if (cleanWord.length > 4 && this.levenshteinDistance(cleanWord, correct) === 1) {
          const similarity = 1 - (this.levenshteinDistance(cleanWord, correct) / Math.max(cleanWord.length, correct.length));
          if (similarity > 0.85) {
            corrections.push(`"${word}" → "${correct}"`);
            return word.replace(cleanWord, correct);
          }
        }
      }
      return word;
    });

    return {
      correctedMessage: correctedWords.join(' '),
      corrections
    };
  }

  static detectIntent(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const detectedIntents: string[] = [];

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern)) {
          detectedIntents.push(intent);
          break;
        }
      }
    }

    return detectedIntents;
  }

  static generateCorrectionMessage(corrections: string[]): string {
    if (corrections.length === 0) return '';
    
    if (corrections.length === 1) {
      return `I think you meant ${corrections[0].split(' → ')[1]}—`;
    } else {
      const correctionList = corrections.map(c => c.split(' → ')[1]).join(', ');
      return `I think you meant ${correctionList}—`;
    }
  }
}
