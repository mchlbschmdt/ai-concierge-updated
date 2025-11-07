// Property 1434 (Plentiful Views Disney) - Hardcoded Data
export const PROPERTY_1434_DATA = {
  property_id: '1434',
  property_name: 'Plentiful Views Disney',
  address: '1434 Titian Court, Kissimmee, FL',
  
  // Pool & Hot Tub Info
  pool: {
    has_pool: true,
    has_hot_tub: true,
    description: '🏊‍♀️ Yes! Private pool and hot tub onsite.',
    hot_tub_instructions: 'Hot tub activated via timer dial by the patio (heats to ~100°F in 10-15 mins).',
    community_pools: 'For best pool experience, check out Seven Eagles pool—bar, spa, gorgeous views!'
  },
  
  // Game Room
  game_room: {
    has_game_room: false,
    response: '🎮 No arcade or game room at this property, but plenty of entertainment nearby! Want attraction recommendations?'
  },
  
  // Checkout Info
  checkout: {
    time: '10 AM',
    instructions: '⏰ Checkout: 10 AM\n\n📝 Before leaving:\n• Place trash in bins\n• Leave resort card on counter\n• Lock all doors/windows\n\nLet your host know once you\'ve checked out! Safe travels! 🚗'
  },
  
  // Garbage Collection
  garbage: {
    schedule: 'Mon/Thu/Sat pickup, Recycling Wed',
    instructions: '🗑️ Garbage: Mon/Thu/Sat\n♻️ Recycling: Wed\n\n⏰ Please place bins out by 6:30 AM and bring back after collection.'
  },
  
  // Grocery Stores
  grocery: {
    stores: ['Publix', 'Aldi'],
    response: '🛒 Grocery: Publix & Aldi just outside Reunion Resort gates—super convenient!'
  },
  
  // Transportation
  transportation: {
    shuttle: 'Resort shuttle to Disney (book 24hrs ahead)',
    rideshare: 'Uber/Lyft readily available',
    response: '🚌 Transportation:\n• Resort shuttle to Disney (book 24hrs ahead)\n• Uber/Lyft readily available'
  },
  
  // Emergency Contact
  emergency_contact: {
    name: 'Mike & Lauren',
    phone: '(321) 340-6333',
    response: 'Please contact your host: Mike & Lauren at (321) 340-6333.'
  }
};

export class Property1434Handler {
  // Check if this is property 1434
  static isProperty1434(propertyId: string | undefined): boolean {
    return propertyId === '1434' || propertyId === 'property_1434';
  }
  
  // Get pool/hot tub info
  static getPoolInfo(): string {
    const { pool } = PROPERTY_1434_DATA;
    return `${pool.description}\n\n${pool.hot_tub_instructions}\n\n${pool.community_pools}`;
  }
  
  // Get hot tub instructions specifically
  static getHotTubInfo(): string {
    return `🛁 ${PROPERTY_1434_DATA.pool.hot_tub_instructions}\n\n${PROPERTY_1434_DATA.pool.community_pools}`;
  }
  
  // Get game room info
  static getGameRoomInfo(): string {
    return PROPERTY_1434_DATA.game_room.response;
  }
  
  // Get checkout info
  static getCheckoutInfo(): string {
    return PROPERTY_1434_DATA.checkout.instructions;
  }
  
  // Get garbage info
  static getGarbageInfo(): string {
    return PROPERTY_1434_DATA.garbage.instructions;
  }
  
  // Get grocery info
  static getGroceryInfo(): string {
    return PROPERTY_1434_DATA.grocery.response;
  }
  
  // Get transportation info
  static getTransportationInfo(): string {
    return PROPERTY_1434_DATA.transportation.response;
  }
  
  // Get emergency contact
  static getEmergencyContact(): string {
    return `🚨 ${PROPERTY_1434_DATA.emergency_contact.response}`;
  }
  
  // Get address for recommendations
  static getAddress(): string {
    return PROPERTY_1434_DATA.address;
  }
}
