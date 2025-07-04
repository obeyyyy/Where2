import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

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
    seat_details?: {
      designator: string;
      name?: string;
      cabin_class?: string;
    };
  }[];
  id: string;
}

interface DuffelSlice {
  segments: DuffelSegment[];
  duration: string;
}

interface DuffelPassenger {
  id: string;
  given_name: string;
  family_name: string;
  title?: string;
  gender?: string;
  born_on?: string;
  email?: string;
  phone_number?: string;
  type?: string;
}

interface DuffelService {
  id: string;
  type: string;
  passenger_id: string;
  segment_ids?: string[];
  quantity?: number;
  metadata?: {
    baggage_type?: string;
    weight_kg?: number;
    seat_designator?: string;
    seat_type?: string;
  };
  total_amount: string;
  total_currency: string;
}

// Using a more flexible type definition to handle Duffel API responses
interface DuffelOrder {
  data: {
    id: string;
    booking_reference: string;
    slices: any[];
    passengers: any[];
    total_amount: string;
    total_currency: string;
    created_at: string;
    cabin_class?: string;
    services?: any[];
    [key: string]: any;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { reference: string } }
) {
  try {
    const bookingReference = params.reference;
    if (!bookingReference) {
      return NextResponse.json(
        { error: 'Booking reference is required' },
        { status: 400 }
      );
    }

    // Use the imported Duffel API client

    // Fetch orders by booking reference
    const orders = await duffel.orders.list({
      booking_reference: bookingReference
    });

    if (!orders.data || orders.data.length === 0) {
      return NextResponse.json(
        { error: 'No booking found with this reference' },
        { status: 404 }
      );
    }

    // Get the first order that matches the booking reference
    const order = await duffel.orders.get(orders.data[0].id);

    // Process ancillary services if available
    const ancillaryBreakdown: any[] = [];
    
    if (order.data.services && order.data.services.length > 0) {
      order.data.services.forEach((service: any) => {
        // Find passenger name for this service
        const passenger = order.data.passengers.find(p => p.id === service.passenger_id);
        const passengerName = passenger ? `${passenger.given_name} ${passenger.family_name}` : 'Unknown';
        
        // Extract service details based on type
        let details = '';
        
        if (service.type === 'baggage') {
          const bagType = service.metadata?.baggage_type || 'Checked bag';
          const weight = service.metadata?.weight_kg ? `${service.metadata.weight_kg}kg` : '';
          details = `${bagType} ${weight}`.trim();
        } else if (service.type === 'seat') {
          details = `Seat ${service.metadata?.seat_designator || ''} (${service.metadata?.seat_type || 'Standard'})`;
        } else if (service.type === 'cancel_for_any_reason') {
          details = 'Cancel for any reason protection';
        } else {
          details = service.type;
        }
        
        // Add to ancillary breakdown
        ancillaryBreakdown.push({
          type: service.type,
          details,
          amount: service.total_amount,
          currency: service.total_currency,
          passengerId: service.passenger_id,
          passengerName,
          segmentIds: service.segment_ids || []
        });
      });
    }
    
    return NextResponse.json({
      bookingReference: order.data.booking_reference,
      orderId: order.data.id,
      createdAt: order.data.created_at,
      cabinClass: (order.data as any).cabin_class,
      
      itinerary: {
        segments: order.data.slices.flatMap((slice: any) => 
          slice.segments.map((segment: any) => ({
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
            seats: segment.passengers.map((p: any) => p.seat).filter(Boolean),
            id: segment.id
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
        type: passenger.type,
        id: passenger.id
      })),
      payment: {
        amount: order.data.total_amount,
        currency: order.data.total_currency
      },
      ancillaryBreakdown: ancillaryBreakdown.length > 0 ? ancillaryBreakdown : undefined
    });
  } catch (error) {
    console.error('Error fetching order by booking reference:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order from Duffel API' },
      { status: 500 }
    );
  }
}
