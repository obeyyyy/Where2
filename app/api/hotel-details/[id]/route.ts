// app/api/hotel-details/[id]/route.ts
import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

// Simple in-memory cache to store accommodation details
const accommodationCache = new Map<string, { 
  data: any; 
  timestamp: number;
}>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Parse the ID which can be either:
    // 1. Just the accommodationId (legacy format)
    // 2. searchResultId:accommodationId:checkInDate:checkOutDate:rooms:guests (new format)
    let searchResultId: string | null = null;
    let accommodationId: string;
    let checkInDate: string | null = null;
    let checkOutDate: string | null = null;
    let rooms: string | number = '1';
    let guests: string | number = '1';

    // Check if the ID is in the new format with colons
    if (params.id.includes(':')) {
      const parts = params.id.split(':');
      if (parts.length >= 2) {
        [searchResultId, accommodationId, checkInDate, checkOutDate, rooms, guests] = parts;
      } else {
        accommodationId = params.id;
      }
    } else {
      accommodationId = params.id;
    }
    
    if (!accommodationId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Accommodation ID is required' 
        },
        { status: 400 }
      );
    }

    // Prepare search parameters
    const today = new Date();
    const defaultCheckIn = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultCheckOut = tomorrow.toISOString().split('T')[0];
    const numRooms = parseInt(rooms as string) || 1;
    const numGuests = parseInt(guests as string) || 1;

    // Generate cache key
    const cacheKey = searchResultId 
      ? `${searchResultId}:${accommodationId}:${checkInDate}:${checkOutDate}:${numRooms}:${numGuests}`
      : accommodationId;

    // Check cache first
    const cached = accommodationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    try {
      console.log('Fetching hotel details from Duffel API...');
      console.log('Accommodation ID:', accommodationId);
      console.log('Check-in date:', checkInDate || defaultCheckIn);
      console.log('Check-out date:', checkOutDate || defaultCheckOut);
      
      // Get the search result with offers
      const searchResult = await duffel.stays.search({
        accommodation: {
          ids: [accommodationId]
        },
        check_in_date: checkInDate || defaultCheckIn,
        check_out_date: checkOutDate || defaultCheckOut,
        rooms: numRooms,
        guests: Array(numGuests).fill({ type: 'adult' })
      });
      
      console.log('Duffel API response:', JSON.stringify(searchResult, null, 2));
      
      // Find the matching search result
      const matchingResult = searchResult.data?.results?.[0];
      
      if (!matchingResult || !matchingResult.accommodation) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Accommodation not found',
            details: 'No matching accommodation found in search results'
          },
          { status: 404 }
        );
      }

      // Prepare rates
      let rates: any[] = [];
      if (matchingResult.cheapest_rate_total_amount) {
        rates = [{
          id: `rate_${Date.now()}`,
          rate_plan_code: 'STANDARD',
          name: 'Standard Rate',
          total_amount: matchingResult.cheapest_rate_total_amount,
          total_currency: matchingResult.cheapest_rate_currency || 'EUR',
          public_amount: matchingResult.cheapest_rate_public_amount || matchingResult.cheapest_rate_total_amount,
          board_type: 'room_only',
          payment_type: 'pay_at_hotel',
          cancellation_timeline: [],
          conditions: []
        }];
      }

      // Transform the accommodation data to match frontend expectations
      const transformedData = {
        accommodation: {
          id: matchingResult.accommodation.id,
          name: matchingResult.accommodation.name,
          description: matchingResult.accommodation.description || 'No description available',
          photos: (matchingResult.accommodation.photos || []).map((photo: any) => ({
            url: photo.url || ''
          })),
          rating: matchingResult.accommodation.rating,
          review_score: matchingResult.accommodation.review_score,
          location: {
            address: {
              city_name: matchingResult.accommodation.location?.address?.city_name || 'Unknown',
              country_code: matchingResult.accommodation.location?.address?.country_code || '',
              line_one: matchingResult.accommodation.location?.address?.line_one || '',
              postal_code: matchingResult.accommodation.location?.address?.postal_code || '',
              region: matchingResult.accommodation.location?.address?.region || ''
            },
            geographic_coordinates: matchingResult.accommodation.location?.geographic_coordinates
          },
          amenities: (matchingResult.accommodation.amenities || []).map((a: any) => ({
            type: a.type || '',
            description: a.description || ''
          })),
          check_in_information: matchingResult.accommodation.check_in_information || {
            check_in_after_time: '14:00',
            check_in_before_time: '23:59',
            check_out_before_time: '12:00'
          },
          phone_number: matchingResult.accommodation.phone_number,
          email: matchingResult.accommodation.email
        },
        rooms: [{
          name: 'Standard Room',
          photos: (matchingResult.accommodation.photos || []).map((photo: any) => ({
            url: photo.url || ''
          })),
          beds: [{ type: 'queen', count: 1 }],
          rates: rates.map((rate: any) => ({
            id: rate.id || `rate_${Date.now()}`,
            code: rate.rate_plan_code || 'STANDARD',
            name: rate.name || 'Standard Rate',
            total_amount: rate.total_amount?.toString() || '0',
            total_currency: rate.total_currency || 'EUR',
            public_amount: rate.public_amount?.toString() || rate.total_amount?.toString() || '0',
            board_type: rate.board_type || 'room_only',
            payment_type: rate.payment_type || 'pay_at_hotel',
            cancellation_timeline: rate.cancellation_timeline || [],
            conditions: rate.conditions || [],
            // Add price breakdown if available
            price_breakdown: rate.price_breakdown || {
              base: rate.total_amount?.toString() || '0',
              tax: '0',
              total: rate.total_amount?.toString() || '0',
              currency: rate.total_currency || 'EUR'
            }
          }))
        }],
        check_in_date: checkInDate || defaultCheckIn,
        check_out_date: checkOutDate || defaultCheckOut
      };

      // Cache the result
      accommodationCache.set(cacheKey, {
        data: transformedData,
        timestamp: Date.now(),
      });
      
      return NextResponse.json({
        success: true,
        data: transformedData
      });
      
    } catch (error) {
      console.error('Error fetching hotel details from Duffel API:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch hotel details',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in hotel details API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}