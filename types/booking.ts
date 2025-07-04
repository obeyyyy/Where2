// Booking types
export interface PassengerInfo {
  id: string;
}

export interface BookingPassengerInfo extends PassengerInfo {
  // Personal Information
  type: 'adult' | 'child' | 'infant_without_seat' | 'infant_with_seat';
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'm' | 'f' | 'x' | '';
  email: string;
  phone: string;
  
  // Identity Document
  documentType: 'passport' | 'passport_card' | 'national_identity_card' | 'driving_licence' | 'other';
  documentNumber: string;
  documentIssuingCountryCode: string;
  documentExpiryDate: string;
  documentNationality: string;
  
  // Contact Information
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    countryCode: string;
    postalCode: string;
    region?: string;
  };
  
  // Loyalty Program
  frequentFlyerNumber?: string;
  frequentFlyerProgram?: string;
  
  // Special Requirements
  specialAssistance?: boolean;
  mealPreferences?: string[];
  
  // Additional Information
  middleName?: string;
  titleAfterName?: string;
  titleBeforeName?: string;
  infantPassportNumber?: string;
  passportNumber?: string; // For backward compatibility
  nationality?: string;    // For backward compatibility
  passportExpiry?: string; // For backward compatibility
}

export interface DuffelAncillaryPayload {
  // Standard Duffel API structure
  services: Array<{
    id: string;
    name: string;
    type: string;
    total_amount: string;
    total_currency: string;
    description?: string;
    passenger_ids?: string[];
    segment_ids?: string[];
  }>;
  payments: Array<{
    type: string;
    amount: string;
    currency: string;
  }>;
  // Custom field to store only the ancillary portion of the payment
  ancillaryPayment?: {
    amount: string;
    currency: string;
  };
  selected_offers?: string[];
  metadata?: {
    bags?: Record<string, any>;
    seats?: Record<string, any>;
    cancel_for_any_reason?: any;
  };
  
  // Duffel component's internal state structure
  baggageSelectedServices?: Array<{
    id: string;
    type: string;
    segment_type?: string;
    maximum_weight_kg?: number;
    quantity?: number;
    total_amount: string;
    total_currency: string;
    passenger_id?: string;
    segment_id?: string;
  }>;
  seatSelectedServices?: Array<{
    id: string;
    type: string;
    designator?: string;
    cabin_class?: string;
    total_amount: string;
    total_currency: string;
    passenger_id?: string;
    segment_id?: string;
  }>;
  cfarSelectedServices?: Array<{
    id: string;
    type: string;
    total_amount: string;
    total_currency: string;
  }>;
  
  // Full offer data from Duffel API
  offer?: {
    id: string;
    available_services?: Array<any>;
    [key: string]: any;
  };
  
  // Seat maps data
  seatMaps?: Array<any>;
  
  // Error state
  error?: any;
}
