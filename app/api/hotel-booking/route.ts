import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

interface PaymentInfo {
  amount: string;
  currency: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
} 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      quoteId,
      guestInfo,
      paymentInfo 
    }: {
      quoteId: string;
      guestInfo: GuestInfo;
      paymentInfo: PaymentInfo;
    } = body;

    if (!quoteId || !guestInfo || !paymentInfo) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Prepare guest information according to Duffel's API requirements
    const guest = {
      given_name: guestInfo.firstName,
      family_name: guestInfo.lastName,
      // Add other required fields for the guest
      // Note: The exact structure depends on Duffel's API requirements
    };

    // Create booking using Duffel API
    const booking = await duffel.stays.bookings.create({
      quote_id: quoteId,
      guests: [guest],
      payment: {
        // Use card token (this should be obtained securely from the client)
        card_id: 'card_token_here', // Replace with actual token from client
        three_d_secure_session_id: paymentInfo.currency
      },
      metadata: {
        source: 'where2-web-app',
        booking_reference: `WH2-${Date.now()}`,
        dob: guestInfo.dateOfBirth
      },
      email: guestInfo.email,
      phone_number: guestInfo.phone
    });

    return NextResponse.json({
      success: true,
      booking: booking.data
    });

  } catch (error: any) {
    console.error('Booking error:', error);
    // Handle specific error cases
    let errorMessage = 'Failed to create booking';
    let statusCode = 500;
    if (error.errors) {
      // Handle Duffel API specific errors
      errorMessage = error.errors.map((e: any) => e.message).join(', ');
      statusCode = 400; // Bad request
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: statusCode }
    );
  }
}
