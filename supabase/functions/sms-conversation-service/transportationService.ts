
import { Property } from './types.ts';
import { PropertyLocationAnalyzer } from './propertyLocationAnalyzer.ts';

export class TransportationService {
  static getTransportationOptions(property: Property, destination: string, message: string): string {
    const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
    const destLower = destination.toLowerCase();
    
    let response = '🚗 Transportation Options:\n\n';
    
    // Determine destination type
    const isThemePark = this.isThemeParkDestination(destLower);
    const isAirport = destLower.includes('airport') || destLower.includes('mco');
    
    if (isThemePark) {
      response += this.getThemeParkTransportation(locationContext, destLower);
    } else if (isAirport) {
      response += this.getAirportTransportation(locationContext);
    } else {
      response += this.getGeneralTransportation(locationContext, destination);
    }
    
    return response.trim();
  }
  
  private static isThemeParkDestination(dest: string): boolean {
    return dest.includes('disney') || dest.includes('universal') || 
           dest.includes('seaworld') || dest.includes('magic kingdom') ||
           dest.includes('epcot') || dest.includes('theme park');
  }
  
  private static getThemeParkTransportation(locationContext: any, dest: string): string {
    let response = '';
    
    // Rideshare estimates
    if (dest.includes('disney') && locationContext.distanceToDisney) {
      response += `🚕 Uber/Lyft to Disney:\n`;
      response += `• Distance: ${locationContext.distanceToDisney}\n`;
      response += `• Est. cost: $15-25 one way\n`;
      response += `• Peak pricing: +30-50% during rush hours\n\n`;
    }
    
    if (dest.includes('universal') && locationContext.distanceToUniversal) {
      response += `🚕 Uber/Lyft to Universal:\n`;
      response += `• Distance: ${locationContext.distanceToUniversal}\n`;
      response += `• Est. cost: $20-35 one way\n`;
      response += `• Peak pricing: +30-50% during rush hours\n\n`;
    }
    
    // Parking info
    response += `🅿️ Driving yourself:\n`;
    response += `• Disney parking: $30/day (free after 6pm)\n`;
    response += `• Universal parking: $30/day\n`;
    response += `• Tip: Consider rideshare if visiting 1 park\n\n`;
    
    // Shuttle options (resort-specific)
    if (locationContext.resort) {
      response += `🚌 Resort shuttle:\n`;
      response += `• Check with ${locationContext.resort} front desk\n`;
      response += `• Some resorts offer theme park shuttles\n\n`;
    }
    
    response += `💡 Pro tip: Uber/Lyft usually cheaper than parking for 1-day visits`;
    
    return response;
  }
  
  private static getAirportTransportation(locationContext: any): string {
    let response = `✈️ To/from Orlando Airport (MCO):\n\n`;
    
    response += `🚕 Rideshare:\n`;
    response += `• Uber/Lyft: $40-60 (30-45 min)\n`;
    response += `• Book in advance for better rates\n\n`;
    
    response += `🚐 Shared shuttle:\n`;
    response += `• Mears Connect: $32 per person\n`;
    response += `• Stops at multiple locations\n\n`;
    
    response += `🚗 Rental car:\n`;
    response += `• Available at MCO\n`;
    response += `• Best if visiting multiple places\n`;
    response += `• Check property for parking availability`;
    
    return response;
  }
  
  static getGeneralTransportation(locationContext: any, destination: string): string {
    let response = `🚗 Getting around:\n\n`;
    
    response += `🚕 Rideshare (Uber/Lyft):\n`;
    response += `• Most flexible option\n`;
    response += `• Widely available in Orlando area\n`;
    response += `• Use app for exact pricing\n\n`;
    
    response += `🚗 Driving:\n`;
    response += `• GPS recommended (Orlando roads can be confusing)\n`;
    response += `• I-4 is main highway (often congested)\n`;
    response += `• Most destinations have free parking\n\n`;
    
    if (locationContext.neighborhood === 'Orlando') {
      response += `🚌 Public transit:\n`;
      response += `• Lynx bus system available\n`;
      response += `• Limited routes & schedules\n`;
      response += `• Better for specific destinations\n\n`;
    }
    
    response += `💡 Tip: Ask me for specific directions to "${destination}"!`;
    
    return response;
  }
}
