/**
 * Hotel Details API Route
 * 
 * This API endpoint provides detailed hotel information including room types,
 * rates, amenities, and booking options by integrating with the Duffel API.
 * 
 * Features:
 * - Comprehensive error handling and logging
 * - Rate limiting and security measures
 * - Intelligent caching with TTL
 * - Input validation and sanitization
 * - Clean, maintainable code structure
 * 
 * @fileoverview Hotel details API
 * @author Where2 Development Team
 * @version 2.0.0
 */

import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

/**
 * Types for better type safety
 */
interface CacheEntry<T = any> {
  data: T;
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

interface HotelResponse {
  success: boolean;
  data?: {
    accommodation: any;
    rooms: any[];
  };
  error?: string;
  message?: string;
  cached?: boolean;
}

interface Rate {
  id: string;
  room_id?: string;
  room_type_id?: string;
  name: string;
  total_amount: string;
  total_currency: string;
  cancellation_policy: {
    type: string;
    description: string;
    penalty?: any;
  };
  room_name?: string;
  room_type?: string;
  room_type_name?: string;
  room_description?: string;
  room_type_description?: string;
  bed_type?: string;
  bed_count?: number;
  bed_description?: string;
  max_occupancy?: number;
  beds?: Array<{
    type: string;
    count: number;
    description: string;
  }>;
  amenities?: string[];
}

/**
 * Configuration constants for the hotel details API
 */
const CONFIG = {
  CACHE: {
    TTL: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 1000, // Maximum number of cached entries
  },
  RATE_LIMIT: {
    WINDOW: 60 * 1000, // 1 minute
    MAX_REQUESTS: 100, // Max requests per minute per IP
  },
  VALIDATION: {
    MAX_ROOMS: 10,
    MAX_GUESTS: 20,
    MIN_STAY_DAYS: 1,
    MAX_STAY_DAYS: 30,
  },
} as const;

/**
 * In-memory cache for accommodation details with improved performance
 */
const accommodationCache = new Map<string, CacheEntry>();

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
      const maybeSearchResultId = parts[0] || null;
      const validSearchResultId = maybeSearchResultId && maybeSearchResultId.startsWith('srr_') ? maybeSearchResultId : null;
      const accommodationId = parts[1];
      return {
        searchResultId: validSearchResultId,
        accommodationId,
        checkInDate: parts[2] || defaultCheckIn,
        checkOutDate: parts[3] || defaultCheckOut,
        rooms: parseInt(parts[4]) || 1,
        guests: parseInt(parts[5]) || 1,
      };
    } else if (parts.length >= 2) {
      const maybeSearchResultId = parts[0] || null;
      const validSearchResultId = maybeSearchResultId && maybeSearchResultId.startsWith('srr_') ? maybeSearchResultId : null;
      return {
        searchResultId: validSearchResultId,
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
 * Check rate limit for IP address
 * @param ip - Client IP address
 * @returns Rate limit status with retry information
 */
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // Reset or create new window
    rateLimitStore.set(key, { 
      count: 1, 
      resetTime: now + CONFIG.RATE_LIMIT.WINDOW 
    });
    return { allowed: true };
  }

  if (current.count >= CONFIG.RATE_LIMIT.MAX_REQUESTS) {
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
 * Clean up expired cache entries and rate limit data
 * Removes expired entries and enforces cache size limits
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  // Clean up accommodation cache
  for (const [key, entry] of accommodationCache.entries()) {
    if (now - entry.timestamp > CONFIG.CACHE.TTL) {
      accommodationCache.delete(key);
    }
  }
  
  // Clean up rate limit store
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  // Enforce max cache size
  if (accommodationCache.size > CONFIG.CACHE.MAX_SIZE) {
    const entries = Array.from(accommodationCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = entries.slice(0, entries.length - CONFIG.CACHE.MAX_SIZE);
    toDelete.forEach(([key]) => accommodationCache.delete(key));
  }
}

/**
 * Transform room data with rate information
 * @param room - Room data object from API response
 * @param allRates - Array of all available rates
 * @param accommodationPhotos - Array of accommodation photos to use as fallback
 * @returns Transformed room object with proper rate structure or null if no valid rates
 */
function transformRoomData(room: any, allRates: Rate[], accommodationPhotos: any[] = []): any | null {
  if (!room) return null;

  // Find rates that match this room
  const roomRates = allRates.filter(rate => {
    // Match by room ID
    if (rate.room_id === room.id) return true;
    
    // Match by room type ID
    if (rate.room_type_id && room.id && rate.room_type_id === room.id) return true;
    
    // Match by room name/type
    if (rate.room_name && room.name && rate.room_name.toLowerCase() === room.name.toLowerCase()) return true;
    if (rate.room_type && room.name && rate.room_type.toLowerCase() === room.name.toLowerCase()) return true;
    
    // Match by room type name
    if (rate.room_type_name && room.name && rate.room_type_name.toLowerCase() === room.name.toLowerCase()) return true;
    
    return false;
  });

  // If no rates found for this room, return null (will be filtered out)
  if (roomRates.length === 0) return null;

  // Transform rates to a consistent format
  const transformedRates = roomRates.map(rate => ({
    id: rate.id,
    name: rate.name || 'Standard Rate',
    total_amount: rate.total_amount || '0',
    total_currency: rate.total_currency || 'USD',
    cancellation_policy: rate.cancellation_policy || {
      type: 'NON_REFUNDABLE',
      description: 'Non-refundable',
    },
    terms_and_conditions: 'terms_and_conditions' in rate ? rate.terms_and_conditions : '',
  }));

  // Use room photos if available, otherwise fall back to accommodation photos
  const photos = room.photos?.length > 0 ? room.photos : accommodationPhotos;

  // Transform room data
  return {
    id: room.id,
    name: room.name || 'Standard Room',
    description: room.description || '',
    photos: (photos || []).map((p: any) => ({
      url: p.url || '',
      caption: p.caption || '',
    })),
    max_occupancy: room.max_occupancy || 2,
    beds: Array.isArray(room.beds) ? room.beds : [],
    amenities: Array.isArray(room.amenities) ? room.amenities : [],
    rates: transformedRates,
  };
}

/**
 * Fetch rates for a search result
 * @param searchResultId - Duffel search result identifier (starts with 'srr_')
 * @returns Promise resolving to array of rate objects
 */
async function fetchRates(searchResultId: string): Promise<any[]> {
  try {
    console.log('🔍 Fetching rates for search result:', searchResultId);
    
    if (!searchResultId?.startsWith('srr_')) {
      console.warn('⚠️ Invalid search result ID format');
      return [];
    }

    // Fetch the search result with rates
    const response = await duffel.stays.searchResults.fetchAllRates(searchResultId);
    
    // Handle the response based on the provided format
    const responseData = response?.data;
    
    // Extract rooms and rates from the response
    const rooms = responseData?.accommodation?.rooms;
    const rates = rooms.flatMap((room: any) => room.rates);
    
    if (rates.length > 0) {
      console.log(`✅ Found ${rates.length} rates across ${rooms.length} rooms`);
      return rates;
    }
    
    console.warn('⚠️ No rates found in the response');
    return [];
    
  } catch (error) {
    console.error('❌ Error fetching rates:', error);
    return [];
  }
}

/**
 * Main GET handler for hotel details API
 * 
 * Handles hotel details requests with comprehensive error handling, rate limiting,
 * and caching. Only returns data available from the Duffel API without fallbacks.
 * 
 * @param request - HTTP request object
 * @param params - Route parameters containing the composite hotel ID
 * @returns JSON response with hotel details and room rates
 * 
 * @example
 * GET /api/hotel-details/searchId:accommodationId:checkIn:checkOut:rooms:guests
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<HotelResponse>> {
  const requestId = Math.random().toString(36).substring(2, 10);
  const startTime = Date.now();
  
  const log = (message: string, data?: any) => {
    console.log(`[${requestId}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  };
  
  log('Processing hotel details request', { id: params.id });

  try {
    // Input validation and sanitization
    if (!params.id || typeof params.id !== 'string') {
      log('Invalid ID parameter');
      return NextResponse.json(
        { success: false, error: 'Invalid ID parameter' },
        { status: 400 }
      );
    }

    // Sanitize the ID parameter to prevent injection attacks
    const sanitizedId = params.id.replace(/[^a-zA-Z0-9:._-]/g, '');
    if (sanitizedId !== params.id) {
      log('Sanitized ID parameter');
    }

    // Parse the ID parameter
    const parsedParams = parseIdParameter(sanitizedId);
    log('Parsed parameters', parsedParams);

    // Validate required parameters
    if (!parsedParams.accommodationId) {
      log('Missing accommodation ID');
      return NextResponse.json(
        { success: false, error: 'Accommodation ID is required' },
        { status: 400 }
      );
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(parsedParams.checkInDate) || !dateRegex.test(parsedParams.checkOutDate)) {
      log('Invalid date format');
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate numeric parameters
    if (parsedParams.rooms < 1 || parsedParams.rooms > CONFIG.VALIDATION.MAX_ROOMS) {
      log('Invalid number of rooms');
      return NextResponse.json(
        { 
          success: false, 
          error: `Number of rooms must be between 1 and ${CONFIG.VALIDATION.MAX_ROOMS}` 
        },
        { status: 400 }
      );
    }

    if (parsedParams.guests < 1 || parsedParams.guests > CONFIG.VALIDATION.MAX_GUESTS) {
      log('Invalid number of guests');
      return NextResponse.json(
        { 
          success: false, 
          error: `Number of guests must be between 1 and ${CONFIG.VALIDATION.MAX_GUESTS}` 
        },
        { status: 400 }
      );
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
                    
    const rateLimitCheck = checkRateLimit(clientIP);
    
    if (!rateLimitCheck.allowed) {
      log('Rate limit exceeded', { clientIP });
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimitCheck.retryAfter} seconds.`,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': CONFIG.RATE_LIMIT.MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + (rateLimitCheck.retryAfter || 60) * 1000).toString(),
          }
        }
      );
    }

    // Clean up expired entries periodically (10% chance to reduce overhead)
    if (Math.random() < 0.1) {
      cleanupExpiredEntries();
    }

    // Check cache
    const cacheKey = generateCacheKey(parsedParams);
    const cached = accommodationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE.TTL) {
      log('Serving from cache');
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    // Fetch fresh data from Duffel API with improved error handling
    log('Fetching accommodation from Duffel...');
    
    let searchResult;
    try {
      // Log the request parameters
      const searchParams = {
        accommodation: {
          ids: [parsedParams.accommodationId],
        },
        check_in_date: parsedParams.checkInDate,
        check_out_date: parsedParams.checkOutDate,
        rooms: parsedParams.rooms,
        guests: Array(parsedParams.guests).fill({ type: 'adult' }),
      };
      
      log('Duffel search parameters', searchParams);
      
      searchResult = await duffel.stays.search(searchParams);
      
      log('Duffel API response received', { 
        hasData: !!searchResult?.data,
        resultsCount: searchResult?.data?.results?.length || 0
      });
      
    } catch (duffelError: any) {
      log('Duffel API error', { 
        status: duffelError?.meta?.status,
        code: duffelError?.code,
        message: duffelError?.message 
      });
      
      // Handle specific Duffel API errors
      if (duffelError?.meta?.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
          },
          { 
            status: 429,
            headers: { 'Retry-After': '60' }
          }
        );
      }
      
      if (duffelError?.meta?.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: 'Accommodation not found',
            message: 'The requested accommodation could not be found.',
          },
          { status: 404 }
        );
      }
      
      // Generic Duffel error
      return NextResponse.json(
        {
          success: false,
          error: 'External service error',
          message: 'Unable to fetch accommodation details. Please try again later.',
        },
        { status: 502 }
      );
    }

    const result = searchResult.data?.results?.[0];
    
    if (!result?.accommodation) {
      log('No accommodation found in search results');
      return NextResponse.json(
        {
          success: false,
          error: 'Accommodation not found',
          message: 'The requested accommodation could not be found in the search results.',
        },
        { status: 404 }
      );
    }

    log('Found accommodation', { 
      name: result.accommodation.name,
      id: result.accommodation.id,
      accommodationStructure: Object.keys(result.accommodation)
    });
    
    // Log the full accommodation object structure for debugging
    log('Full accommodation object keys', {
      hasRooms: 'rooms' in result.accommodation,
      roomsType: typeof result.accommodation.rooms,
      roomsIsArray: Array.isArray(result.accommodation.rooms),
      roomsLength: Array.isArray(result.accommodation.rooms) ? result.accommodation.rooms.length : 'N/A'
    });
    
    // Log first room structure if available
    if (Array.isArray(result.accommodation.rooms) && result.accommodation.rooms.length > 0) {
      const firstRoom = result.accommodation.rooms[0];
      log('First room structure', {
        roombeds: firstRoom.beds,
        roomName: firstRoom.name,
        hasRates: 'rates' in firstRoom,
        ratesType: typeof firstRoom.rates,
        ratesIsArray: Array.isArray(firstRoom.rates),
        ratesLength: Array.isArray(firstRoom.rates) ? firstRoom.rates.length : 'N/A',
        firstRoomKeys: Object.keys(firstRoom)
      });
      
      // Log first rate if available
      if (Array.isArray(firstRoom.rates) && firstRoom.rates.length > 0) {
        const firstRate = firstRoom.rates[0];
        log('First rate structure', {
          rateId: firstRate.id,
          rateBaseAmount: firstRate.base_amount,
          totalAmount: firstRate.total_amount,
          totalCurrency: firstRate.total_currency,
          firstRateKeys: Object.keys(firstRate)
        });
      }
    } else {
      // Log the full result structure to understand what we're getting
      log('Rooms array is empty, checking full result structure', {
        resultKeys: Object.keys(result),
        hasAccommodation: !!result.accommodation,
        accommodationKeys: result.accommodation ? Object.keys(result.accommodation) : [],
        fullResult: JSON.stringify(result, null, 2).substring(0, 2000)
      });
    }

    // Transform accommodation data
    const accommodationPhotos = result.accommodation.photos || [];
    
    // Process rooms and rates
    let rooms: any[] = [];
    
    // Get rooms from accommodation.rooms (Duffel API structure)
    const accommodationRooms = (result.accommodation as any)?.rooms || [];
    log(`Processing rooms and rates`, { 
      roomsCount: accommodationRooms.length,
      hasAccommodationRooms: accommodationRooms.length > 0,
      searchResultId: parsedParams.searchResultId
    });
    
    // Process rooms if we have them
    if (accommodationRooms.length > 0) {
      log(`Processing ${accommodationRooms.length} rooms from accommodation`);
      
      // Process each room and its rates
      rooms = accommodationRooms
        .map((room: any, index: number) => {
          // Each room has its own rates array
          const roomRates = Array.isArray(room.rates) ? room.rates : [];
          
          log(`Processing room ${index + 1}/${accommodationRooms.length}`, { 
            roomId: room.id, 
            roomName: room.name,
            ratesCount: roomRates.length
          });
          
          if (roomRates.length === 0) {
            log(`Room ${room.name} has no rates, skipping`, {
              roomId: room.id,
              roomName: room.name,
              hasRatesField: 'rates' in room,
              ratesValue: room.rates,
              ratesType: typeof room.rates,
              ratesIsArray: Array.isArray(room.rates)
            });
            return null;
          }
          
          // Transform room with its rates
          const transformedRoom = {
            id: room.id || `room-${index}`,
            name: room.name || `Room ${index + 1}`,
            description: room.description || '',
            photos: Array.isArray(room.photos) 
              ? room.photos.map((p: any) => ({
                  url: p.url || '',
                  caption: p.caption || ''
                }))
              : accommodationPhotos,
            max_occupancy: room.max_occupancy || 2,
            beds: Array.isArray(room.beds) 
              ? room.beds.map((bed: any) => ({
                  type: bed.type || 'Double',
                  count: bed.count || 1,
                  description: bed.description || `${bed.count || 1} ${bed.type || 'Double'} bed`
                }))
              : [{ type: 'Double', count: 1, description: '1 Double bed' }],
            amenities: Array.isArray(room.amenities) 
              ? room.amenities 
              : [],
            rates: roomRates.map((rate: any) => ({
              id: rate.id || `rate-${Math.random().toString(36).substr(2, 9)}`,
              name: rate.name || 'Standard Rate',
              total_amount: rate.total_amount || '0',
              total_currency: rate.total_currency || 'USD',
              board_type: rate.board_type || 'room_only',
              payment_type: rate.payment_type || 'pay_now',
              cancellation_policy: rate.cancellation_policy || {
                type: 'NON_REFUNDABLE',
                description: 'Non-refundable rate'
              },
              conditions: Array.isArray(rate.conditions) ? rate.conditions : [],
              cancellation_timeline: Array.isArray(rate.cancellation_timeline) 
                ? rate.cancellation_timeline 
                : [],
              available_rooms: rate.quantity_available || rate.available_rooms,
              max_occupancy: room.max_occupancy || 2,
              room_size: room.room_size,
              amenities: room.amenities
            }))
          };
          
          return transformedRoom;
        })
        .filter(Boolean);
    } else {
      // If no rooms from accommodation, try to fetch rates using search result ID
      log('No rooms in accommodation.rooms, attempting to fetch rates from search result');
      
      // We need to use the search result ID to fetch rates
      // The search result ID should be in the result object
      const searchResultId = (result as any)?.id;
      
      if (searchResultId?.startsWith('srr_')) {
        log('Found search result ID, fetching rates', { searchResultId });
        
        try {
          // Fetch the search result with all rates
          const ratesResponse = await duffel.stays.searchResults.fetchAllRates(searchResultId);
          const responseData = ratesResponse?.data;
          
          log('Fetched rates response structure', {
            hasData: !!responseData,
            hasAccommodation: !!responseData?.accommodation,
            hasRooms: !!responseData?.accommodation?.rooms,
            roomsCount: responseData?.accommodation?.rooms?.length || 0
          });
          
          // Extract rooms from the rates response
          const fetchedRooms = responseData?.accommodation?.rooms || [];
          
          if (Array.isArray(fetchedRooms) && fetchedRooms.length > 0) {
            log(`Successfully fetched ${fetchedRooms.length} rooms with rates`);
            
            rooms = fetchedRooms
              .map((room: any, index: number) => {
                const roomRates = Array.isArray(room.rates) ? room.rates : [];
                
                log(`Processing fetched room ${index + 1}/${fetchedRooms.length}`, {
                  roomId: room.id,
                  roomName: room.name,
                  ratesCount: roomRates.length
                });
                
                if (roomRates.length === 0) {
                  log(`Fetched room ${room.name} has no rates, skipping`);
                  return null;
                }
                
                return {
                  id: room.id || `room-${index}`,
                  name: room.name || `Room ${index + 1}`,
                  description: room.description || '',
                  photos: Array.isArray(room.photos) 
                    ? room.photos.map((p: any) => ({
                        url: p.url || '',
                        caption: p.caption || ''
                      }))
                    : accommodationPhotos,
                  max_occupancy: room.max_occupancy || 2,
                  beds: Array.isArray(room.beds) 
                    ? room.beds.map((bed: any) => ({
                        type: bed.type || 'Double',
                        count: bed.count || 1,
                        description: bed.description || `${bed.count || 1} ${bed.type || 'Double'} bed`
                      }))
                    : [{ type: 'Double', count: 1, description: '1 Double bed' }],
                  amenities: Array.isArray(room.amenities) 
                    ? room.amenities 
                    : [],
                  rates: roomRates.map((rate: any) => ({
                    id: rate.id || `rate-${Math.random().toString(36).substr(2, 9)}`,
                    name: rate.name || 'Standard Rate',
                    total_amount: rate.total_amount || '0',
                    total_currency: rate.total_currency || 'USD',
                    board_type: rate.board_type || 'room_only',
                    payment_type: rate.payment_type || 'pay_now',
                    cancellation_policy: rate.cancellation_policy || {
                      type: 'NON_REFUNDABLE',
                      description: 'Non-refundable rate'
                    },
                    conditions: Array.isArray(rate.conditions) ? rate.conditions : [],
                    cancellation_timeline: Array.isArray(rate.cancellation_timeline) 
                      ? rate.cancellation_timeline 
                      : [],
                    available_rooms: rate.quantity_available || rate.available_rooms,
                    max_occupancy: room.max_occupancy || 2,
                    room_size: room.room_size,
                    amenities: room.amenities
                  }))
                };
              })
              .filter(Boolean);
          } else {
            log('No rooms found in fetched rates response');
          }
        } catch (error: any) {
          log('Error fetching rates from search result', {
            error: error?.message,
            searchResultId
          });
        }
      } else {
        log('No valid search result ID found in response', { 
          resultId: searchResultId,
          resultKeys: Object.keys(result)
        });
      }
    }

    // Filter out any null rooms and log the results
    const validRooms = rooms.filter(Boolean);
    log(`Processed ${validRooms.length} valid rooms with rates`, {
      processingTime: `${Date.now() - startTime}ms`
    });

    // Prepare the response data - ensure rooms are at the top level
    const responseData = {
      accommodation: {
        ...result.accommodation,
        photos: accommodationPhotos,
      },
      rooms: validRooms,
      search_parameters: {
        check_in_date: parsedParams.checkInDate,
        check_out_date: parsedParams.checkOutDate,
        rooms: parsedParams.rooms,
        guests: parsedParams.guests,
      },
    };
    
    log('Final response data structure', {
      hasRooms: !!responseData.rooms,
      roomsCount: responseData.rooms?.length || 0,
      accommodationName: responseData.accommodation?.name,
      accommodationPhotosCount: responseData.accommodation?.photos?.length || 0
    });

    // Cache the response
    accommodationCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    // Enforce cache size limit
    if (accommodationCache.size > CONFIG.CACHE.MAX_SIZE) {
      const entries = Array.from(accommodationCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries to maintain size limit
      const toDelete = entries.slice(0, entries.length - CONFIG.CACHE.MAX_SIZE);
      toDelete.forEach(([key]) => accommodationCache.delete(key));
      
      log(`Cache size reduced to ${accommodationCache.size} entries`);
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    log('Unexpected error in hotel details API', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}

/**
 * Clear expired cache entries (optional cleanup function)
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of accommodationCache.entries()) {
    if (now - entry.timestamp > CONFIG.CACHE.TTL) {
      accommodationCache.delete(key);
    }
  }
}

// Optional: Run cache cleanup periodically
if (typeof setInterval !== 'undefined') {
  setInterval(clearExpiredCache, CONFIG.CACHE.TTL);
}