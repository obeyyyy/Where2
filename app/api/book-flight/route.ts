import { NextResponse } from 'next/server';
import { createPayment } from '@/lib/duffel';

// Disable caching for this route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      offerId, 
      paymentMethod, 
      cardDetails, 
      passengers,
      metadata = {} 
    } = body;

    // Validate required fields
    if (!offerId || !paymentMethod || !passengers || !Array.isArray(passengers)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process payment with Duffel
    const paymentResult = await createPayment(
      offerId,
      {
        type: paymentMethod,
        amount: body.amount,
        currency: body.currency,
        order_id: `order_${Date.now()}`,
        ...(paymentMethod === 'arc_bsp_credit_card' && cardDetails ? { 
          card_details: cardDetails 
        } : {}),
      },
      passengers,
      metadata
    );

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || 'Payment processing failed' },
        { status: 400 }
      );
    }

    // Return success response with order details
    return NextResponse.json({
      success: true,
      bookingId: paymentResult.order.id,
      order: paymentResult.order,
    });

  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
