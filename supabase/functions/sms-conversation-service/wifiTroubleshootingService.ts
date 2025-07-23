
export class WiFiTroubleshootingService {
  static detectWiFiIssue(message: string, lastMessageType: string): boolean {
    if (lastMessageType !== 'ask_wifi') return false;
    
    const issueKeywords = [
      'not working', 'doesn\'t work', 'can\'t connect', 'won\'t connect',
      'not connecting', 'connection failed', 'wifi down', 'internet down',
      'no internet', 'broken', 'issues', 'problems', 'trouble', 'help'
    ];
    
    const lowerMessage = message.toLowerCase();
    return issueKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static generateTroubleshootingSteps(): string {
    return `Sorry about the trouble! Let's try a few quick things to help get you connected 🛠️

• Forget and reconnect to the network
• Double-check password spelling (case-sensitive)
• Move closer to the router—some areas have weaker signal

Did that help?`;
  }

  // Enhanced troubleshooting for immediate issue detection
  static generateEnhancedTroubleshootingSteps(): string {
    return `Sorry it's still acting up! Try these tips:

• Forget and reconnect to the network
• Double-check password spelling (case-sensitive)  
• Move closer to the router—some areas have weaker signal

Did that help?`;
  }

  static generateHostContactOffer(): string {
    return `Would you like me to contact your host to help with this?`;
  }

  static generateHostContactedConfirmation(): string {
    return `Your host has been notified and will follow up shortly. Let me know if anything else comes up!`;
  }

  static detectTroubleshootingResponse(message: string): 'yes' | 'no' | 'unclear' {
    const lowerMessage = message.toLowerCase().trim();
    
    if (['yes', 'y', 'yeah', 'yep', 'sure', 'okay', 'ok', 'please'].includes(lowerMessage)) {
      return 'yes';
    }
    if (['no', 'n', 'nope', 'still not working', 'still broken', 'didn\'t help', 'not working'].includes(lowerMessage)) {
      return 'no';
    }
    
    return 'unclear';
  }
}
