/**
 * Hotel Details API Route
 * 
 * This API endpoint provides detailed hotel information including room types,
 * rates, amenities, and booking options. It integrates with the Duffel API
 * to fetch real-time hotel data and provides fallback rate generation when
 * detailed rates are not available.
 * 
 * Features:
 * - Comprehensive error handling and logging
 * - Rate limiting and security measures
 * - Intelligent caching with TTL
 * - Fallback rate generation with multiple options
 * - Input validation and sanitization
 * - Support for multiple rate plans and cancellation policies
 * 
 * @fileoverview Hotel details API with fallback rate generation
 * @author Where2 Development Team
 * @version 1.0.0
 */

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
  FALLBACK_RATES: {
    STANDARD: {
      PRICE_MULTIPLIER: 1.0,
      FLEXIBILITY_MULTIPLIER: 1.1, // 10% higher for flexibility
      PREMIUM_MULTIPLIER: 1.2, // 20% higher for premium
    },
    CANCELLATION: {
      FLEXIBLE_HOURS: 24,
      PREMIUM_HOURS: 48,
    },
    AMENITIES: {
      STANDARD: ['wifi', 'tv'],
      FLEXIBLE: ['wifi', 'tv', 'room_service'],
      PREMIUM: ['wifi', 'tv', 'room_service', 'breakfast', 'concierge'],
    },
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
 * Transform room data with proper rate information and improved rate handling
 * @param room - Room data object from API response
 * @param rates - Array of rate data objects
 * @param accommodationPhotos - Array of accommodation photos to use as fallback
 * @returns Transformed room object with proper rate structure
 */
function transformRoomData(room: any, rates: any[], accommodationPhotos: any[] = []): any {
  console.log('🔄 Transforming room data:', {
    roomId: room.id,
    roomName: room.name,
    ratesCount: rates.length,
    hasPhotos: !!(room.photos || accommodationPhotos).length
  });

  // If room is actually a rate (happens when we group rates as rooms)
  if (room.rate_plan_code || room.total_amount) {
    console.log('📋 Room is actually a rate, creating single-rate room');
    return {
      id: room.id || `room_${Date.now()}`,
      name: room.name || room.rate_plan_code || 'Standard Room',
      description: room.description || 'Room with various rate options',
      photos: (room.photos || accommodationPhotos || []).map((photo: any) => ({
        url: photo.url || '',
        caption: photo.caption || '',
      })),
      beds: room.beds || [{ type: 'queen', count: 1, description: 'Queen bed' }],
      max_occupancy: room.max_occupancy || room.occupancy?.max_guests || 2,
      room_size: room.size,
      amenities: (room.amenities || []).map((a: any) => ({
        type: a.type || '',
        description: a.description || '',
      })),
      rates: [{
        id: room.id || `rate_${Date.now()}`,
        rate_plan_code: room.rate_plan_code || 'STANDARD',
        name: room.name || 'Standard Rate',
        description: room.description || '',
        total_amount: room.total_amount?.toString() || '0',
        total_currency: room.total_currency || room.currency || 'USD',
        public_amount: room.public_amount?.toString() || room.total_amount?.toString() || '0',
        board_type: room.board_type || 'room_only',
        payment_type: room.payment_type || 'pay_at_hotel',
        cancellation_timeline: Array.isArray(room.cancellation_timeline) 
          ? room.cancellation_timeline 
          : [],
        cancellation_policy: room.cancellation_policy || {
          type: 'NON_REFUNDABLE',
          description: 'Non-refundable rate'
        },
        conditions: Array.isArray(room.conditions) ? room.conditions : [],
        available_rooms: room.available_rooms,
        max_occupancy: room.max_occupancy || room.occupancy?.max_guests || 2,
        room_size: room.size,
        amenities: room.amenities || [],
        photos: room.photos || [],
        price_breakdown: room.price_breakdown || {
          base: room.total_amount?.toString() || '0',
          tax: '0',
          total: room.total_amount?.toString() || '0',
          currency: room.total_currency || 'USD',
        },
      }],
    };
  }

  // Original room transformation logic with improved rate matching
  console.log('🔍 Finding rates for room:', room.id);
  
  // Try multiple ways to match rates to rooms
  let roomRates = rates.filter(rate => {
    // Direct room ID match
    if (rate.room_id === room.id) return true;
    // Room type match
    if (rate.room_type === room.name || rate.room_type_id === room.id) return true;
    // Room name match
    if (rate.room_name === room.name) return true;
    // If no specific room info, include all rates
    if (!rate.room_id && !rate.room_type && !rate.room_name) return true;
    return false;
  });

  // If no specific rates found for this room, use all available rates
  const applicableRates = roomRates.length > 0 ? roomRates : rates;
  
  console.log(`📊 Found ${applicableRates.length} rates for room ${room.id}`);

  // Transform rates with better error handling
  const transformedRates = applicableRates.map((rate, index) => {
    try {
      return {
        id: rate.id || `rate_${Date.now()}_${index}`,
        rate_plan_code: rate.rate_plan_code || 'STANDARD',
        name: rate.name || rate.description || rate.rate_plan_name || 'Standard Rate',
        description: rate.description || '',
        total_amount: rate.total_amount?.toString() || '0',
        total_currency: rate.total_currency || rate.currency || 'USD',
        public_amount: rate.public_amount?.toString() || rate.total_amount?.toString() || '0',
        board_type: rate.board_type || 'room_only',
        payment_type: rate.payment_type || 'pay_at_hotel',
        cancellation_timeline: Array.isArray(rate.cancellation_timeline)
          ? rate.cancellation_timeline
          : [],
        cancellation_policy: rate.cancellation_policy || {
          type: 'NON_REFUNDABLE',
          description: 'Non-refundable rate'
        },
        conditions: Array.isArray(rate.conditions) ? rate.conditions : [],
        available_rooms: rate.available_rooms,
        max_occupancy: rate.max_occupancy || room.max_occupancy || 2,
        room_size: rate.room_size || room.size,
        amenities: rate.amenities || room.amenities || [],
        photos: rate.photos || room.photos || [],
        price_breakdown: rate.price_breakdown || {
          base: rate.total_amount?.toString() || '0',
          tax: '0',
          total: rate.total_amount?.toString() || '0',
          currency: rate.total_currency || rate.currency || 'USD',
        },
      };
    } catch (error) {
      console.error('❌ Error transforming rate:', error, rate);
      return {
        id: `rate_error_${Date.now()}_${index}`,
        rate_plan_code: 'ERROR',
        name: 'Error loading rate',
        description: 'There was an error loading this rate',
        total_amount: '0',
        total_currency: 'USD',
        public_amount: '0',
        board_type: 'room_only',
        payment_type: 'pay_at_hotel',
        cancellation_timeline: [],
        cancellation_policy: {
          type: 'NON_REFUNDABLE',
          description: 'Non-refundable rate'
        },
        conditions: [],
        available_rooms: 0,
        max_occupancy: 2,
        room_size: null,
        amenities: [],
        photos: [],
        price_breakdown: {
          base: '0',
          tax: '0',
          total: '0',
          currency: 'USD',
        },
      };
    }
  });

  console.log(`✅ Transformed ${transformedRates.length} rates for room ${room.id}`);

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
    max_occupancy: room.max_occupancy || room.occupancy?.max_guests || 2,
    room_size: room.size || null,
    amenities: (room.amenities || []).map((amenity: any) => ({
      type: amenity.type || '',
      description: amenity.description || '',
    })),
    rates: transformedRates,
  };
}

/**
 * Fetch rates for a search result with improved error handling and logging
 * @param searchResultId - Duffel search result identifier
 * @returns Promise resolving to array of rate objects
 */
async function fetchRates(searchResultId: string): Promise<any[]> {
  try {
    console.log('🔍 Fetching rates for search result:', searchResultId);
    
    // Fetch rates from Duffel API with proper typing
    const response = await duffel.stays.searchResults.fetchAllRates(searchResultId);
    console.log('📊 Raw rates response structure:', {
      isArray: Array.isArray(response),
      hasData: response && typeof response === 'object' && 'data' in response,
      hasRecords: response && typeof response === 'object' && 'records' in response,
      keys: response && typeof response === 'object' ? Object.keys(response) : 'N/A'
    });

    // Type guard to check if response has data property
    const hasData = (r: any): r is { data: any[] } => 
      r && typeof r === 'object' && 'data' in r && Array.isArray(r.data);

    // Type guard to check if response has records property
    const hasRecords = (r: any): r is { records: any[] } => 
      r && typeof r === 'object' && 'records' in r && Array.isArray(r.records);

    // Handle different response formats with better logging
    if (Array.isArray(response)) {
      console.log(`✅ Found ${response.length} rates (direct array)`);
      if (response.length > 0) {
        console.log('📋 Sample rate structure:', JSON.stringify(response[0], null, 2));
      }
      return response;
    }

    // Handle response with data property
    if (hasData(response)) {
      console.log(`✅ Found ${response.data.length} rates (response.data)`);
      if (response.data.length > 0) {
        console.log('📋 Sample rate structure:', JSON.stringify(response.data[0], null, 2));
      }
      return response.data;
    }

    // Handle paginated response with records
    if (hasRecords(response)) {
      console.log(`✅ Found ${response.records.length} rates (paginated)`);
      if (response.records.length > 0) {
        console.log('📋 Sample rate structure:', JSON.stringify(response.records[0], null, 2));
      }
      return response.records;
    }

    // Handle case where rates might be in a nested structure
    const nestedData = response as any;
    if (nestedData?.data?.rates && Array.isArray(nestedData.data.rates)) {
      console.log(`✅ Found ${nestedData.data.rates.length} rates (nested data.rates)`);
      if (nestedData.data.rates.length > 0) {
        console.log('📋 Sample rate structure:', JSON.stringify(nestedData.data.rates[0], null, 2));
      }
      return nestedData.data.rates;
    }

    // Additional nested structure checks
    if (nestedData?.rates && Array.isArray(nestedData.rates)) {
      console.log(`✅ Found ${nestedData.rates.length} rates (nested rates)`);
      if (nestedData.rates.length > 0) {
        console.log('📋 Sample rate structure:', JSON.stringify(nestedData.rates[0], null, 2));
      }
      return nestedData.rates;
    }

    // Check for supported_negotiated_rates (empty array case)
    if (nestedData?.supported_negotiated_rates && Array.isArray(nestedData.supported_negotiated_rates)) {
      console.log(`📊 Found supported_negotiated_rates array with ${nestedData.supported_negotiated_rates.length} rates`);
      if (nestedData.supported_negotiated_rates.length > 0) {
        console.log('📋 Sample rate structure:', JSON.stringify(nestedData.supported_negotiated_rates[0], null, 2));
        return nestedData.supported_negotiated_rates;
      } else {
        console.log('⚠️ supported_negotiated_rates is empty, but we have rate summary data');
        // Even if negotiated rates are empty, we might have rate summary data
        // Let's check if we can create rates from the summary data
        if (nestedData.cheapest_rate_total_amount) {
          console.log('🔄 Creating rate from summary data');
          return [{
            id: `summary_rate_${Date.now()}`,
            rate_plan_code: 'SUMMARY',
            name: 'Available Rate',
            description: 'Rate based on summary data',
            total_amount: nestedData.cheapest_rate_total_amount?.toString() || '0',
            total_currency: nestedData.cheapest_rate_currency || nestedData.cheapest_rate_public_currency || 'USD',
            public_amount: nestedData.cheapest_rate_public_amount?.toString() || nestedData.cheapest_rate_total_amount?.toString() || '0',
            board_type: 'room_only',
            payment_type: 'pay_at_hotel',
            cancellation_timeline: [],
            cancellation_policy: {
              type: 'NON_REFUNDABLE',
              description: 'Non-refundable rate'
            },
            conditions: [],
            available_rooms: 1,
            max_occupancy: 2,
            room_size: null,
            amenities: [],
            photos: [],
            price_breakdown: {
              base: nestedData.cheapest_rate_base_amount?.toString() || nestedData.cheapest_rate_total_amount?.toString() || '0',
              tax: '0',
              total: nestedData.cheapest_rate_total_amount?.toString() || '0',
              currency: nestedData.cheapest_rate_currency || nestedData.cheapest_rate_public_currency || 'USD',
            },
          }];
        }
      }
    }

    // If we get here, log the structure for debugging
    console.warn('⚠️ Could not find rates in the response. Response structure:', {
      type: typeof response,
      isArray: Array.isArray(response),
      keys: response && typeof response === 'object' ? Object.keys(response) : 'N/A',
      sample: response ? JSON.stringify(response, null, 2).substring(0, 500) + '...' : 'null'
    });
    return [];

  } catch (error) {
    console.error('❌ Error in fetchRates:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if ('meta' in error) {
        console.error('Error meta:', (error as any).meta);
      }
      if ('status' in error) {
        console.error('Error status:', (error as any).status);
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
    cancellation_policy: {
      type: 'NON_REFUNDABLE',
      description: 'Non-refundable rate'
    },
    conditions: [],
    available_rooms: 1,
    max_occupancy: 2,
    room_size: null,
    amenities: [],
    photos: [],
    price_breakdown: {
      base: cheapestRate.total_amount || '0',
      tax: '0',
      total: cheapestRate.total_amount || '0',
      currency: cheapestRate.currency || 'USD',
    },
  };
}

/**
 * Rate plan configuration for fallback rates
 */
interface RatePlanConfig {
  code: string;
  name: string;
  description: string;
  priceMultiplier: number;
  boardType: string;
  cancellationPolicy: {
    type: 'NON_REFUNDABLE' | 'FREE_CANCELLATION';
    description: string;
    hoursBeforeCheckIn?: number;
  };
  conditions: Array<{
    title: string;
    description: string;
  }>;
  amenities: string[];
}

/**
 * Rate plan configurations for different booking options
 */
const RATE_PLANS: RatePlanConfig[] = [
  {
    code: 'STANDARD',
    name: 'Standard Rate',
    description: 'Best value - non-refundable',
    priceMultiplier: CONFIG.FALLBACK_RATES.STANDARD.PRICE_MULTIPLIER,
    boardType: 'room_only',
    cancellationPolicy: {
      type: 'NON_REFUNDABLE',
      description: 'Non-refundable rate'
    },
    conditions: [
      {
        title: 'Cancellation Policy',
        description: 'This rate is non-refundable and cannot be cancelled or modified.'
      }
    ],
    amenities: [...CONFIG.FALLBACK_RATES.AMENITIES.STANDARD]
  },
  {
    code: 'FLEXIBLE',
    name: 'Flexible Rate',
    description: `Free cancellation until ${CONFIG.FALLBACK_RATES.CANCELLATION.FLEXIBLE_HOURS} hours before check-in`,
    priceMultiplier: CONFIG.FALLBACK_RATES.STANDARD.FLEXIBILITY_MULTIPLIER,
    boardType: 'room_only',
    cancellationPolicy: {
      type: 'FREE_CANCELLATION',
      description: 'Free cancellation available',
      hoursBeforeCheckIn: CONFIG.FALLBACK_RATES.CANCELLATION.FLEXIBLE_HOURS
    },
    conditions: [
      {
        title: 'Cancellation Policy',
        description: `Free cancellation until ${CONFIG.FALLBACK_RATES.CANCELLATION.FLEXIBLE_HOURS} hours before check-in. After that, this rate becomes non-refundable.`
      }
    ],
    amenities: [...CONFIG.FALLBACK_RATES.AMENITIES.FLEXIBLE]
  },
  {
    code: 'PREMIUM',
    name: 'Premium Rate',
    description: 'Premium experience with breakfast included',
    priceMultiplier: CONFIG.FALLBACK_RATES.STANDARD.PREMIUM_MULTIPLIER,
    boardType: 'bed_and_breakfast',
    cancellationPolicy: {
      type: 'FREE_CANCELLATION',
      description: 'Free cancellation available',
      hoursBeforeCheckIn: CONFIG.FALLBACK_RATES.CANCELLATION.PREMIUM_HOURS
    },
    conditions: [
      {
        title: 'Cancellation Policy',
        description: `Free cancellation until ${CONFIG.FALLBACK_RATES.CANCELLATION.PREMIUM_HOURS} hours before check-in. After that, this rate becomes non-refundable.`
      },
      {
        title: 'Meal Plan',
        description: 'Breakfast included in the rate.'
      }
    ],
    amenities: [...CONFIG.FALLBACK_RATES.AMENITIES.PREMIUM]
  }
];

/**
 * Create multiple fallback rates from rate summary data
 * @param rateData - Rate summary data from Duffel API
 * @param accommodationId - Accommodation identifier
 * @returns Array of fallback rate objects
 */
function createMultipleFallbackRates(rateData: any, accommodationId: string): any[] {
  const baseAmount = parseFloat(rateData.total_amount || '0');
  const currency = rateData.currency || 'USD';
  const timestamp = Date.now();
  
  return RATE_PLANS.map((plan, index) => {
    const calculatedAmount = baseAmount * plan.priceMultiplier;
    const cancellationTimeline = plan.cancellationPolicy.hoursBeforeCheckIn 
      ? [{
          refund_amount: calculatedAmount.toString(),
          currency: currency,
          before: new Date(Date.now() + plan.cancellationPolicy.hoursBeforeCheckIn * 60 * 60 * 1000).toISOString()
        }]
      : [];

    return {
      id: `rate_${plan.code.toLowerCase()}_${accommodationId}_${timestamp}`,
      rate_plan_code: plan.code,
      name: plan.name,
      description: plan.description,
      total_amount: calculatedAmount.toString(),
      total_currency: currency,
      public_amount: calculatedAmount.toString(),
      board_type: plan.boardType,
      payment_type: 'pay_at_hotel',
      cancellation_timeline: cancellationTimeline,
      cancellation_policy: plan.cancellationPolicy,
      conditions: plan.conditions,
      available_rooms: 1,
      max_occupancy: 2,
      room_size: null,
      amenities: plan.amenities,
      photos: [],
      price_breakdown: {
        base: calculatedAmount.toString(),
        tax: '0',
        total: calculatedAmount.toString(),
        currency: currency,
      },
    };
  });
}

/**
 * Main GET handler for hotel details API
 * 
 * Handles hotel details requests with comprehensive error handling, rate limiting,
 * caching, and fallback rate generation when Duffel API doesn't provide detailed rates.
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
) {
  console.log('=== Hotel Details API Request ===');
  console.log('Raw ID parameter:', params.id);

  try {
    // Input validation and sanitization
    if (!params.id || typeof params.id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid ID parameter',
        },
        { status: 400 }
      );
    }

    // Sanitize the ID parameter to prevent injection attacks
    const sanitizedId = params.id.replace(/[^a-zA-Z0-9:._-]/g, '');
    if (sanitizedId !== params.id) {
      console.warn('⚠️ ID parameter contained invalid characters, sanitized');
    }

    // Parse the ID parameter
    const parsedParams = parseIdParameter(sanitizedId);
    console.log('Parsed parameters:', parsedParams);

    // Validate required parameters
    if (!parsedParams.accommodationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Accommodation ID is required',
        },
        { status: 400 }
      );
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(parsedParams.checkInDate) || !dateRegex.test(parsedParams.checkOutDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    // Validate numeric parameters
    if (parsedParams.rooms < 1 || parsedParams.rooms > 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Number of rooms must be between 1 and 10',
        },
        { status: 400 }
      );
    }

    if (parsedParams.guests < 1 || parsedParams.guests > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'Number of guests must be between 1 and 20',
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
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimitCheck.retryAfter} seconds.`,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupExpiredEntries();
    }

    // Check cache
    const cacheKey = generateCacheKey(parsedParams);
    const cached = accommodationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE.TTL) {
      console.log('✅ Returning cached data');
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    // Fetch fresh data from Duffel API with improved error handling
    console.log('🔍 Fetching accommodation from Duffel...');
    
    let searchResult: any;
    try {
      searchResult = await duffel.stays.search({
        accommodation: {
          ids: [parsedParams.accommodationId],
        },
        check_in_date: parsedParams.checkInDate,
        check_out_date: parsedParams.checkOutDate,
        rooms: parsedParams.rooms,
        guests: Array(parsedParams.guests).fill({ type: 'adult' }),
      });
    } catch (duffelError: any) {
      console.error('❌ Duffel API error:', duffelError);
      
      // Handle specific Duffel API errors
      if (duffelError?.meta?.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
          },
          { status: 429 }
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

    // Fetch rates with improved logic
    let rates: any[] = [];
    
    if (parsedParams.searchResultId) {
      console.log('🔍 Fetching rates using search result ID:', parsedParams.searchResultId);
      rates = await fetchRates(parsedParams.searchResultId);
      console.log(`📊 Retrieved ${rates.length} rates from search result`);
    }

    // CRITICAL: If no rates from search result, try multiple fallback strategies
    if (rates.length === 0) {
      console.log('⚠️ No rates from search result, trying fallback strategies...');
      
      // Strategy 1: Try to get rates from the matching result
      const matchingResultWithRates = matchingResult as any;
      if (matchingResultWithRates.rates && Array.isArray(matchingResultWithRates.rates)) {
        console.log(`✅ Found ${matchingResultWithRates.rates.length} rates in search result`);
        rates = matchingResultWithRates.rates;
      }
      // Strategy 2: Try to get the search result ID from the response to fetch rates
      else if (matchingResult.id) {
        console.log('🔄 Attempting to fetch rates using result ID from response:', matchingResult.id);
        const fetchedRates = await fetchRates(matchingResult.id);
        if (fetchedRates.length > 0) {
          rates = fetchedRates;
          console.log(`✅ Retrieved ${rates.length} rates using result ID`);
        }
      }
      // Strategy 3: Check if rates are embedded in the accommodation
      else if (matchingResult.accommodation?.rates && Array.isArray(matchingResult.accommodation.rates)) {
        console.log(`✅ Found ${matchingResult.accommodation.rates.length} rates in accommodation`);
        rates = matchingResult.accommodation.rates;
      }
      // Strategy 4: Check if rates are in a different property
      else if (matchingResult.room_rates && Array.isArray(matchingResult.room_rates)) {
        console.log(`✅ Found ${matchingResult.room_rates.length} room rates`);
        rates = matchingResult.room_rates;
      }
    }

    // Fallback: Create multiple rates from cheapest_rate data if available
    if (rates.length === 0 && matchingResult.cheapest_rate_total_amount) {
      console.log('⚠️ Creating multiple fallback rates from cheapest_rate data');
      rates = createMultipleFallbackRates(
        {
          total_amount: matchingResult.cheapest_rate_total_amount,
          currency: matchingResult.cheapest_rate_currency || 'USD',
          public_amount: matchingResult.cheapest_rate_public_amount,
          public_currency: matchingResult.cheapest_rate_public_currency,
        },
        parsedParams.accommodationId
      );
      console.log(`✅ Created ${rates.length} fallback rates`);
    }

    // Additional fallback: Check if we have any rate-related data in the search result
    if (rates.length === 0) {
      console.log('🔍 Checking for additional rate data in search result...');
      
      // Check for any rate-related fields in the search result
      const rateFields = [
        'rates', 'room_rates', 'available_rates', 'rate_plans', 
        'pricing', 'price_data', 'rate_data', 'booking_options'
      ];
      
      for (const field of rateFields) {
        if (matchingResult[field] && Array.isArray(matchingResult[field]) && matchingResult[field].length > 0) {
          console.log(`✅ Found rates in field: ${field} (${matchingResult[field].length} rates)`);
          rates = matchingResult[field];
          break;
        }
      }
      
      // If still no rates, check accommodation level
      if (rates.length === 0 && matchingResult.accommodation) {
        for (const field of rateFields) {
          if (matchingResult.accommodation[field] && Array.isArray(matchingResult.accommodation[field]) && matchingResult.accommodation[field].length > 0) {
            console.log(`✅ Found rates in accommodation.${field} (${matchingResult.accommodation[field].length} rates)`);
            rates = matchingResult.accommodation[field];
            break;
          }
        }
      }
    }

    console.log(`📊 Total rates available: ${rates.length}`);

    // Transform accommodation data
    const accommodationPhotos = matchingResult.accommodation.photos || [];
    
    // Process rooms and rates with improved logic
    let rooms: any[] = [];
    
    console.log(`🏨 Processing rooms and rates. Rooms available: ${Array.isArray(matchingResult.rooms) ? matchingResult.rooms.length : 0}, Rates available: ${rates.length}`);
    
    // First, check if we have direct room data in the search result
    if (Array.isArray(matchingResult.rooms) && matchingResult.rooms.length > 0) {
      console.log(`✅ Found ${matchingResult.rooms.length} rooms in search result`);
      
      // Process each room and its rates
      rooms = matchingResult.rooms.map((room: any, index: number) => {
        console.log(`🔄 Processing room ${index + 1}/${matchingResult.rooms.length}: ${room.name || room.id}`);
        
        // Find rates that match this room with improved matching logic
        const roomRates = rates.filter(rate => {
          // Direct room ID match
          if (rate.room_id === room.id) return true;
          // Room type match
          if (rate.room_type === room.name || rate.room_type_id === room.id) return true;
          // Room name match
          if (rate.room_name === room.name) return true;
          // Accommodation match
          if (rate.accommodation_id === matchingResult.accommodation.id) return true;
          return false;
        });
        
        console.log(`📊 Found ${roomRates.length} rates for room ${room.name || room.id}`);
        
        // If no specific rates found for this room, use all available rates
        const ratesToUse = roomRates.length > 0 ? roomRates : rates;
        
        return transformRoomData(room, ratesToUse, accommodationPhotos);
      });
    }
    // If no rooms but we have rates, create rooms from rate data
    else if (rates.length > 0) {
      console.log('⚠️ No direct room data, creating rooms from rates');
      
      // Group rates by room type with improved logic
      const ratesByRoomType = new Map<string, any[]>();
      
      rates.forEach((rate, index) => {
        // For fallback rates, we want to group them all into a single room
        // unless they have different room types
        const roomType = rate.room_type || 
                        rate.room_type_name || 
                        rate.room_name ||
                        'Standard Room'; // Use a consistent room type for fallback rates
        
        // Create a consistent room ID for fallback rates
        const roomId = rate.room_id || 
                      rate.room_type_id || 
                      'room_standard'; // Use consistent ID for fallback rates
        
        if (!ratesByRoomType.has(roomId)) {
          ratesByRoomType.set(roomId, []);
        }
        ratesByRoomType.get(roomId)!.push(rate);
      });
      
      console.log(`📦 Grouped rates into ${ratesByRoomType.size} room types`);
      
      // Create a single room with all rates
      console.log(`🔄 Creating single room with ${rates.length} rate options`);
      
      // Use the first rate to get room details, but include all rates
      const sampleRate = rates[0];
      
      rooms = [
        transformRoomData(
          {
            id: 'room_standard',
            name: sampleRate.room_type_name || 
                  sampleRate.room_type || 
                  'Standard Room',
            description: sampleRate.room_description || 
                        'Room with multiple rate options',
            photos: accommodationPhotos,
            max_occupancy: sampleRate.max_occupancy || 2,
            beds: sampleRate.beds || [{ type: 'queen', count: 1, description: 'Queen bed' }],
          },
          rates, // Pass all rates to the single room
          accommodationPhotos
        )
      ];
    }
    // Fallback: Create a default room if no rooms or rates are available
    else {
      console.log('⚠️ No rooms or rates available, creating default room');
      rooms = [
        transformRoomData(
          {
            id: 'room_default',
            name: 'Standard Room',
            description: 'Standard accommodation',
            photos: accommodationPhotos,
            max_occupancy: 2,
            beds: [{ type: 'queen', count: 1, description: 'Queen bed' }],
          },
          [],
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
    if (now - entry.timestamp > CONFIG.CACHE.TTL) {
      accommodationCache.delete(key);
    }
  }
}

// Optional: Run cache cleanup periodically
if (typeof setInterval !== 'undefined') {
  setInterval(clearExpiredCache, CONFIG.CACHE.TTL);
}