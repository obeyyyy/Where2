// types/trip-search.types.ts
export type ViewState = 'initial' | 'dates' | 'details' | 'searching' | 'results' | 'error';
export type TripType = 'roundtrip' | 'oneway';

export interface SearchParams {
  budget: number;
  currency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  tripType: TripType;
  travelers: number;
  nights: number;
  includeHotels: boolean;
  useDuffel: boolean;
}

export interface FlightSegment {
  departure: {
    iataCode: string;
    at: string;
    terminal?: string;
  };
  arrival: {
    iataCode: string;
    at: string;
    terminal?: string;
  };
  carrierCode: string;
  number: string;
  aircraft: {
    code: string;
  };
  operating?: {
    carrierCode: string;
  };
}

export interface FlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
    breakdown?: {
      outbound?: string;
      return?: string;
    };
  };
  itineraries: Array<{
    duration: string;
    segments: FlightSegment[];
  }>;
  destinationImage?: string;
}

export interface FilterState {
  maxPrice: number;
  maxStops: number;
  airlines: string[];
  sortBy: 'price' | 'duration';
  sortOrder: 'asc' | 'desc';
}

export interface TripBooking {
  id: string;
  trip: FlightOffer;
  searchParams: SearchParams;
  totalPrice: string;
}
