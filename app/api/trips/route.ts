import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BASE_URL = 'https://test.api.amadeus.com/v2';
const AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';

// Cache object to store token and its expiration time
let tokenCache = {
  token: '',
  expiresAt: 0
};

// Ensure this route is dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable revalidation

// We only need the Duffel API token now, no need for OAuth token fetching
async function getAccessToken() {
  console.log('getAccessToken called');

  // If token exists and is not expired, return cached token
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) { // 1 minute buffer
    console.log('Using cached token, expires at:', new Date(tokenCache.expiresAt).toISOString());
    return tokenCache.token;
  }

  console.log('Fetching new token...');

  try {
    // Basic Auth header for token request
    const authHeader = 'Basic ' + Buffer.from(
      `${process.env.AMADEUS_CLIENT_ID}:${process.env.AMADEUS_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token error response:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData
      });
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const data = await tokenResponse.json();

    if (!data.access_token) {
      throw new Error('No access token received in response');
    }

    // Cache the token with its expiration time (default to 30 minutes if not provided)
    const expiresIn = (data.expires_in || 1800) * 1000; // Convert to milliseconds
    const newExpiresAt = Date.now() + expiresIn;
    tokenCache = {
      token: data.access_token,
      expiresAt: newExpiresAt
    };

    console.log('New token obtained, expires at:', new Date(newExpiresAt).toISOString());
    console.log('Token type:', data.token_type || 'Bearer');
    return data.access_token;
  } catch (error) {
    console.error('Token fetch error:', error);
    throw new Error('Authentication failed');
  }
}

export async function GET(request: Request) {
  // No helper functions needed for Kiwi as we're only using Duffel API

  try {
    let token = await getAccessToken();
    // Parse query parameters from the request first
    const urlObj = new URL(request.url);
    const params = urlObj.searchParams;
    
    // Log incoming request parameters
    console.log('Incoming request parameters:', Object.fromEntries(params.entries()));
    
    // Parse and validate dates from params
    const depDateStr = params.get('departureDate');
    const retDateStr = params.get('returnDate');
    
    if (!depDateStr) {
      throw new Error('Departure date is required');
    }
    
    const depDate = new Date(depDateStr);
    if (isNaN(depDate.getTime())) {
      throw new Error('Invalid departure date format');
    }
    
    // For round trips, validate return date
    let retDate: Date | null = null;
    const isRoundTrip = params.get('tripType') === 'roundtrip';
    
    if (isRoundTrip) {
      if (!retDateStr) {
        throw new Error('Return date is required for roundtrip flights');
      }
      
      retDate = new Date(retDateStr);
      if (isNaN(retDate.getTime())) {
        throw new Error('Invalid return date format');
      }
      
      if (retDate <= depDate) {
        throw new Error('Return date must be after departure date');
      }
    }
    
    console.log('Validated search dates:', {
      departureDate: depDate.toISOString(),
      returnDate: retDate?.toISOString() || 'One way',
      tripType: params.get('tripType')
    });
    

  
    // Helper functions for flexible date range
    function formatDate(date: Date): string {
      return date.toISOString().split('T')[0];
    }
    function addDays(date: Date, days: number): Date {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }

    // Get other query parameters
    const origin = params.get('origin') || 'MAD';
    const destination = params.get('destination') || 'PAR';
    const tripType = params.get('tripType') || 'roundtrip';
    const nights = params.get('nights') || '7';
    const travelers = params.get('travelers') || '1';
    
    // Log the travelers count for verification
    console.log('PASSENGER COUNT CHECK: Getting travelers from search params:', {
      rawTravelersParam: params.get('travelers'),
      parsedTravelersCount: travelers,
      numericValue: Number(travelers)
    });
    
    const currency = params.get('currency') || 'EUR';
    const budget = params.get('budget') || '';
    // We always use Duffel API now
    const includeHotels = params.get('includeHotels') === 'true';

    // Flexible window: ±1 day
    const outboundStart = formatDate(new Date(depDate.getTime() - 24 * 60 * 60 * 1000)) + 'T00:00:00';
    const outboundEnd = formatDate(new Date(depDate.getTime() + 24 * 60 * 60 * 1000)) + 'T23:59:59';
    
    let inboundStart = '';
    let inboundEnd = '';
    if (isRoundTrip && retDate) {
      // We've already validated retDate is not null in the isRoundTrip check
      const returnDate = retDate as Date;
      inboundStart = formatDate(new Date(returnDate.getTime() - 24 * 60 * 60 * 1000)) + 'T00:00:00';
      inboundEnd = formatDate(new Date(returnDate.getTime() + 24 * 60 * 60 * 1000)) + 'T23:59:59';
    }

    // Duffel Flights API integration
    // Always use Duffel API
    // Duffel expects IATA codes for origin/destination, and ISO date
    const duffelToken = process.env.DUFFEL_API;
    if (!duffelToken) throw new Error('Duffel API key not set');
    
    // Helper function to format dates in YYYY-MM-DD format (moved to top level)
    
    // Clean origin/destination (remove any "Airport:" prefix if present)
    const cleanCode = (code: string) => code.replace(/^(Airport|City|Country):/, '');
    const cleanOrigin = cleanCode(origin);
    const cleanDestination = cleanCode(destination);
    
    // Build slices for one-way or round-trip
    const slices = [
      {
        origin: cleanOrigin,
        destination: cleanDestination,
        departure_date: formatDate(depDate),
      }
    ];
    
    if (tripType === 'roundtrip' && retDate) {
      slices.push({
        origin: cleanDestination,
        destination: cleanOrigin,
        departure_date: formatDate(retDate),
      });
    }
    
    // Build passenger array
    const passengersArray = [];
    const travelersNum = parseInt(travelers, 10) || 1;
    for (let i = 0; i < travelersNum; i++) {
      passengersArray.push({
        type: 'adult',
      });
    }
    
    // Handle pagination
    const limit = 50; // Default limit
    const after = params.get('after') || undefined; // Pagination cursor
    
    const duffelBody = {
      data: {
        cabin_class: 'economy',
        slices,
        passengers: passengersArray,
        max_connections: 1, // Limit to direct flights
        sort: 'total_amount', // Sort by price
        limit,
        after, // Use the cursor for pagination
      }
    };
    
    console.log('Duffel API request:', JSON.stringify(duffelBody, null, 2));
    // Step 1: Create offer request
    const duffelResp = await fetch('https://api.duffel.com/air/offer_requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        'Duffel-Version': 'v2',
        'Authorization': `Bearer ${duffelToken}`,
      },
      body: JSON.stringify(duffelBody),
    });
    if (!duffelResp.ok) {
      const err = await duffelResp.text();
      console.error('Duffel API error:', err);
      throw new Error('Duffel API error: ' + duffelResp.status);
    }
    const duffelData = await duffelResp.json();
    
    // Log the response for debugging
    console.log('Duffel API response:', {
      status: duffelResp.status,
      statusText: duffelResp.statusText,
      offersCount: duffelData?.data?.offers?.length || 0,
      meta: duffelData?.meta,
      dataKeys: duffelData?.data ? Object.keys(duffelData.data) : []
    });
    console.log('Duffel API raw response:', JSON.stringify(duffelData, null, 2));
    
    // Debug: Check if we have an offers array in the response
    if (duffelData?.data?.offers && Array.isArray(duffelData.data.offers)) {
      console.log(`Found ${duffelData.data.offers.length} offers in the response`);
    }
    if (!duffelData.data || !duffelData.data.id) {
      console.error('Duffel API returned unexpected data structure:', duffelData);
      throw new Error('Duffel API returned unexpected data structure');
    }
    const offerRequestId = duffelData.data.id;

    // Step 2: Fetch offers for this request with increased limit and sorting
    const offersLimit = 50; // Increased limit to get more results
    console.log(`Fetching up to ${offersLimit} offers for request ID: ${offerRequestId}`);
    
    // Add sorting by total_amount and specify the limit
    const offersUrl = `https://api.duffel.com/air/offers?offer_request_id=${offerRequestId}&limit=${offersLimit}&sort=total_amount`;
    console.log('Offers API URL:', offersUrl);
    
    // Log the full request details for debugging
    const requestHeaders = {
      'Accept-Encoding': 'gzip',
      'Duffel-Version': 'v2',
      'Authorization': `Bearer ${duffelToken}`,
    };
    
    console.log('Request headers:', {
      ...requestHeaders,
      'Authorization': 'Bearer ' + requestHeaders.Authorization.substring(0, 20) + '...' // Log only part of the token for security
    });
    
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let offersResp;
    try {
      offersResp = await fetch(offersUrl, {
        method: 'GET',
        headers: requestHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching offers from Duffel:', error);
      throw new Error(`Failed to fetch offers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    if (!offersResp.ok) {
      const err = await offersResp.text();
      console.error('Duffel Offers API error:', err);
      throw new Error('Duffel Offers API error: ' + offersResp.status);
    }
    // Log response headers for debugging
    const responseHeaders: Record<string, string> = {};
    offersResp.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('Duffel API Response Headers:', JSON.stringify(responseHeaders, null, 2));
    
    const offersData = await offersResp.json();
    
    // Debug: Log the raw offers data with metadata
    console.log('Raw offers data from Duffel:', {
      meta: offersData.meta,
      data_length: offersData.data?.length || 0,
      has_more: offersData.meta?.after ? true : false,
      rate_limit: {
        limit: responseHeaders['ratelimit-limit'],
        remaining: responseHeaders['ratelimit-remaining'],
        reset: responseHeaders['ratelimit-reset']
      }
    });
    
    console.log('Number of offers received:', offersData.data?.length || 0);
    
    if (!offersData.data || !Array.isArray(offersData.data)) {
      console.error('Duffel Offers API returned unexpected data structure:', offersData);
      throw new Error('Duffel Offers API returned unexpected data structure');
    }
    
    // Log rate limit information if available
    if (responseHeaders['ratelimit-remaining']) {
      try {
        // Safely parse the reset timestamp
        const resetTime = responseHeaders['ratelimit-reset'];
        let resetTimeFormatted = 'N/A';
        
        if (resetTime) {
          try {
            // First try to parse as a date string
            const resetDate = new Date(resetTime);
            if (!isNaN(resetDate.getTime())) {
              resetTimeFormatted = resetDate.toISOString();
            } else if (/^\d+$/.test(resetTime)) {
              // If it's a timestamp string, parse as number of seconds since epoch
              const timestamp = parseInt(resetTime, 10) * 1000;
              resetTimeFormatted = new Date(timestamp).toISOString();
            }
          } catch (e) {
            console.warn('Failed to format rate limit reset time:', e);
          }
        }
        
        console.log(`Rate limit: ${responseHeaders['ratelimit-remaining']}/${responseHeaders['ratelimit-limit']} remaining, resets at ${resetTimeFormatted}`);
      } catch (dateError) {
        console.warn('Failed to parse rate limit reset time:', dateError);
        console.log(`Rate limit: ${responseHeaders['ratelimit-remaining']}/${responseHeaders['ratelimit-limit']} remaining`);
      }
    }
    
    // Debug: Log each offer ID and price
    console.log('Received offers:');
    offersData.data.forEach((offer: any, index: number) => {
      console.log(`Offer ${index + 1}:`, {
        id: offer.id,
        total: offer.total_amount,
        currency: offer.total_currency,
        segments: offer.slices?.[0]?.segments?.length || 0
      });
    });
    
    // Debug: Log all offer IDs before mapping
    console.log('All offer IDs:', offersData.data.map((o: any) => o.id));
    
    // Process and map all trips without slicing
    let tripData = {
      data: offersData.data.map((offer: any, index: number) => {
        // Debug log for each offer being processed
        console.log(`Processing offer ${index + 1}/${offersData.data.length}:`, {
          id: offer.id,
          total: offer.total_amount,
          slices: offer.slices?.length || 0,
          firstSliceSegments: offer.slices?.[0]?.segments?.length || 0
        });
        // Process each slice (itinerary) in the offer
        const itineraries = (offer.slices || []).map((slice: any) => {
          // Debug log for each slice
          console.log('Processing slice:', {
            duration: slice.duration,
            segmentCount: slice.segments?.length || 0,
            origin: slice.origin?.iata_code,
            destination: slice.destination?.iata_code
          });
          // Process each segment in the slice
          const segments = (slice.segments || []).map((seg: any) => ({
            departure: {
              iataCode: seg.origin?.iata_code || '',
              at: seg.departing_at || '',
              terminal: seg.origin?.terminal || undefined,
            },
            arrival: {
              iataCode: seg.destination?.iata_code || '',
              at: seg.arriving_at || '',
              terminal: seg.destination?.terminal || undefined,
            },
            carrierCode: seg.marketing_carrier?.iata_code || '',
            number: seg.marketing_carrier_flight_number || '',
            aircraft: { code: seg.aircraft?.iata_code || '' },
            operating: seg.operating_carrier ? { carrierCode: seg.operating_carrier.iata_code } : undefined,
          }));
          return {
            duration: slice.duration || '',
            segments: segments
          };
        });
        return {
          id: offer.id,
          price: {
            total: offer.total_amount,
            currency: offer.total_currency
          },
          itineraries: itineraries,
          deep_link: offer.deep_link || ''
        };
      })
    };
    
    // Debug log the final transformed data
    console.log('Transformed trip data count:', tripData.data.length);
    console.log('All transformed trip IDs:', tripData.data.map((t: any) => t.id));
    console.log('Sample transformed trip:', JSON.stringify(tripData.data[0], null, 2));
    
    // Log if any offers were filtered out
    const originalCount = offersData.data?.length || 0;
    const transformedCount = tripData.data.length;
    if (originalCount !== transformedCount) {
      console.warn(`Filtered out ${originalCount - transformedCount} offers (${transformedCount} remaining)`);
    }

    // --- FLIGHT FILTER & SORT LOGIC ---
    // Helper to parse ISO 8601 durations like "PT8H30M" to minutes
    function parseDuration(duration: string): number {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      return (parseInt(match?.[1] || "0") * 60) + parseInt(match?.[2] || "0");
    }
    // Get max stops for all itineraries in a flight offer
    function maxStops(itineraries: any[]): number {
      return Math.max(...itineraries.map(i => (i.segments?.length || 1) - 1));
    }
    // Get total duration (all itineraries combined)
    function totalDuration(itineraries: any[]): number {
      return itineraries.reduce((sum, itin) => sum + parseDuration(itin.duration), 0);
    }
    // Only keep flights with at most 1 stop per direction
    let filteredFlights = (tripData.data || []).filter((flight: any) => maxStops(flight.itineraries) <= 1);
    // Sort by shortest total journey duration
    filteredFlights = filteredFlights.sort((a: any, b: any) => totalDuration(a.itineraries) - totalDuration(b.itineraries));
    // Replace tripData.data with filtered and sorted flights
    tripData.data = filteredFlights;
    // Only fetch hotel offers for all flight options
    let isFirstTrip = true;
    const tripsWithHotels = await Promise.all(
      (tripData.data || []).map(async (trip: any, tripIdx: number) => {
        const destinationCode = trip.itineraries?.[0]?.segments?.[0]?.arrival?.iataCode;
        const checkInDate = formatDate(depDate);
        // Only include checkOutDate for round trips
        const checkOutDate = isRoundTrip && retDate ? formatDate(retDate) : '';
        let hotels: any[] = [];
        try {
          if (includeHotels && destinationCode && checkInDate) {
            // For one-way trips, use a default 1-night stay
            const effectiveCheckOutDate = checkOutDate || formatDate(new Date(depDate.getTime() + 24 * 60 * 60 * 1000));
            
            // Step 1: Fetch hotel IDs for the city
            const hotelsByCityUrl = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${destinationCode}`;
            console.log('Fetching hotel IDs for city:', hotelsByCityUrl);
            const hotelsByCityResp = await fetch(hotelsByCityUrl, {
              headers: {
                'Content-Type': 'application/json',
              },
            });
            const hotelsByCityData = await hotelsByCityResp.json();
            console.log('Hotels by city response:', hotelsByCityData);
            const hotelIds = (hotelsByCityData.data || []).map((h: any) => h.hotelId).slice(0, 20); // Limit to 20 hotel IDs
            if (hotelIds.length > 0) {
              // Step 2: Fetch hotel offers for those IDs
              const hotelParams = new URLSearchParams({
                hotelIds: hotelIds.join(','),
                checkInDate,
                checkOutDate: effectiveCheckOutDate,
                roomQuantity: '1',
                adults: '1',
                bestRateOnly: 'true',
                currency,
              });
              const hotelUrl = `https://test.api.amadeus.com/v3/shopping/hotel-offers?${hotelParams.toString()}`;
              console.log('Fetching hotel offers:', hotelUrl);
              const hotelResp = await fetch(hotelUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              console.log('Hotel API status:', hotelResp.status);
              const hotelData = await hotelResp.json();
              console.log('Hotel API response:', hotelData);
              if (hotelResp.ok && Array.isArray(hotelData.data) && hotelData.data.length > 0) {
                // Flatten all hotel offers
                hotels = hotelData.data.flatMap((hotel: any) => {
                  const rating = hotel?.hotel?.rating ? Number(hotel.hotel.rating) : undefined;
                  const address = hotel?.hotel?.address?.lines ? hotel.hotel.address.lines.join(', ') : hotel?.hotel?.address?.cityName || undefined;
                  const amenities = Array.isArray(hotel?.hotel?.amenities) ? hotel.hotel.amenities : [];
                  return (hotel.offers || []).map((offer: any) => ({
                    price: offer?.price?.total || null,
                    currency: offer?.price?.currency || null,
                    name: hotel?.hotel?.name || null,
                    offerId: offer?.id || null,
                    totalPrice: (offer?.price?.total && trip.price?.total)
                      ? (parseFloat(trip.price.total) + parseFloat(offer.price.total)).toFixed(2)
                      : null,
                    rating,
                    address,
                    amenities,
                  }));
                });
                // Sort by total price (cheapest first)
                hotels = hotels.filter(h => h.price && h.totalPrice).sort((a, b) => parseFloat(a.totalPrice) - parseFloat(b.totalPrice));
              }
            } else {
              console.log('No hotel IDs found for city', destinationCode);
            }
          }
        } catch (err) {
          console.error('Hotel fetch error:', err);
        }

// Fetch sentiment data for only the hotels being returned
if (hotels.length > 0) {
  await Promise.all(hotels.map(async (hotel: any, idx: number) => {
            if (!hotel.offerId) return;
            try {
              const sentimentResp = await fetch(`https://test.api.amadeus.com/v2/e-reputation/hotel-sentiments?hotelIds=${hotel.offerId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (sentimentResp.ok) {
                const sentimentData = await sentimentResp.json();
                console.log('Sentiment API response for', hotel.offerId, ':', sentimentData);
                if (sentimentData.data && Array.isArray(sentimentData.data) && sentimentData.data[0]) {
                  hotel.sentiment = sentimentData.data[0] || null;
                } else {
                  hotel.sentiment = null;
                }
            } 
          }
        catch (err) {
              hotel.sentiment = null;
            }
          }));
        }
        return {
          ...trip,
          hotels: hotels,
          
        };
      })
    );
    // Return the new structure
    return NextResponse.json({
      ...tripData,
      data: tripsWithHotels,
    });
  } catch (error) {
    console.error('Error in GET route:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch trip data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}