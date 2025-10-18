// utils/trip-search.utils.ts
import { SearchParams, FlightOffer, FilterState } from '../../types/trip-search.types';
import { SEARCH_VALIDATION } from '../constants/trip-search.constants';

/**
 * Parse URL search parameters into SearchParams object
 */
export function parseUrlSearchParams(urlParams: URLSearchParams): Partial<SearchParams> {
  const params: Partial<SearchParams> = {};

  if (urlParams.has('origin')) params.origin = urlParams.get('origin')!;
  if (urlParams.has('destination')) params.destination = urlParams.get('destination')!;
  if (urlParams.has('departureDate')) params.departureDate = urlParams.get('departureDate')!;
  if (urlParams.has('returnDate')) params.returnDate = urlParams.get('returnDate')!;
  if (urlParams.has('tripType')) params.tripType = urlParams.get('tripType') as 'roundtrip' | 'oneway';
  
  // CRITICAL FIX: Parse travelers from URL
  if (urlParams.has('travelers')) {
    const travelers = parseInt(urlParams.get('travelers')!, 10);
    if (!isNaN(travelers)) {
      params.travelers = travelers;
    }
  }
  
  if (urlParams.has('budget')) {
    const budget = parseInt(urlParams.get('budget')!, 10);
    if (!isNaN(budget)) params.budget = budget;
  }
  
  if (urlParams.has('currency')) params.currency = urlParams.get('currency')!;
  if (urlParams.has('includeHotels')) params.includeHotels = urlParams.get('includeHotels') === 'true';
  if (urlParams.has('useDuffel')) params.useDuffel = urlParams.get('useDuffel') !== 'false';
  
  if (urlParams.has('nights')) {
    const nights = parseInt(urlParams.get('nights')!, 10);
    if (!isNaN(nights)) params.nights = nights;
  }

  return params;
}

/**
 * Build query string from search parameters
 */
export function buildSearchQueryString(params: SearchParams): string {
  const queryParams = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    returnDate: params.returnDate || '',
    tripType: params.tripType,
    nights: params.nights.toString(),
    travelers: params.travelers.toString(), // CRITICAL: Include travelers
    currency: params.currency,
    budget: params.budget.toString(),
    includeHotels: params.includeHotels.toString(),
    useDuffel: params.useDuffel.toString(),
  });

  return queryParams.toString();
}

/**
 * Calculate nights between two dates
 */
export function calculateNights(departureDate: string, returnDate: string): number {
  if (!departureDate || !returnDate) return 0;
  
  const departure = new Date(departureDate);
  const returnD = new Date(returnDate);
  const diffTime = returnD.getTime() - departure.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Parse ISO 8601 duration to minutes
 */
export function parseDuration(duration: string): number {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:([0-9]+)H)?(?:([0-9]+)M)?/);
  if (!match) {
    console.warn(`Invalid duration format: ${duration}`);
    return 0;
  }
  
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  
  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`Invalid duration values in: ${duration}`);
    return 0;
  }
  
  return hours * 60 + minutes;
}

/**
 * Format duration from minutes to human readable
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Filter and sort flights based on filter criteria
 */
export function filterAndSortFlights(
  flights: FlightOffer[],
  filters: FilterState
): FlightOffer[] {
  return flights
    .filter(trip => {
      // Price filter
      const price = parseFloat(trip.price.total);
      if (price > filters.maxPrice) return false;
      
      // Stops filter
      const segments = trip.itineraries[0].segments;
      if (segments.length - 1 > filters.maxStops) return false;
      
      // Airline filter
      if (filters.airlines.length > 0) {
        const airlinesInTrip = new Set(segments.map((s : any) => s.carrierCode));
        if (!filters.airlines.some((a : any) => airlinesInTrip.has(a))) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'price') {
        const priceA = parseFloat(a.price.total);
        const priceB = parseFloat(b.price.total);
        return filters.sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      } else {
        // Duration sorting
        const durationA = parseDuration(a.itineraries[0].duration);
        const durationB = parseDuration(b.itineraries[0].duration);
        return filters.sortOrder === 'asc' ? durationA - durationB : durationB - durationA;
      }
    });
}

/**
 * Validate search parameters
 */
export function validateSearchParams(params: SearchParams): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate travelers
  if (params.travelers < SEARCH_VALIDATION.MIN_TRAVELERS || 
      params.travelers > SEARCH_VALIDATION.MAX_TRAVELERS) {
    errors.push(
      `Number of travelers must be between ${SEARCH_VALIDATION.MIN_TRAVELERS} and ${SEARCH_VALIDATION.MAX_TRAVELERS}`
    );
  }

  // Validate budget
  if (params.budget < SEARCH_VALIDATION.MIN_BUDGET || 
      params.budget > SEARCH_VALIDATION.MAX_BUDGET) {
    errors.push(
      `Budget must be between ${SEARCH_VALIDATION.MIN_BUDGET} and ${SEARCH_VALIDATION.MAX_BUDGET}`
    );
  }

  // Validate origin and destination
  if (!params.origin || params.origin.length !== 3) {
    errors.push('Please select a valid origin airport');
  }

  if (!params.destination || params.destination.length !== 3) {
    errors.push('Please select a valid destination airport');
  }

  if (params.origin === params.destination) {
    errors.push('Origin and destination must be different');
  }

  // Validate dates
  if (!params.departureDate) {
    errors.push('Please select a departure date');
  } else {
    const departureDate = new Date(params.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (departureDate < today) {
      errors.push('Departure date cannot be in the past');
    }
  }

  if (params.tripType === 'roundtrip') {
    if (!params.returnDate) {
      errors.push('Please select a return date for round trip');
    } else if (params.departureDate && params.returnDate) {
      const departureDate = new Date(params.departureDate);
      const returnDate = new Date(params.returnDate);

      if (returnDate <= departureDate) {
        errors.push('Return date must be after departure date');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate cache key for flight search
 */
export function generateCacheKey(params: SearchParams): string {
  return `flight_search_${params.origin}_${params.destination}_${params.departureDate}_${params.returnDate}_${params.tripType}_${params.nights}_${params.travelers}_${params.currency}_${params.budget}_${params.includeHotels}_${params.useDuffel}`;
}

/**
 * Save flights to localStorage cache
 */
export function cacheFlightResults(params: SearchParams, flights: FlightOffer[]): void {
  try {
    const cacheKey = generateCacheKey(params);
    localStorage.setItem(cacheKey, JSON.stringify(flights));
    console.log('Cached flight results:', cacheKey);
  } catch (error) {
    console.warn('Failed to cache flight results:', error);
    // Ignore quota errors
  }
}

/**
 * Get flights from localStorage cache
 */
export function getCachedFlightResults(params: SearchParams): FlightOffer[] | null {
  try {
    const cacheKey = generateCacheKey(params);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Failed to retrieve cached flight results:', error);
  }
  return null;
}

/**
 * Get minimum date for date inputs (today)
 */
export function getMinDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get minimum return date based on departure date
 */
export function getMinReturnDate(departureDate: string): string {
  if (!departureDate) return getMinDate();
  
  const departure = new Date(departureDate);
  departure.setDate(departure.getDate() + 1);
  return departure.toISOString().split('T')[0];
}

/**
 * Format price with currency
 */
export function formatPrice(amount: string | number, currency: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency} ${numAmount.toFixed(2)}`;
}