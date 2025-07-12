import { NextResponse } from 'next/server';
import { Duffel } from '@duffel/api';
import { duffel } from '@/lib/duffel';
import type { StaysSearchParams, Guest } from '@duffel/api/Stays/StaysTypes';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      location, 
      checkInDate, 
      checkOutDate, 
      rooms, 
      guests 
    } = body;

    console.log('Hotel search request parameters:', { location, checkInDate, checkOutDate, rooms, guests });

    if (!location || !checkInDate || !checkOutDate || !rooms || !guests) {
      console.log('Missing required parameters:', { location, checkInDate, checkOutDate, rooms, guests });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Format guests for Duffel API
    const formattedGuests = formatGuests(guests);
    
    // Determine if we're searching by coordinates or accommodation ID
    let searchParams: any; // Using any temporarily to avoid type issues
    
    if (location.includes(',')) {
      // Location is coordinates (lat,lng)
      const [latitude, longitude] = location.split(',').map((coord: string) => parseFloat(coord.trim()));
      
      searchParams = {
        location: {
          radius: 5, // 5km radius
          geographic_coordinates: { latitude, longitude }
        },
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        rooms: parseInt(rooms, 10),
        guests: formattedGuests
      };
    } else {
      // Location is an accommodation ID
      searchParams = {
        accommodation: {
          ids: [location]
        },
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        rooms: parseInt(rooms, 10),
        guests: formattedGuests
      };
    }

    console.log('Duffel API search parameters:', JSON.stringify(searchParams, null, 2));

    try {
      // Call Duffel Stays API to search for hotels
      
      const searchResponse = await duffel.stays.search(searchParams);
      
      console.log(`Search successful. Found ${searchResponse.data.results?.length || 0} results`);
      
      return NextResponse.json({
        success: true,
        results: searchResponse.data.results
      });
    } catch (duffelError: any) {
      console.error('Duffel API error:', duffelError);
      
      // Try to extract more detailed error information
      let errorDetails = 'Unknown Duffel API error';
      
      if (duffelError.errors && Array.isArray(duffelError.errors)) {
        errorDetails = duffelError.errors.map((e: any) => e.message || e.title).join(', ');
      } else if (duffelError.meta && duffelError.meta.status) {
        errorDetails = `Status: ${duffelError.meta.status}, Message: ${duffelError.meta.message || 'No message'}`;
      } else if (duffelError.message) {
        errorDetails = duffelError.message;
      }
      
      return NextResponse.json(
        { 
          error: 'Duffel API error',
          details: errorDetails
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error searching for hotels:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search for hotels',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to format guests for Duffel API
function formatGuests(guestCount: number): Guest[] {
  const guests: Guest[] = [];
  
  // Add adult guests (assuming all are adults for simplicity)
  for (let i = 0; i < guestCount; i++) {
    guests.push({ type: 'adult' } as Guest);
  }
  
  return guests;
}
