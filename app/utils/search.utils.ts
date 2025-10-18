// utils/search.utils.ts
import { FlightSearchParams, HotelSearchParams, FormData, TripType } from '../../types/search.types';
import { VALIDATION } from '../constants/search.constants';

/**
 * Validates flight search form data
 */
export function validateFlightSearch(formData: FormData, tripType: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!formData.origin?.iata) {
    errors.push('Please select an origin airport');
  }

  if (!formData.destination?.iata) {
    errors.push('Please select a destination airport');
  }

  if (formData.origin?.iata === formData.destination?.iata) {
    errors.push('Origin and destination must be different');
  }

  if (!formData.departureDate) {
    errors.push('Please select a departure date');
  } else {
    const departureDate = new Date(formData.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (departureDate < today) {
      errors.push('Departure date cannot be in the past');
    }
  }

  if (tripType === 'roundtrip') {
    if (!formData.returnDate) {
      errors.push('Please select a return date for round trip');
    } else if (formData.departureDate && formData.returnDate) {
      const departureDate = new Date(formData.departureDate);
      const returnDate = new Date(formData.returnDate);

      if (returnDate <= departureDate) {
        errors.push('Return date must be after departure date');
      }
    }
  }

  if (formData.travelers < VALIDATION.MIN_TRAVELERS || formData.travelers > VALIDATION.MAX_TRAVELERS) {
    errors.push(`Number of travelers must be between ${VALIDATION.MIN_TRAVELERS} and ${VALIDATION.MAX_TRAVELERS}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates hotel search form data
 */
export function validateHotelSearch(formData: FormData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!formData.destination) {
    errors.push('Please enter a destination');
  }

  if (!formData.departureDate) {
    errors.push('Please select a check-in date');
  }

  if (!formData.returnDate) {
    errors.push('Please select a check-out date');
  }

  if (formData.departureDate && formData.returnDate) {
    const checkIn = new Date(formData.departureDate);
    const checkOut = new Date(formData.returnDate);

    if (checkOut <= checkIn) {
      errors.push('Check-out date must be after check-in date');
    }
  }

  if (formData.roomCount < VALIDATION.MIN_ROOMS || formData.roomCount > VALIDATION.MAX_ROOMS) {
    errors.push(`Number of rooms must be between ${VALIDATION.MIN_ROOMS} and ${VALIDATION.MAX_ROOMS}`);
  }

  if (formData.guestCount < VALIDATION.MIN_GUESTS || formData.guestCount > VALIDATION.MAX_GUESTS) {
    errors.push(`Number of guests must be between ${VALIDATION.MIN_GUESTS} and ${VALIDATION.MAX_GUESTS}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Builds flight search parameters from form data
 */
export function buildFlightSearchParams(
  formData: FormData,
  tripType: string
): FlightSearchParams {
  const params: FlightSearchParams = {
    origin: formData.origin!.iata,
    destination: formData.destination!.iata,
    departureDate: formData.departureDate,
    tripType: tripType.toLowerCase().replace(' ', '') as TripType,
    travelers: formData.travelers,
    cabinClass: formData.cabinClass,
    currency: 'USD',
    includeHotels: false,
    useDuffel: true,
  };

  if (tripType === 'roundtrip' && formData.returnDate) {
    params.returnDate = formData.returnDate;
    
    // Calculate nights for round trip
    const departure = new Date(formData.departureDate);
    const returnDate = new Date(formData.returnDate);
    const nights = Math.ceil((returnDate.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24));
    params.nights = nights;
  }

  return params;
}

/**
 * Builds hotel search parameters from form data
 */
export function buildHotelSearchParams(formData: FormData): HotelSearchParams {
  return {
    destination: formData.destination?.city || '',
    checkIn: formData.departureDate,
    checkOut: formData.returnDate,
    rooms: formData.roomCount,
    guests: formData.guestCount,
    roomType: formData.roomType,
  };
}

/**
 * Converts search params to URL query string
 */
export function paramsToQueryString(params: Record<string, any>): string {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  return queryParams.toString();
}

/**
 * Gets the minimum date for date inputs (today)
 */
export function getMinDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Gets the minimum return date based on departure date
 */
export function getMinReturnDate(departureDate: string): string {
  if (!departureDate) return getMinDate();
  
  const departure = new Date(departureDate);
  departure.setDate(departure.getDate() + 1);
  return departure.toISOString().split('T')[0];
}

/**
 * Formats cabin class for display
 */
export function formatCabinClass(cabinClass: string): string {
  return cabinClass
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}