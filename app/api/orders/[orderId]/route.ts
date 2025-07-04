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
    // Add seat details
    seat_details?: {
      designator: string;
      name?: string;
      cabin_class?: string;
    };
  }[];
  id: string; // Segment ID for matching with services
}

interface DuffelSlice {
  segments: DuffelSegment[];
  duration: string;
}

interface DuffelPassenger {
  id: string; // Add ID field
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
  type: string; // 'baggage', 'seat', 'cancel_for_any_reason', etc.
  passenger_id: string;
  segment_ids?: string[];
  quantity?: number;
  metadata?: {
    baggage_type?: string;
    weight?: {
      value: number;
      unit: string;
    };
    seat_designation?: string;
    seat_type?: string;
  };
  total_amount: string;
  total_currency: string;
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
    services?: DuffelService[]; // Added services array
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
    
    // Create a map of segment IDs for easier lookup when processing services
    const segmentMap = new Map();
    order.data.slices.forEach((slice: DuffelSlice) => {
      slice.segments.forEach((segment: DuffelSegment) => {
        segmentMap.set(segment.id, segment);
      });
    });
    
    // Define interface for ancillary breakdown items
    interface AncillaryItem {
      id: string;
      type: string;
      title: string;
      details: string;
      amount: string;
      currency: string;
      passengerId: string;
      passengerName: string;
      segmentIds: string[];
    }
    
    // Process ancillary services if available
    const ancillaryBreakdown: AncillaryItem[] = [];
    if (order.data.services && order.data.services.length > 0) {
      // Find the passenger map for easier lookup
      const passengerMap = new Map();
      order.data.passengers.forEach((passenger: DuffelPassenger) => {
        passengerMap.set(passenger.id, passenger);
      });
      
      // Process each service
      order.data.services.forEach((service: DuffelService) => {
        const passenger = passengerMap.get(service.passenger_id);
        const passengerName = passenger ? `${passenger.given_name} ${passenger.family_name}` : 'Passenger';
        
        // Determine service type and details
        let type = '';
        let title = '';
        let details = '';
        
        switch(service.type) {
          case 'baggage':
            type = 'bags';
            title = `Checked Bag (${service.metadata?.weight?.value || ''} ${service.metadata?.weight?.unit || 'kg'})`;
            details = `${service.metadata?.baggage_type || 'Standard baggage'}`;
            break;
          case 'seat':
            type = 'seats';
            title = `Seat ${service.metadata?.seat_designation || ''}`;
            details = `${service.metadata?.seat_type || 'Standard seat'}`;
            break;
          case 'cancel_for_any_reason':
            type = 'cancel';
            title = 'Cancel for any reason';
            details = 'Flexible cancellation option';
            break;
          default:
            type = service.type;
            title = `${service.type.charAt(0).toUpperCase() + service.type.slice(1).replace('_', ' ')}`;
            details = 'Additional service';
        }
        
        // Add to ancillary breakdown
        ancillaryBreakdown.push({
          id: service.id,
          type,
          title,
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
            seats: segment.passengers.map(p => p.seat).filter(Boolean),
            id: segment.id // Include segment ID for matching with services
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
        id: passenger.id // Include passenger ID for matching with services
      })),
      payment: {
        amount: order.data.total_amount,
        currency: order.data.total_currency
      },
      // Add ancillary breakdown to the response
      ancillaryBreakdown: ancillaryBreakdown.length > 0 ? ancillaryBreakdown : undefined
    });
  } catch (error) {
    console.error('Error fetching order from Duffel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order from Duffel API' },
      { status: 500 }
    );
  }
}
