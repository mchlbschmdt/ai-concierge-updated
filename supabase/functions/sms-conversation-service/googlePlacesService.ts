// Google Maps Platform helper — all calls go through the Lovable connector
// gateway so credentials never touch the client. Used by the SMS concierge
// to verify a place is CURRENTLY OPERATIONAL and to rank picks by real
// driving/walking distance from the property.
//
// Auth: Authorization: Bearer $LOVABLE_API_KEY + X-Connection-Api-Key: $GOOGLE_MAPS_API_KEY
// Gateway base: https://connector-gateway.lovable.dev/google_maps

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

function authHeaders(extra: Record<string, string> = {}) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const gmapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!lovableKey || !gmapsKey) {
    throw new Error('Google Maps connector credentials missing');
  }
  return {
    'Authorization': `Bearer ${lovableKey}`,
    'X-Connection-Api-Key': gmapsKey,
    ...extra,
  };
}

export interface Coords { lat: number; lng: number; }

export interface VerifiedPlace {
  id: string;
  name: string;
  address: string;
  location: Coords;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  openNow?: boolean;
  distanceMeters?: number;
  durationSeconds?: number;
  distanceLabel?: string; // e.g. "0.6 mi · 3 min drive"
}

// In-invocation geocode cache to avoid re-hitting the API for the same property.
const geocodeCache = new Map<string, Coords | null>();

export async function geocodeAddress(address: string): Promise<Coords | null> {
  if (!address) return null;
  const key = address.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  try {
    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[GMAPS geocode] ${res.status}: ${body.slice(0, 200)}`);
      geocodeCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (!loc) {
      geocodeCache.set(key, null);
      return null;
    }
    const coords = { lat: loc.lat, lng: loc.lng };
    geocodeCache.set(key, coords);
    return coords;
  } catch (err) {
    console.error('[GMAPS geocode] error:', (err as Error).message);
    geocodeCache.set(key, null);
    return null;
  }
}

// Map internal request category to a Places textQuery + optional includedType.
export function mapCategoryToPlacesQuery(
  category: string,
  originalMessage: string,
): { textQuery: string; includedType?: string } {
  const cat = (category || '').toLowerCase();
  const msg = (originalMessage || '').toLowerCase();

  const wantsQuick = /\b(quick|fast|grab|takeout|to[- ]?go|in a hurry|in a rush)\b/.test(msg);
  const quickPrefix = wantsQuick ? 'quick casual ' : '';

  if (cat === 'coffee' || cat === 'cafe' || cat === 'café') {
    return { textQuery: `${quickPrefix}coffee shop`, includedType: 'cafe' };
  }
  if (cat === 'bar' || cat === 'bars' || cat === 'nightlife' || cat === 'drinks') {
    return { textQuery: `${quickPrefix}bar`, includedType: 'bar' };
  }
  if (cat === 'breakfast' || cat === 'brunch') {
    return { textQuery: `${quickPrefix}breakfast restaurant`, includedType: 'restaurant' };
  }
  if (cat === 'lunch') {
    return { textQuery: `${quickPrefix}lunch restaurant`, includedType: 'restaurant' };
  }
  if (cat === 'dinner') {
    return { textQuery: `${quickPrefix}dinner restaurant`, includedType: 'restaurant' };
  }
  if (cat === 'attractions' || cat === 'activities' || cat === 'things to do') {
    return { textQuery: 'tourist attraction', includedType: 'tourist_attraction' };
  }
  // default: use the user's own words + restaurant bias
  return { textQuery: `${quickPrefix}${originalMessage}`.trim() || 'restaurant', includedType: 'restaurant' };
}

export async function searchNearby(opts: {
  origin: Coords;
  textQuery: string;
  includedType?: string;
  radiusMeters: number;
  maxResults?: number;
}): Promise<VerifiedPlace[]> {
  try {
    const body: any = {
      textQuery: opts.textQuery,
      maxResultCount: opts.maxResults ?? 10,
      locationBias: {
        circle: {
          center: { latitude: opts.origin.lat, longitude: opts.origin.lng },
          radius: Math.min(Math.max(opts.radiusMeters, 500), 50000),
        },
      },
    };
    if (opts.includedType) body.includedType = opts.includedType;

    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: 'POST',
      headers: authHeaders({
        'Content-Type': 'application/json',
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.currentOpeningHours.openNow',
      }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[GMAPS searchNearby] ${res.status}: ${errBody.slice(0, 300)}`);
      return [];
    }
    const data = await res.json();
    const places = Array.isArray(data?.places) ? data.places : [];
    return places
      .filter((p: any) => p?.businessStatus === 'OPERATIONAL' && p?.location)
      .map((p: any): VerifiedPlace => ({
        id: p.id,
        name: p.displayName?.text || 'Unknown',
        address: p.formattedAddress || '',
        location: { lat: p.location.latitude, lng: p.location.longitude },
        rating: p.rating,
        userRatingCount: p.userRatingCount,
        priceLevel: p.priceLevel,
        primaryType: p.primaryType,
        openNow: p.currentOpeningHours?.openNow,
      }));
  } catch (err) {
    console.error('[GMAPS searchNearby] error:', (err as Error).message);
    return [];
  }
}

export async function computeDistances(opts: {
  origin: Coords;
  destinations: VerifiedPlace[];
  mode: 'DRIVE' | 'WALK';
}): Promise<VerifiedPlace[]> {
  if (opts.destinations.length === 0) return [];
  try {
    const body = {
      origins: [{
        waypoint: { location: { latLng: { latitude: opts.origin.lat, longitude: opts.origin.lng } } },
      }],
      destinations: opts.destinations.map((d) => ({
        waypoint: { location: { latLng: { latitude: d.location.lat, longitude: d.location.lng } } },
      })),
      travelMode: opts.mode,
      routingPreference: opts.mode === 'DRIVE' ? 'TRAFFIC_AWARE' : undefined,
    };

    const res = await fetch(`${GATEWAY_URL}/routes/distanceMatrix/v2:computeRouteMatrix`, {
      method: 'POST',
      headers: authHeaders({
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,condition',
      }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[GMAPS distanceMatrix] ${res.status}: ${errBody.slice(0, 300)}`);
      return opts.destinations;
    }
    // The Routes distanceMatrix API returns a JSON array (streamed) — parse text.
    const text = await res.text();
    let rows: any[] = [];
    try {
      rows = JSON.parse(text);
    } catch {
      // Some responses come as newline-delimited JSON
      rows = text.split(/\n+/).filter(Boolean).map((l) => JSON.parse(l));
    }

    const enriched = opts.destinations.map((d, idx) => {
      const row = rows.find((r) => r?.destinationIndex === idx);
      if (!row || row.condition !== 'ROUTE_EXISTS') return d;
      const meters = row.distanceMeters ?? undefined;
      // duration comes back like "412s"
      const seconds = typeof row.duration === 'string'
        ? parseInt(row.duration.replace(/[^\d]/g, ''), 10)
        : undefined;
      return {
        ...d,
        distanceMeters: meters,
        durationSeconds: seconds,
        distanceLabel: formatDistance(meters, seconds, opts.mode),
      };
    });
    return enriched;
  } catch (err) {
    console.error('[GMAPS distanceMatrix] error:', (err as Error).message);
    return opts.destinations;
  }
}

function formatDistance(meters?: number, seconds?: number, mode: 'DRIVE' | 'WALK' = 'DRIVE'): string | undefined {
  if (meters == null && seconds == null) return undefined;
  const miles = meters != null ? (meters / 1609.34) : undefined;
  const mins = seconds != null ? Math.max(1, Math.round(seconds / 60)) : undefined;
  const parts: string[] = [];
  if (miles != null) parts.push(`${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`);
  if (mins != null) parts.push(`${mins} min ${mode === 'WALK' ? 'walk' : 'drive'}`);
  return parts.join(' · ');
}

// One-shot: geocode property, search, rank by real travel time, filter by intent.
export async function findVerifiedNearbyPlaces(opts: {
  propertyAddress: string;
  category: string;
  originalMessage: string;
  wantsQuick: boolean;
}): Promise<{ places: VerifiedPlace[]; origin: Coords | null }> {
  const origin = await geocodeAddress(opts.propertyAddress);
  if (!origin) return { places: [], origin: null };

  const { textQuery, includedType } = mapCategoryToPlacesQuery(opts.category, opts.originalMessage);
  const radius = opts.wantsQuick ? 2500 : 10000;
  const raw = await searchNearby({ origin, textQuery, includedType, radiusMeters: radius, maxResults: 10 });
  if (raw.length === 0) return { places: [], origin };

  const mode: 'DRIVE' | 'WALK' = opts.wantsQuick ? 'WALK' : 'DRIVE';
  const withDistance = await computeDistances({ origin, destinations: raw, mode });

  // Filter by intent thresholds
  const maxSeconds = opts.wantsQuick ? 15 * 60 : 20 * 60; // 15 min walk / 20 min drive
  const maxMeters = opts.wantsQuick ? 1800 : 16000;
  const filtered = withDistance
    .filter((p) => {
      if (p.durationSeconds != null && p.durationSeconds > maxSeconds) return false;
      if (p.distanceMeters != null && p.distanceMeters > maxMeters) return false;
      return true;
    })
    .sort((a, b) => (a.durationSeconds ?? 9e9) - (b.durationSeconds ?? 9e9))
    .slice(0, 5);

  return { places: filtered, origin };
}

export function formatPlacesForPrompt(places: VerifiedPlace[]): string {
  if (places.length === 0) return '';
  return places.map((p, i) => {
    const bits = [
      `${i + 1}. ${p.name}`,
      p.distanceLabel ? `(${p.distanceLabel})` : '',
      p.rating ? `${p.rating}★${p.userRatingCount ? ` · ${p.userRatingCount} reviews` : ''}` : '',
      p.address ? `— ${p.address}` : '',
    ].filter(Boolean);
    return bits.join(' ');
  }).join('\n');
}
