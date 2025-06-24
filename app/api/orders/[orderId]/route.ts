import { NextResponse } from 'next/server';

interface DuffelSegment {
  origin: { iata_code: string; terminal?: string };
  destination: { iata_code: string; terminal?: string };
  departing_at: string;
  arriving_at: string;
  marketing_carrier: { iata_code: string; name: string };
  operating_carrier_flight_number: string;
  passengers: {
    baggages: {
      type: string;
      quantity: number;
    }[];
    seat?: string;
  }[];
}

interface DuffelSlice {
  segments: DuffelSegment[];
  duration: string;
}

interface DuffelPassenger {
  given_name: string;
  family_name: string;
  title?: string;
  gender?: string;
  born_on?: string;
  email?: string;
  phone_number?: string;
  type?: string;
}

interface DuffelOrder {
  data: {
    id: string;
    booking_reference: string;
    slices: DuffelSlice[];
    passengers: DuffelPassenger[];
    total_amount: string;
    total_currency: string;
    created_at: string;
    cabin_class: string;
  };
}

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    console.log(`Fetching order ${params.orderId} from Duffel API`);
    
    const duffelApiKey = process.env.DUFFEL_API;
    if (!duffelApiKey) {
      console.error('Duffel API key not configured');
      throw new Error('Duffel API key not configured');
    }

    const response = await fetch(`https://api.duffel.com/air/orders/${params.orderId}`, {
      headers: {
        'Authorization': `Bearer ${duffelApiKey}`,
        'Duffel-Version': 'v2'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Duffel API error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch order from Duffel' },
        { status: response.status }
      );
    }

    const order: DuffelOrder = await response.json();
    console.log('Successfully fetched order from Duffel');
    
    return NextResponse.json({
      bookingReference: order.data.booking_reference,
      orderId: order.data.id,
      createdAt: order.data.created_at,
      cabinClass: order.data.cabin_class,
      itinerary: {
        segments: order.data.slices.flatMap((slice: DuffelSlice) => 
          slice.segments.map((segment: DuffelSegment) => ({
            departure: {
              iataCode: segment.origin.iata_code,
              terminal: segment.origin.terminal,
              at: segment.departing_at
            },
            arrival: {
              iataCode: segment.destination.iata_code,
              terminal: segment.destination.terminal,
              at: segment.arriving_at
            },
            flightNumber: segment.operating_carrier_flight_number,
            airline: segment.marketing_carrier.name,
            airlineCode: segment.marketing_carrier.iata_code,
            baggages: segment.passengers[0]?.baggages || [],
            seats: segment.passengers.map(p => p.seat).filter(Boolean)
          }))
        ),
        duration: order.data.slices[0].duration
      },
      passengers: order.data.passengers.map((passenger: DuffelPassenger) => ({
        given_name: passenger.given_name,
        family_name: passenger.family_name,
        title: passenger.title,
        gender: passenger.gender,
        born_on: passenger.born_on,
        email: passenger.email,
        phone_number: passenger.phone_number,
        type: passenger.type
      })),
      payment: {
        amount: order.data.total_amount,
        currency: order.data.total_currency
      }
    });
  } catch (error) {
    console.error('Error fetching order from Duffel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order from Duffel API' },
      { status: 500 }
    );
  }
}
