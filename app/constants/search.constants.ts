import { CabinClass } from "@/types/search.types";
import { AirportOption } from "../components/AirportAutocomplete";

// constants/search.constants.ts
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

export const SEARCH_TYPES = {
  ALL: 'all',
  FLIGHTS: 'flights',
  HOTELS: 'hotels',
} as const;

export const TRIP_TYPES = {
  ROUND_TRIP: 'roundtrip',
  ONE_WAY: 'oneway',
} as const;

export const CABIN_CLASSES: CabinClass[] = ['economy', 'premium_economy', 'business', 'first'];

export const ROOM_TYPES = ['any', 'standard', 'deluxe', 'suite', 'family_room', 'villa'] as const;

export const DEFAULT_FORM_DATA: FormData = {
  origin:null,
  destination: null,
  departureDate: '',
  returnDate: '',
  travelers: 1,
  roomCount: 1,
  guestCount: 1,
  roomType: 'any',
  cabinClass: 'economy',
};

// Validation constants
export const VALIDATION = {
  MIN_TRAVELERS: 1,
  MAX_TRAVELERS: 9,
  MIN_ROOMS: 1,
  MAX_ROOMS: 10,
  MIN_GUESTS: 1,
  MAX_GUESTS: 10,
  MIN_ADVANCE_BOOKING_DAYS: 1,
  MAX_ADVANCE_BOOKING_DAYS: 365,
} as const;

// Animation constants
export const HERO_ANIMATION = {
  WORDS: ['Trip...', 'Getaway', 'Adventure', 'Journey', 'Escape'],
  COLORS: ['#FF8C00', '#FFA500', '#FF6B35', '#FF7A00', '#FF6347'],
  INTERVAL: 2500,
} as const;

export const TESTIMONIAL_ROTATION_INTERVAL = 5000;