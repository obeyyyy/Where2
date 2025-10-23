import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';
import kv from '@/lib/redis';
import { getCoordinatesForLocation } from '@/lib/mapbox';

// This file is a cleaned, typed, and production-oriented rewrite of the
// hotel/stays search API route you provided. It focuses on safety, input
// validation, stable cache keys, robust error handling, and clear logging.

/* ---------- Configuration ---------- */
const MAX_RATE_FETCHES = 10; // how many hotels we'll fetch detailed rates for
const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes
const DEFAULT_SEARCH_LIMIT = 10; // Duffel search pagination limit
const MAX_RADIUS_KM = 100; // maximum allowed radius for geo searches
const DEFAULT_RADIUS_KM = 20;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50; // Max requests per minute per IP
const MAX_CACHE_SIZE = 500; // Maximum number of cached entries

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/* ---------- Types ---------- */
type Coordinates = { lat: number; lon: number };

type InputBody = {
  location?: string;
  coordinates?: Coordinates | { latitude?: number; longitude?: number };
  checkInDate?: string;
  checkOutDate?: string;
  rooms?: number | string;
  guests?: number | string | Array<{ type: 'adult' | 'child' }>;
};

/* ---------- Helpers ---------- */
function safeParseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function isoDateIsValid(d?: string) {
  if (!d || typeof d !== 'string') return false;
  const t = Date.parse(d);
  return !Number.isNaN(t);
}

function normalizeCoordinates(input: any): Coordinates | null {
  if (!input) return null;
  if (typeof input.lat === 'number' && typeof input.lon === 'number') {
    return { lat: input.lat, lon: input.lon };
  }
  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    return { lat: input.latitude, lon: input.longitude };
  }
  return null;
}

function generateSearchCacheKey(params: {
  location?: string | null;
  coordinates?: Coordinates | null;
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
  guests: number;
}) {
  // keep key stable and deterministic
  const { location, coordinates, checkInDate, checkOutDate, rooms, guests } = params;
  const locationPart = coordinates
    ? `coords:${coordinates.lat.toFixed(4)},${coordinates.lon.toFixed(4)}`
    : `loc:${(location || '').toLowerCase().trim().replace(/\s+/g, '_')}`;
  return `hotel_search:${locationPart}:in:${checkInDate}:out:${checkOutDate}:r:${rooms}:g:${guests}`;
}

async function checkRateLimit(): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  // kv.isRateLimited and kv.getRateLimit/key naming are implementation-specific
  const RATE_LIMIT_KEY = 'duffel:rate_limit';
  try {
    const limited = await kv.isRateLimited(RATE_LIMIT_KEY);
    if (limited) {
      const resetTs = await kv.get<number>(`rate_limit:${RATE_LIMIT_KEY}`);
      const now = Math.floor(Date.now() / 1000);
      const retryAfter = resetTs && resetTs > now ? resetTs - now : 60;
      return { limited: true, retryAfterSeconds: retryAfter };
    }
    return { limited: false };
  } catch (e) {
    // If cache/rate-limit store is failing, prefer to allow the request
    console.error('Rate limit check failed, allowing request by default', e);
    return { limited: false };
  }
}

/**
 * Check rate limit for client IP
 */
function checkClientRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `client_rate_limit:${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // Reset or create new window
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((current.resetTime - now) / 1000) 
    };
  }

  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  return { allowed: true };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitEntries() {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

async function updateRateLimitsFromHeaders(headers: Headers) {
  // Duffel may provide ratelimit-reset header (seconds since epoch or seconds until reset).
  try {
    const resetHeader = headers.get('ratelimit-reset') || headers.get('x-ratelimit-reset');
    if (!resetHeader) return;

    const asNumber = parseInt(resetHeader, 10);
    if (Number.isNaN(asNumber)) return;

    // If value looks like epoch ms, convert to seconds
    const resetSeconds = asNumber > 1e10 ? Math.floor(asNumber / 1000) : asNumber;
    await kv.setRateLimit('duffel:rate_limit', resetSeconds);
  } catch (e) {
    console.warn('Failed to update rate limit info from headers', e);
  }
}

/* ---------- POST handler (next/app route) ---------- */
export async function POST(request: Request) {
  try {
    // parse body safely
    const body = (await request.json?.()) as InputBody;

    // Basic validation and normalization
    const rawCoordinates = normalizeCoordinates(body.coordinates);
    let location = typeof body.location === 'string' && body.location.trim().length ? body.location.trim() : null;
    const checkInDate = body.checkInDate;
    const checkOutDate = body.checkOutDate;
    const rooms = Math.max(1, safeParseNumber(body.rooms, 1));

    // Guests can be provided as array of guest objects or a number
    let guestsCount: number;
    if (Array.isArray(body.guests)) {
      guestsCount = body.guests.length;
    } else {
      guestsCount = Math.max(1, safeParseNumber(body.guests, 2));
    }

    // Required validation
    if (!location && !rawCoordinates) {
      return NextResponse.json({ error: 'validation', message: 'Either location or coordinates must be provided' }, { status: 400 });
    }

    if (!isoDateIsValid(checkInDate) || !isoDateIsValid(checkOutDate)) {
      return NextResponse.json({ error: 'validation', message: 'checkInDate and checkOutDate must be valid ISO date strings' }, { status: 400 });
    }

    // If we have a location string but not coordinates, attempt geocoding
    let coordinates: Coordinates | null = rawCoordinates;
    if (location && !coordinates) {
      try {
        coordinates = await getCoordinatesForLocation(location);
        if (!coordinates) throw new Error('No coordinates returned from geocoding');
      } catch (e) {
        console.error('Geocoding failed for', location, e);
        return NextResponse.json({ error: 'geocoding_failed', message: 'Could not find the specified location' }, { status: 400 });
      }
    }

    // Client rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const clientRateLimitCheck = checkClientRateLimit(clientIP);
    
    if (!clientRateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: `Too many requests. Please try again in ${clientRateLimitCheck.retryAfter} seconds.`,
          retryAfter: clientRateLimitCheck.retryAfter
        },
        { 
          status: 429, 
          headers: { 'Retry-After': String(clientRateLimitCheck.retryAfter || 60) } 
        }
      );
    }

    // Clean up expired rate limit entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupRateLimitEntries();
    }

    // Duffel API rate limit check
    const rateCheck = await checkRateLimit();
    if (rateCheck.limited) {
      const retry = rateCheck.retryAfterSeconds ?? 60;
      return NextResponse.json(
        { error: 'rate_limited', message: 'Rate limit exceeded. Retry later.', retryAfter: retry },
        { status: 429, headers: { 'Retry-After': String(retry) } }
      );
    }

    // Build cache key and attempt cache hit
    const cacheKey = generateSearchCacheKey({
      location,
      coordinates,
      checkInDate: checkInDate!,
      checkOutDate: checkOutDate!,
      rooms,
      guests: guestsCount
    });

    try {
      const cached = await kv.get<any[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return NextResponse.json({ success: true, cached: true, results: cached });
      }
    } catch (e) {
      console.warn('Cache read failed, continuing without cache', e);
    }

    // Prepare Duffel search params (conservative and typed)
    const searchParams: Record<string, any> = {
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      rooms: rooms,
      guests: Array(Math.max(1, guestsCount)).fill({ type: 'adult' }),
      sort: 'price',
      limit: DEFAULT_SEARCH_LIMIT,
      price_min: 0
      // price_max intentionally omitted - allowing Duffel defaults or later filtering
    } as any;

    // Use location or coordinates
    if (coordinates) {
      searchParams.location = {
        geographic_coordinates: {
          latitude: coordinates.lat,
          longitude: coordinates.lon
        },
        radius: DEFAULT_RADIUS_KM,
        radius_unit: 'km'
      };
    } else if (location) {
      searchParams.location = { query: location };
    }

    // Call Duffel API
    let searchResponse: any;
    try {
      searchResponse = await duffel.stays.search(searchParams as any);
      // Update rate limits if present
      if (searchResponse?.headers instanceof Headers) {
        await updateRateLimitsFromHeaders(searchResponse.headers as Headers);
      }
    } catch (e: any) {
      console.error('Duffel search error', e);

      // If duffel provides meta/status info for 429, persist rate-limit and return 429
      if (e?.meta?.status === 429) {
        const resetTs = Math.floor(Date.now() / 1000) + 60;
        await kv.setRateLimit('duffel:rate_limit', resetTs).catch(() => {});
        return NextResponse.json({ error: 'rate_limited', message: 'Duffel rate limit reached. Try again later.' }, { status: 429, headers: { 'Retry-After': '60' } });
      }

      // For non-rate-limit errors, return 502 to indicate upstream service error
      return NextResponse.json({ error: 'upstream_error', message: 'Duffel service error' }, { status: 502 });
    }

    // Normalize response into an array of accommodations/hotels
    const extractResults = (resp: any): any[] => {
      if (!resp) return [];
      if (Array.isArray(resp)) return resp;
      if (Array.isArray(resp.data)) return resp.data;
      if (Array.isArray(resp.data?.results)) return resp.data.results;
      if (Array.isArray(resp.results)) return resp.results;
      if (Array.isArray(resp.accommodations)) return resp.accommodations;
      // fallback: find first array value
      const arr = Object.values(resp).find(Array.isArray);
      return Array.isArray(arr) ? arr : [];
    };

    const rawResults = extractResults(searchResponse) as any[];
    if (!rawResults.length) {
      // cache empty response for a shorter amount of time to avoid repeated upstream calls
      await kv.set(cacheKey, [], { ex: 60 }).catch(() => {});
      return NextResponse.json({ success: true, results: [], message: 'No hotels found' });
    }

    // Limit how many hotels we fetch detailed rates for to avoid large parallel hits.
    const hotelsToFetch = rawResults.slice(0, MAX_RATE_FETCHES);

    // Fetch rates sequentially (simple throttling). If you want faster but controlled parallelism,
    // replace with a small concurrency queue (p-limit) in the future.
    const processed: any[] = [];

    for (const hotel of hotelsToFetch) {
      try {
        // If accommodation already embedded, use it
        if (hotel.accommodation) {
          processed.push({
            ...hotel.accommodation,
            id: hotel.accommodation.id || hotel.id,
            check_in_date: searchParams.check_in_date,
            check_out_date: searchParams.check_out_date
          });
          continue;
        }

        // fetch rates for the hotel
        let ratesResponse: any = [];
        try {
          // fetchAllRates may return an array or object depending on client
          ratesResponse = await duffel.stays.searchResults.fetchAllRates(hotel.id);
        } catch (innerErr) {
          console.warn('Failed to fetch rates for hotel', hotel.id, innerErr);
          ratesResponse = [];
        }

        const rates = Array.isArray(ratesResponse) ? ratesResponse : (ratesResponse?.rates ?? []);

        // find cheapest
        let cheapest: any | null = null;
        for (const r of rates) {
          const total = parseFloat(String(r?.total_amount ?? '0')) || 0;
          if (!cheapest || total < (parseFloat(String(cheapest?.total_amount ?? 'Infinity')) || Infinity)) {
            cheapest = r;
          }
        }

        processed.push({
          ...hotel,
          rates,
          cheapest_rate: cheapest,
          total_available_rates: rates.length,
          cheapest_rate_total_amount: cheapest?.total_amount ?? '0',
          cheapest_rate_currency: cheapest?.total_currency ?? 'USD',
          check_in_date: checkInDate,
          check_out_date: checkOutDate
        });
      } catch (e) {
        console.error('Processing hotel failed', e);
        // push a simplified failure record so clients don't break
        processed.push({ id: hotel.id ?? null, error: 'failed_to_fetch_rates' });
      }
    }

    // Store in cache, best-effort
    try {
      await kv.set(cacheKey, processed, { ex: CACHE_TTL_SECONDS });
    } catch (e) {
      console.warn('Cache write failed', e);
    }

    return NextResponse.json({ success: true, cached: false, results: processed });
  } catch (e: any) {
    console.error('Unhandled error in stays search route', e);
    return NextResponse.json({ error: 'internal_error', message: 'Internal server error' }, { status: 500 });
  }
}