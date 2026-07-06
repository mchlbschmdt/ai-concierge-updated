// DEPRECATED — this module previously hard-coded Reunion Resort data for a
// single property and leaked it into every other property that hit the shared
// code paths (parking, garbage, grocery, waterpark, transportation, etc.).
// It is intentionally neutralized. All handler methods return empty strings
// and isProperty1434() always returns false so callers fall through to the
// real property record (address, knowledge_base, curated_links, amenities).
// Do NOT re-introduce property-specific data here — put it on the property
// row or in curated_links.

export const PROPERTY_1434_DATA = {
  property_id: '',
  property_name: '',
  address: '',
};

export class Property1434Handler {
  static isProperty1434(_propertyId: string | undefined): boolean {
    return false;
  }
  static getPoolInfo(): string { return ''; }
  static getHotTubInfo(): string { return ''; }
  static getGameRoomInfo(): string { return ''; }
  static getCheckoutInfo(): string { return ''; }
  static getGarbageInfo(): string { return ''; }
  static getGroceryInfo(): string { return ''; }
  static getTransportationInfo(): string { return ''; }
  static getEmergencyContact(): string { return ''; }
  static getAddress(): string { return ''; }
}
