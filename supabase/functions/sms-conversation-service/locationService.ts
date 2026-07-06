// LocationService — kept minimal and property-agnostic.
// Previous implementation hard-coded Reunion Resort / Disney / Universal
// coordinates and distance lookups that leaked wrong data into unrelated
// properties (e.g. San Juan condos). All region-specific branching removed.
// Real distances should come from a geocoding provider using the property's
// actual address, not a hard-coded table.

export class LocationService {
  static async getPropertyCoordinates(_address: string): Promise<{ lat: number; lng: number } | null> {
    // No hard-coded coordinates — return null and let callers degrade gracefully.
    return null;
  }

  static async getAccurateDistance(
    _propertyAddress: string,
    _restaurantName: string,
    _restaurantAddress?: string
  ): Promise<{ distance: string; duration: string; walkable: boolean } | null> {
    // No hard-coded distance table. Callers should handle null by asking the
    // guest for the venue name or offering to check on their behalf.
    return null;
  }

  static getDistanceContext(_propertyAddress: string, _message: string): string | null {
    return null;
  }

  static determinePropertyType(_address: string): string {
    // Do NOT return region-specific types — that drives hard-coded resort
    // strings elsewhere. Always return the generic bucket.
    return 'general_property';
  }

  static getPropertySpecificContext(_address: string): {
    nearbyLandmarks: string[];
    shuttleInfo?: string;
    waterParkInfo?: string;
  } {
    return {
      nearbyLandmarks: [],
    };
  }
}
