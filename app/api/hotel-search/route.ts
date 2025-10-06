import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';
import kv from '@/lib/redis';
import type { 
  StaysSearchParams, 
  Guest, 
  StaysSearchResult,
  StaysSearchResponse
} from '@duffel/api/Stays/StaysTypes';

// Maximum number of hotels to fetch rates for in the initial search
const MAX_RATE_FETCHES = 5;

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 5 * 60;

// Helper function to generate a cache key for search
function generateSearchCacheKey(params: any): string {
  const { location, checkInDate, checkOutDate, rooms, guests } = params;
  return `hotel_search:${JSON.stringify({ location, checkInDate, checkOutDate, rooms, guests })}`;
}

// Update the checkRateLimit function
async function checkRateLimit(): Promise<{ limited: boolean; resetTime?: number }> {
  const RATE_LIMIT_KEY = 'duffel:rate_limit';
  const isLimited = await kv.isRateLimited(RATE_LIMIT_KEY);
  
  if (isLimited) {
    // Get the reset time from cache
    const resetTime = await kv.get<number>(`rate_limit:${RATE_LIMIT_KEY}`);
    const resetTimeMs = resetTime ? resetTime * 1000 : Date.now() + 60000; // Default to 1 minute if not set
    
    return { 
      limited: true, 
      resetTime: Math.ceil((resetTimeMs - Date.now()) / 1000) // Return seconds until reset
    };
  }
  
  return { limited: false };
}

// Update the updateRateLimits function
async function updateRateLimits(headers: Headers) {
  const rateLimitReset = headers.get('ratelimit-reset');
  if (rateLimitReset) {
    const resetTime = parseInt(rateLimitReset, 10);
    if (!isNaN(resetTime)) {
      // Convert reset time to seconds if it's in milliseconds
      const resetTimeSeconds = resetTime > 1e10 ? Math.floor(resetTime / 1000) : resetTime;
      await kv.setRateLimit('duffel:rate_limit', resetTimeSeconds);
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Hotel search request body:', body);
    
    const { 
      location, 
      checkInDate, 
      checkOutDate, 
      rooms, 
      guests,
    } = body;
    
    console.log('Hotel search request parameters:', { location, checkInDate, checkOutDate, rooms, guests });

    // Check rate limit first
    const rateLimitCheck = await checkRateLimit();
    if (rateLimitCheck.limited) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Please try again later',
          retryAfter: rateLimitCheck.resetTime || 60
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.resetTime || 60)
          }
        }
      );
    }

    // Generate cache key for this search
    const cacheKey = generateSearchCacheKey({ location, checkInDate, checkOutDate, rooms, guests });
    
    // Try to get from cache
    const cachedResults = await kv.get<any[]>(cacheKey);
    if (cachedResults) {
      return NextResponse.json({
        success: true,
        results: cachedResults,
        cached: true
      });
    }

    // Format guests for Duffel API
    let formattedGuests: Guest[] = [];
    if (Array.isArray(guests)) {
      formattedGuests = guests;
    } else {
      // If guests is a number, convert to array of adults
      const numGuests = Math.max(1, parseInt(guests as string, 10) || 1);
      formattedGuests = Array(numGuests).fill(null).map(() => ({ type: 'adult' as const }));
    }

    // Calculate adults and children counts
    const adults = formattedGuests.filter(g => g.type === 'adult').length;
    const children = formattedGuests.filter(g => g.type === 'child').length;

    // Base search parameters with proper typing
    const baseParams = {
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      rooms: Math.max(1, parseInt(rooms as string, 10) || 1),
      guests: formattedGuests,
      sort: 'price' as const,
      limit: 10,
      price_min: 0,
      price_max: 1000,
    };
    
    // Add adults and children to the search params if they're defined
    const searchParamsWithGuests = {
      ...baseParams,
      ...(adults > 0 ? { adults } : {}),
      ...(children > 0 ? { children } : { children: 0 }),
    };

    // Determine if we're searching by coordinates or accommodation ID
    let searchParams: StaysSearchParams;
    
    if (location.includes(',')) {
      // Location is coordinates (lat,lng)
      const [latitude, longitude] = location.split(',').map((coord: string) => parseFloat(coord.trim()));
      
      searchParams = {
        ...searchParamsWithGuests,
        location: {
          radius: 20, // Increased from 5km to 20km
          geographic_coordinates: { 
            latitude, 
            longitude 
          }
        }
      };
    } else {
      // Location is an accommodation ID
      searchParams = {
        ...searchParamsWithGuests,
        accommodation: {
          ids: [location]
        }
      };
    }

    console.log('Searching with params:', JSON.stringify(searchParams, null, 2));
    
    try {
      // Make the search request
      const searchResponse = await duffel.stays.search(searchParams);
      
      
      // Log the full response for debugging
      console.log('Full search response:', JSON.stringify(searchResponse, null, 2));
      
      // Process the search results
      let searchResults: any[] = [];
      
      // Type guard to check if response has data property
      const hasData = (response: unknown): response is { data: unknown } => 
        response !== null && 
        typeof response === 'object' && 
        'data' in response;
        
      // Type guard to check if response has results property
      const hasResults = (response: unknown): response is { results: unknown } => 
        response !== null && 
        typeof response === 'object' && 
        'results' in response;
        
      // Type guard to check if response has accommodations property
      const hasAccommodations = (response: unknown): response is { accommodations: unknown } => 
        response !== null && 
        typeof response === 'object' && 
        'accommodations' in response;
        
      // Helper to safely get array from unknown source
      const getArrayFromUnknown = (data: unknown): any[] => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
          return data.data;
        }
        return [];
      };
      
      // Handle different response formats
      if (Array.isArray(searchResponse)) {
        searchResults = searchResponse;
      } else if (searchResponse && typeof searchResponse === 'object') {
        // Check for the data structure in the response
        if ('data' in searchResponse && searchResponse.data) {
          // If data is an array, use it directly
          if (Array.isArray(searchResponse.data)) {
            searchResults = searchResponse.data;
          } 
          // If data has a results array, use that
          else if (searchResponse.data.results && Array.isArray(searchResponse.data.results)) {
            searchResults = searchResponse.data.results;
          }
        }
        // If no data property, check for results or accommodations at the root
        else if ('results' in searchResponse && Array.isArray(searchResponse.results)) {
          searchResults = searchResponse.results;
        } else if ('accommodations' in searchResponse && Array.isArray(searchResponse.accommodations)) {
          searchResults = searchResponse.accommodations;
        } else {
          // As a last resort, look for any array in the response
          const arrayValue = Object.values(searchResponse).find(Array.isArray);
          if (arrayValue) {
            searchResults = arrayValue as any[];
          }
        }
      }
      
      // Log the raw search results for debugging
      console.log('Raw search results:', JSON.stringify(searchResults, null, 2));
      
      if (!searchResults || searchResults.length === 0) {
        console.log('No results found for search');
        return NextResponse.json({
          success: true,
          results: [],
          message: 'No hotels found matching your criteria'
        });
      }

      // Limit the number of hotels to fetch rates for
      const hotelsToProcess = searchResults.slice(0, MAX_RATE_FETCHES);
      
      // Process each hotel to get rates
      const processedHotels = await Promise.all(
        hotelsToProcess.map(async (hotel: any) => {
          // Skip if hotel is already in the expected format
          if (hotel.accommodation) {
            return {
              ...hotel.accommodation,
              id: hotel.accommodation.id || hotel.id,
              check_in_date: searchParams.check_in_date,
              check_out_date: searchParams.check_out_date
            };
          }
          try {
            const ratesResponse = await duffel.stays.searchResults.fetchAllRates(hotel.id);
            
            // Find the cheapest rate
            const rates = Array.isArray(ratesResponse) ? ratesResponse : [];
            const cheapestRate = rates.reduce((cheapest, current) => {
              if (!cheapest) return current;
              const currentPrice = parseFloat(current.total_amount || '0');
              const cheapestPrice = parseFloat(cheapest?.total_amount || 'Infinity');
              return currentPrice < cheapestPrice ? current : cheapest;
            }, null);

            return {
              ...hotel,
              rates,
              cheapest_rate: cheapestRate,
              total_available_rates: rates.length,
              cheapest_rate_total_amount: cheapestRate?.total_amount || '0',
              cheapest_rate_currency: cheapestRate?.total_currency || 'USD',
              check_in_date: checkInDate,
              check_out_date: checkOutDate,
            };
          } catch (error) {
            console.error(`Error fetching rates for hotel ${hotel.id}:`, error);
            return {
              ...hotel,
              rates: [],
              total_available_rates: 0,
              cheapest_rate: null,
              cheapest_rate_total_amount: '0',
              cheapest_rate_currency: 'USD',
              check_in_date: checkInDate,
              check_out_date: checkOutDate,
            };
          }
        })
      );
      
      // Filter out any failed hotel fetches
      const validHotels = processedHotels.filter(hotel => hotel);
      
      // Cache the results
      await kv.set(cacheKey, validHotels, { ex: CACHE_TTL });
      
      return NextResponse.json({
        success: true,
        results: validHotels,
        cached: false
      });
      
    } catch (error: any) {
      console.error('Duffel API error:', error);
      
      // Handle rate limiting
      if (error.meta?.status === 429) {
        const resetTime = Math.floor(Date.now() / 1000) + 60; // Default to 1 minute
        await kv.setRateLimit('duffel:rate_limit', resetTime);
        
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: 'Please try again in a minute',
            retryAfter: 60
          },
          { 
            status: 429,
            headers: {
              'Retry-After': '60'
            }
          }
        );
      }
      
      throw error; // Re-throw other errors
    }
    
  } catch (error: any) {
    console.error('Error in hotel search:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search for hotels',
        message: error.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { details: error })
      },
      { status: 500 }
    );
  }
}