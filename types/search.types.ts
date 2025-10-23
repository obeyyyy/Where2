// types/search.types.ts
export type SearchType = 'all' | 'flights' | 'hotels';
export type TripType = 'roundtrip' | 'oneway';
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export interface AirportOption {
  iata: string;
  name: string;
  city: string;
  country: string;
  label: string;
}



export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: TripType;
  travelers: number;
  cabinClass: CabinClass;
  currency: string;
  budget?: number;
  includeHotels: boolean;
  useDuffel: boolean;
  nights?: number;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  roomType: string;
}

export interface FormData {
  origin: AirportOption | null;
  destination: AirportOption | null;
  departureDate: string;
  returnDate: string;
  travelers: number;
  roomCount: number;
  guestCount: number;
  roomType: string;
  cabinClass: CabinClass;
}

