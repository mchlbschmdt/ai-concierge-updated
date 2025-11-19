
export interface LocationContext {
  neighborhood: string | null;
  resort: string | null;
  nearbyAttractions: string[];
  propertyType: 'resort' | 'vacation_home' | 'community' | 'standalone';
  distanceToDisney: string | null;
  distanceToUniversal: string | null;
}

export class PropertyLocationAnalyzer {
  /**
   * Analyze property address to determine location context
   */
  static analyzePropertyLocation(address: string): LocationContext {
    const lowerAddress = address.toLowerCase();
    
    // Detect resort communities
    const resorts: Record<string, string[]> = {
      'reunion resort': ['reunion', 'reunion resort'],
      'windsor at westside': ['windsor', 'westside'],
      'storey lake': ['storey lake', 'storeylake'],
      'solterra resort': ['solterra'],
      'champions gate': ['champions gate', 'championsgate'],
      'margaritaville': ['margaritaville'],
      'encore resort': ['encore'],
      'vista cay': ['vista cay']
    };
    
    let resort: string | null = null;
    for (const [name, keywords] of Object.entries(resorts)) {
      if (keywords.some(keyword => lowerAddress.includes(keyword))) {
        resort = name;
        break;
      }
    }
    
    // Detect city/neighborhood
    let neighborhood: string | null = null;
    if (lowerAddress.includes('kissimmee')) neighborhood = 'Kissimmee';
    else if (lowerAddress.includes('orlando')) neighborhood = 'Orlando';
    else if (lowerAddress.includes('davenport')) neighborhood = 'Davenport';
    else if (lowerAddress.includes('clermont')) neighborhood = 'Clermont';
    else if (lowerAddress.includes('celebration')) neighborhood = 'Celebration';
    
    // Detect nearby attractions
    const nearbyAttractions: string[] = [];
    if (neighborhood === 'Kissimmee' || resort) {
      nearbyAttractions.push('Walt Disney World', 'Disney Springs');
    }
    if (neighborhood === 'Orlando') {
      nearbyAttractions.push('Universal Studios', 'International Drive');
    }
    if (neighborhood === 'Celebration') {
      nearbyAttractions.push('Walt Disney World', 'Celebration Town Center');
    }
    
    // Estimate distances
    const distanceToDisney = this.estimateDistanceToDisney(address, resort, neighborhood);
    const distanceToUniversal = this.estimateDistanceToUniversal(address, resort, neighborhood);
    
    return {
      neighborhood,
      resort,
      nearbyAttractions,
      propertyType: resort ? 'resort' : 'vacation_home',
      distanceToDisney,
      distanceToUniversal
    };
  }
  
  private static estimateDistanceToDisney(address: string, resort: string | null, neighborhood: string | null): string | null {
    if (resort === 'reunion resort') return '7 miles (12 min drive)';
    if (resort === 'windsor at westside') return '4 miles (8 min drive)';
    if (resort === 'storey lake') return '5 miles (10 min drive)';
    if (resort === 'solterra resort') return '6 miles (11 min drive)';
    if (resort === 'champions gate') return '8 miles (15 min drive)';
    if (resort === 'margaritaville') return '3 miles (7 min drive)';
    if (resort === 'encore resort') return '5 miles (10 min drive)';
    if (resort === 'vista cay') return '12 miles (20 min drive)';
    if (neighborhood === 'Kissimmee') return '5-10 miles (10-15 min drive)';
    if (neighborhood === 'Celebration') return '2-5 miles (5-10 min drive)';
    if (neighborhood === 'Orlando') return '15-20 miles (20-30 min drive)';
    if (neighborhood === 'Davenport') return '10-15 miles (15-20 min drive)';
    return null;
  }
  
  private static estimateDistanceToUniversal(address: string, resort: string | null, neighborhood: string | null): string | null {
    if (resort === 'vista cay') return '2 miles (5 min drive)';
    if (neighborhood === 'Orlando') return '5-10 miles (10-15 min drive)';
    if (neighborhood === 'Kissimmee') return '20-25 miles (25-35 min drive)';
    if (neighborhood === 'Celebration') return '18-22 miles (25-30 min drive)';
    if (resort) return '20-25 miles (25-30 min drive)'; // Most Kissimmee resorts
    return null;
  }
  
  /**
   * Get resort-specific amenities
   */
  static getResortAmenities(resort: string): string[] {
    const amenityMap: Record<string, string[]> = {
      'reunion resort': [
        '11 pools including water park',
        '6 restaurants on-site',
        'Seven Eagles Golf Course',
        'Tennis courts',
        'Fitness center',
        'Lazy river'
      ],
      'windsor at westside': [
        'Resort-style pool with cabanas',
        'Water park with slides',
        'Tiki bar',
        'Sports courts (tennis, basketball)',
        'Club house with arcade'
      ],
      'storey lake': [
        'Resort pool with beach entry',
        'Lazy river',
        'Splash pad for kids',
        'Tiki bar',
        'Fitness center',
        'Volleyball court'
      ],
      'solterra resort': [
        'Heated resort pool',
        'Lazy river',
        'Kids splash zone',
        'Fitness center',
        'Sundeck'
      ],
      'champions gate': [
        'Multiple resort pools',
        'Golf courses',
        'Spa services',
        'Restaurants',
        'Water park'
      ],
      'margaritaville': [
        'Multiple themed pools',
        'Water park',
        'Restaurants and bars',
        'Spa',
        'Lazy river'
      ],
      'encore resort': [
        'Aqua park',
        'Multiple pools',
        'Restaurants',
        'Sports courts',
        'Fitness center'
      ],
      'vista cay': [
        'Resort pool',
        'Hot tub',
        'Fitness center',
        'Tennis courts',
        'Clubhouse'
      ]
    };
    
    return amenityMap[resort.toLowerCase()] || [];
  }
}
