// app/api/hotel-details/[id]/route.ts
import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

/**
 * Types for better type safety
 */
interface CacheEntry {
  data: any;
  timestamp: number;
}

interface ParsedParams {
  searchResultId: string | null;
  accommodationId: string;
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
  guests: number;
}

/**
 * In-memory cache for accommodation details
 */
const accommodationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Parse the composite ID parameter
 */
function parseIdParameter(id: string): ParsedParams {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const defaultCheckIn = today.toISOString().split('T')[0];
  const defaultCheckOut = tomorrow.toISOString().split('T')[0];

  // Check if ID is in composite format: searchResultId:accommodationId:checkInDate:checkOutDate:rooms:guests
  if (id.includes(':')) {
    const parts = id.split(':');
    
    if (parts.length >= 6) {
      return {
        searchResultId: parts[0] || null,
        accommodationId: parts[1],
        checkInDate: parts[2] || defaultCheckIn,
        checkOutDate: parts[3] || defaultCheckOut,
        rooms: parseInt(parts[4]) || 1,
        guests: parseInt(parts[5]) || 1,
      };
    } else if (parts.length >= 2) {
      return {
        searchResultId: parts[0] || null,
        accommodationId: parts[1],
        checkInDate: defaultCheckIn,
        checkOutDate: defaultCheckOut,
        rooms: 1,
        guests: 1,
      };
    }
  }

  // Legacy format: just accommodation ID
  return {
    searchResultId: null,
    accommodationId: id,
    checkInDate: defaultCheckIn,
    checkOutDate: defaultCheckOut,
    rooms: 1,
    guests: 1,
  };
}

/**
 * Generate cache key from parameters
 */
function generateCacheKey(params: ParsedParams): string {
  return `${params.searchResultId}:${params.accommodationId}:${params.checkInDate}:${params.checkOutDate}:${params.rooms}:${params.guests}`;
}

/**
 * Transform room data with proper rate information
 */
function transformRoomData(room: any, rates: any[], accommodationPhotos: any[] = []): any {
  // If room is actually a rate (happens when we group rates as rooms)
  if (room.rate_plan_code || room.total_amount) {
    return {
      id: room.id || `room_${Date.now()}`,
      name: room.name || room.rate_plan_code || 'Standard Room',
      description: room.description || 'Room with various rate options',
      photos: (room.photos || accommodationPhotos || []).map((photo: any) => ({
        url: photo.url || '',
        caption: photo.caption || '',
      })),
      beds: room.beds || [{ type: 'queen', count: 1, description: 'Queen bed' }],
      occupancy: room.occupancy || {
        max_adults: 2,
        max_children: 0,
        max_guests: 2,
      },
      size: room.size,
      amenities: (room.amenities || []).map((a: any) => ({
        type: a.type || '',
        description: a.description || '',
      })),
      rates: [{
        id: room.id || `rate_${Date.now()}`,
        code: room.rate_plan_code || 'STANDARD',
        name: room.name || 'Standard Rate',
        total_amount: room.total_amount?.toString() || '0',
        total_currency: room.total_currency || room.currency || 'USD',
        public_amount: room.public_amount?.toString() || room.total_amount?.toString() || '0',
        board_type: room.board_type || 'room_only',
        payment_type: room.payment_type || 'pay_at_hotel',
        cancellation_timeline: Array.isArray(room.cancellation_timeline) 
          ? room.cancellation_timeline 
          : [],
        conditions: Array.isArray(room.conditions) ? room.conditions : [],
        price_breakdown: room.price_breakdown || {
          base: room.total_amount?.toString() || '0',
          tax: '0',
          total: room.total_amount?.toString() || '0',
          currency: room.total_currency || 'USD',
        },
      }],
    };
  }

  // Original room transformation logic
  const roomRates = rates.filter(rate => !rate.room_id || rate.room_id === room.id);
  const applicableRates = roomRates.length > 0 ? roomRates : rates;

  return {
    id: room.id || `room_${Date.now()}`,
    name: room.name || 'Standard Room',
    description: room.description || '',
    photos: (room.photos || accommodationPhotos || []).map((photo: any) => ({
      url: photo.url || '',
      caption: photo.caption || '',
    })),
    beds: Array.isArray(room.beds) && room.beds.length > 0
      ? room.beds.map((bed: any) => ({
          type: bed.type || 'unknown',
          count: bed.count || 1,
          description: bed.description || '',
        }))
      : [{ type: 'queen', count: 1, description: 'Queen bed' }],
    occupancy: room.occupancy || {
      max_adults: 2,
      max_children: 0,
      max_guests: 2,
    },
    size: room.size || null,
    amenities: (room.amenities || []).map((amenity: any) => ({
      type: amenity.type || '',
      description: amenity.description || '',
    })),
    rates: applicableRates.map((rate) => ({
      id: rate.id || `rate_${Date.now()}`,
      code: rate.rate_plan_code || 'STANDARD',
      name: rate.name || rate.description || 'Standard Rate',
      total_amount: rate.total_amount?.toString() || '0',
      total_currency: rate.total_currency || rate.currency || 'USD',
      public_amount: rate.public_amount?.toString() || rate.total_amount?.toString() || '0',
      board_type: rate.board_type || 'room_only',
      payment_type: rate.payment_type || 'pay_at_hotel',
      cancellation_timeline: Array.isArray(rate.cancellation_timeline)
        ? rate.cancellation_timeline
        : [],
      conditions: Array.isArray(rate.conditions) ? rate.conditions : [],
      price_breakdown: rate.price_breakdown || {
        base: rate.total_amount?.toString() || '0',
        tax: '0',
        total: rate.total_amount?.toString() || '0',
        currency: rate.total_currency || rate.currency || 'USD',
      },
    })),
  };
}

/**
 * Fetch rates for a search result
 */
async function fetchRates(searchResultId: string): Promise<any[]> {
  try {
    console.log('Fetching rates for search result:', searchResultId);
    
    // Fetch rates from Duffel API with proper typing
    const response = await duffel.stays.searchResults.fetchAllRates(searchResultId);
    console.log('Raw rates response:', JSON.stringify(response, null, 2));

    // Type guard to check if response has data property
    const hasData = (r: any): r is { data: any[] } => 
      r && typeof r === 'object' && 'data' in r && Array.isArray(r.data);

    // Type guard to check if response has records property
    const hasRecords = (r: any): r is { records: any[] } => 
      r && typeof r === 'object' && 'records' in r && Array.isArray(r.records);

    // Handle different response formats
    if (Array.isArray(response)) {
      console.log(`✅ Found ${response.length} rates (direct array)`);
      return response;
    }

    // Handle response with data property
    if (hasData(response)) {
      console.log(`✅ Found ${response.data.length} rates (response.data)`);
      return response.data;
    }

    // Handle paginated response with records
    if (hasRecords(response)) {
      console.log(`✅ Found ${response.records.length} rates (paginated)`);
      return response.records;
    }

    // Handle case where rates might be in a nested structure
    const nestedData = response as any;
    if (nestedData?.data?.rates && Array.isArray(nestedData.data.rates)) {
      console.log(`✅ Found ${nestedData.data.rates.length} rates (nested data.rates)`);
      return nestedData.data.rates;
    }

    // If we get here, log the structure for debugging
    console.warn('⚠️ Could not find rates in the response. Response keys:', 
      Object.keys(response || {}).join(', '));
    return [];

  } catch (error) {
    console.error('❌ Error in fetchRates:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if ('meta' in error) {
        console.error('Error meta:', (error as any).meta);
      }
    }
    return [];
  }
}

/**
 * Create fallback rate from cheapest rate data
 */
function createFallbackRate(cheapestRate: any, accommodationId: string): any {
  return {
    id: `rate_fallback_${accommodationId}_${Date.now()}`,
    rate_plan_code: 'STANDARD',
    name: 'Standard Rate',
    description: 'Standard room rate',
    total_amount: cheapestRate.total_amount || '0',
    total_currency: cheapestRate.currency || 'USD',
    public_amount: cheapestRate.public_amount || cheapestRate.total_amount || '0',
    board_type: 'room_only',
    payment_type: 'pay_at_hotel',
    cancellation_timeline: [],
    conditions: [],
    price_breakdown: {
      base: cheapestRate.total_amount || '0',
      tax: '0',
      total: cheapestRate.total_amount || '0',
      currency: cheapestRate.currency || 'USD',
    },
  };
}

/**
 * Main GET handler
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('=== Hotel Details API Request ===');
  console.log('Raw ID parameter:', params.id);

  try {
    // Parse the ID parameter
    const parsedParams = parseIdParameter(params.id);
    console.log('Parsed parameters:', parsedParams);

    if (!parsedParams.accommodationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Accommodation ID is required',
        },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = generateCacheKey(parsedParams);
    const cached = accommodationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Returning cached data');
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    // Fetch fresh data from Duffel API
    console.log('🔍 Fetching accommodation from Duffel...');
    
    const searchResult = await duffel.stays.search({
      accommodation: {
        ids: [parsedParams.accommodationId],
      },
      check_in_date: parsedParams.checkInDate,
      check_out_date: parsedParams.checkOutDate,
      rooms: parsedParams.rooms,
      guests: Array(parsedParams.guests).fill({ type: 'adult' }),
    });

    console.log('Search result structure:', {
      hasData: !!searchResult.data,
      hasResults: !!searchResult.data?.results,
      resultsCount: searchResult.data?.results?.length || 0,
    });

    const matchingResult = searchResult.data?.results?.[0];

    if (!matchingResult || !matchingResult.accommodation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Accommodation not found',
          details: 'No matching accommodation in search results',
        },
        { status: 404 }
      );
    }

    console.log('✅ Found accommodation:', matchingResult.accommodation.name);

    // Fetch rates
    let rates: any[] = [];
    
    if (parsedParams.searchResultId) {
      console.log('Fetching rates using search result ID...');
      rates = await fetchRates(parsedParams.searchResultId);
    }

    // CRITICAL: If no rates from search result, try to get rates from the search response
    if (rates.length === 0) {
      console.log('No rates from search result, checking search response...');
      
     // Try to get rates from the matching result
      const matchingResultWithRates = matchingResult as any; // Temporary type assertion
      if (matchingResultWithRates.rates && Array.isArray(matchingResultWithRates.rates)) {
          console.log(`✅ Found ${matchingResultWithRates.rates.length} rates in search result`);
          rates = matchingResultWithRates.rates;
      }
      // Try to get the search result ID from the response to fetch rates
      else if (matchingResult.id) {
        console.log('Attempting to fetch rates using result ID from response...');
        const fetchedRates = await fetchRates(matchingResult.id);
        if (fetchedRates.length > 0) {
          rates = fetchedRates;
        }
      }
    }

    // Fallback: Create a rate from cheapest_rate data if available
    if (rates.length === 0 && matchingResult.cheapest_rate_total_amount) {
      console.log('⚠️ Creating fallback rate from cheapest_rate data');
      rates = [
        createFallbackRate(
          {
            total_amount: matchingResult.cheapest_rate_total_amount,
            currency: matchingResult.cheapest_rate_currency || 'USD',
            public_amount: matchingResult.cheapest_rate_public_amount,
          },
          parsedParams.accommodationId
        ),
      ];
    }

    console.log(`📊 Total rates available: ${rates.length}`);

    // Transform accommodation data
    const accommodationPhotos = matchingResult.accommodation.photos || [];
    
    // CRITICAL: Process rooms properly
    let rooms: any[] = [];
    
    // Option 1: Use rooms from the search result
    if (Array.isArray(matchingResult.rooms) && matchingResult.rooms.length > 0) {
      console.log(`✅ Found ${matchingResult.rooms.length} rooms in search result`);
      rooms = matchingResult.rooms.map((room: any) =>
        transformRoomData(room, rates, accommodationPhotos)
      );
    }
    
    // Option 2: If no rooms but we have rates, group rates as rooms
    else if (rates.length > 0) {
      console.log('⚠️ No room data, grouping rates as rooms');
      
      // Group rates by room type or create default room
      const ratesByRoomType = new Map<string, any[]>();
      
      rates.forEach(rate => {
        const roomType = rate.room_type || rate.name || 'Standard Room';
        if (!ratesByRoomType.has(roomType)) {
          ratesByRoomType.set(roomType, []);
        }
        ratesByRoomType.get(roomType)!.push(rate);
      });
      
      // Create a room for each group
      rooms = Array.from(ratesByRoomType.entries()).map(([roomType, roomRates], index) => {
        return transformRoomData(
          {
            id: `room_${index}`,
            name: roomType,
            description: `${roomType} with various rate options`,
          },
          roomRates,
          accommodationPhotos
        );
      });
    }
    
    // Option 3: Create a default room with all rates
    else {
      console.log('⚠️ No rooms or rates, creating default room');
      rooms = [
        transformRoomData(
          {
            id: 'room_default',
            name: 'Standard Room',
            description: 'Standard accommodation',
          },
          rates,
          accommodationPhotos
        ),
      ];
    }

    console.log(`📦 Final rooms count: ${rooms.length}`);

    // Prepare transformed data
    const transformedData = {
      accommodation: {
        id: matchingResult.accommodation.id,
        name: matchingResult.accommodation.name,
        description:
          matchingResult.accommodation.description || 'No description available',
        photos: accommodationPhotos.map((photo: any) => ({
          url: photo.url || '',
          caption: photo.caption || '',
        })),
        rating: matchingResult.accommodation.rating,
        review_score: matchingResult.accommodation.review_score,
        location: {
          address: {
            city_name:
              matchingResult.accommodation.location?.address?.city_name || 'Unknown',
            country_code:
              matchingResult.accommodation.location?.address?.country_code || '',
            line_one: matchingResult.accommodation.location?.address?.line_one || '',
            postal_code:
              matchingResult.accommodation.location?.address?.postal_code || '',
            region: matchingResult.accommodation.location?.address?.region || '',
          },
          geographic_coordinates:
            matchingResult.accommodation.location?.geographic_coordinates,
        },
        amenities: (matchingResult.accommodation.amenities || []).map((a: any) => ({
          type: a.type || '',
          description: a.description || '',
        })),
        check_in_information: matchingResult.accommodation.check_in_information || {
          check_in_after_time: '14:00',
          check_in_before_time: '23:59',
          check_out_before_time: '12:00',
        },
        phone_number: matchingResult.accommodation.phone_number,
        email: matchingResult.accommodation.email,
      },
      rooms,
      check_in_date: parsedParams.checkInDate,
      check_out_date: parsedParams.checkOutDate,
      search_result_id: matchingResult.id || parsedParams.searchResultId,
    };

    // Cache the result
    accommodationCache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now(),
    });

    console.log('✅ Successfully processed hotel details');

    return NextResponse.json({
      success: true,
      data: transformedData,
      debug: {
        rooms_count: rooms.length,
        rates_count: rates.length,
        has_search_result_id: !!parsedParams.searchResultId,
      },
    });
  } catch (error) {
    console.error('❌ Error in hotel details API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Clear expired cache entries (optional cleanup function)
 */
export function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of accommodationCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      accommodationCache.delete(key);
    }
  }
}

// Optional: Run cache cleanup periodically
if (typeof setInterval !== 'undefined') {
  setInterval(clearExpiredCache, CACHE_TTL);
}