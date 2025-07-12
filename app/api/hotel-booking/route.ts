import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      quoteId, 
      email, 
      phoneNumber, 
      guests, 
      specialRequests 
    } = body;

    if (!quoteId || !email || !phoneNumber || !guests || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json(
        { error: 'Missing required booking parameters' },
        { status: 400 }
      );
    }

    // Format the booking request for Duffel Stays API
    const bookingParams = {
      quote_id: quoteId,
      email,
      phone_number: phoneNumber,
      guests: guests.map(guest => ({
        given_name: guest.firstName,
        family_name: guest.lastName,
        born_on: guest.birthDate
      })),
      accommodation_special_requests: specialRequests || undefined
    };

    // Call Duffel Stays API to create a booking
    const bookingResponse = await duffel.stays.bookings.create(bookingParams);

    return NextResponse.json({
      success: true,
      booking: bookingResponse.data
    });
  } catch (error: any) {
    console.error('Error creating hotel booking:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create hotel booking',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
