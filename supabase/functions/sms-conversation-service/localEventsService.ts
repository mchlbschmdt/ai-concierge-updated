
import { Property } from './types.ts';
import { PropertyLocationAnalyzer } from './propertyLocationAnalyzer.ts';

export class LocalEventsService {
  static getLocalEvents(property: Property, message: string): string {
    const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
    const lowerMsg = message.toLowerCase();
    
    // Determine time frame
    const timeFrame = this.extractTimeFrame(lowerMsg);
    
    let response = `🎭 Local Events & Activities:\n\n`;
    
    // Check knowledge base first
    if (property.knowledge_base) {
      const eventInfo = this.extractEventsFromKB(property.knowledge_base);
      if (eventInfo) {
        response += `📌 From property guide:\n${eventInfo}\n\n`;
      }
    }
    
    // Location-based seasonal events
    response += this.getSeasonalEvents(locationContext, timeFrame);
    
    // Theme park special events
    if (locationContext.distanceToDisney || locationContext.distanceToUniversal) {
      response += '\n\n' + this.getThemeParkEvents(locationContext, timeFrame);
    }
    
    // General area activities
    response += '\n\n' + this.getAreaActivities(locationContext);
    
    return response.trim();
  }
  
  private static extractTimeFrame(message: string): string {
    if (message.includes('tonight') || message.includes('today')) return 'today';
    if (message.includes('tomorrow')) return 'tomorrow';
    if (message.includes('weekend') || message.includes('week')) return 'week';
    if (message.includes('month')) return 'month';
    return 'general';
  }
  
  private static extractEventsFromKB(kb: string): string | null {
    const eventMatch = kb.match(/(?:event|festival|activity|seasonal|happening)[^.\n]{0,300}[.\n]/gi);
    if (eventMatch && eventMatch.length > 0) {
      return eventMatch.slice(0, 2).join(' ');
    }
    return null;
  }
  
  private static getSeasonalEvents(locationContext: any, timeFrame: string): string {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    let events = '🎪 Seasonal Events:\n';
    
    // Florida-specific seasonal events
    if (locationContext.region === 'florida') {
      if (currentMonth >= 9 && currentMonth <= 10) {
        events += '🎃 Halloween Events (Sep-Oct):\n';
        events += '• Mickey\'s Not-So-Scary Halloween Party\n';
        events += '• Halloween Horror Nights (Universal)\n';
        events += '• SeaWorld Howl-O-Scream\n';
      } else if (currentMonth >= 11 && currentMonth <= 12) {
        events += '🎄 Holiday Events (Nov-Dec):\n';
        events += '• Mickey\'s Very Merry Christmas Party\n';
        events += '• EPCOT Festival of the Holidays\n';
        events += '• Universal\'s Grinchmas\n';
        events += '• Candlelight Processional\n';
      } else if (currentMonth >= 1 && currentMonth <= 3) {
        events += '🎨 Spring Events (Jan-Mar):\n';
        events += '• EPCOT International Festival of the Arts\n';
        events += '• Mardi Gras at Universal\n';
        events += '• SeaWorld Seven Seas Food Festival\n';
      } else if (currentMonth >= 3 && currentMonth <= 5) {
        events += '🌸 EPCOT International Flower & Garden Festival\n';
        events += '• Outdoor kitchens & topiaries\n';
        events += '• Garden Rocks concerts\n';
      } else if (currentMonth >= 7 && currentMonth <= 9) {
        events += '🍷 EPCOT International Food & Wine Festival\n';
        events += '• Global marketplace booths\n';
        events += '• Eat to the Beat concerts\n';
      } else {
        events += '• Check Disney & Universal websites for current events\n';
        events += '• Special events change seasonally\n';
      }
    }
    
    return events;
  }
  
  private static getThemeParkEvents(locationContext: any, timeFrame: string): string {
    let response = '🎢 Theme Park Special Events:\n';
    
    if (locationContext.distanceToDisney) {
      response += '• Disney After Hours (select nights)\n';
      response += '• Extended evening hours (deluxe resort guests)\n';
      response += '• Check My Disney Experience app for updates\n';
    }
    
    if (locationContext.distanceToUniversal) {
      response += '• Universal CityWalk (free admission)\n';
      response += '• Live music & entertainment nightly\n';
    }
    
    response += '\n💡 Tip: Book tickets in advance for special events!';
    
    return response;
  }
  
  private static getAreaActivities(locationContext: any): string {
    let response = '🌟 Area Activities:\n';
    
    if (locationContext.neighborhood === 'Orlando' || locationContext.neighborhood === 'Kissimmee') {
      response += '• Disney Springs (shopping, dining, entertainment)\n';
      response += '• Old Town Kissimmee (classic car shows, rides)\n';
      response += '• Icon Park (observation wheel, museums)\n';
      response += '• Gatorland (wildlife shows)\n';
    }
    
    if (locationContext.neighborhood === 'Orlando') {
      response += '• International Drive (I-Drive attractions)\n';
      response += '• Madame Tussauds & SEA LIFE Aquarium\n';
    }
    
    response += '\n💡 Want specific recommendations? Ask me about activities or attractions!';
    
    return response;
  }
}
