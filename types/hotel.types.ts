import { ReactNode } from 'react';

export interface RoomRate {
  id: string;
  rate_plan_code: string;
  name: string;
  description?: string;
  total_amount: string;
  total_currency: string;
  board_type: string;
  payment_type: string;
  base_amount?: string;
  base_currency?: string;
  tax_amount?: string;
  tax_currency?: string;
  fee_amount?: string;
  fee_currency?: string;
  public_amount?: string;
  public_currency?: string;
  due_at_accommodation_amount?: string;
  due_at_accommodation_currency?: string;
  estimated_commission_amount?: string;
  estimated_commission_currency?: string;
  cancellation_timeline?: {
    refund_amount: string;
    currency: string;
    before: string;
  }[];
  cancellation_policy?: {
    type: 'FREE_CANCELLATION' | 'NON_REFUNDABLE' | 'PARTIALLY_REFUNDABLE';
    description?: string;
  };
  conditions?: {
    title: string;
    description: string;
  }[];
  available_rooms?: number;
  quantity_available?: number;
  max_occupancy?: number;
  room_size?: {
    square_meters: number;
    square_feet: number;
  };
  amenities?: string[];
  photos?: { url: string; caption?: string }[];
  deal_types?: string[];
  code?: string;
  available_payment_methods?: string[][];
  supported_loyalty_programme?: string;
  loyalty_programme_required?: boolean;
  negotiated_rate_id?: string;
  additional_info?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  photos: { url: string; caption: string }[];
  beds: { type: string; count: number; description?: string }[];
  max_occupancy: number;
  room_size: {
    square_meters: number;
    square_feet: number;
  };
  amenities: string[];
  rates: RoomRate[];
}

export interface HotelDetails {
  accommodation: {
    id: string;
    name: string;
    description: string;
    photos: { url: string }[];
    rating?: number;
    review_score?: number;
    location: {
      address: {
        city_name: string;
        country_code: string;
        line_one: string;
        postal_code?: string;
        region?: string;
      };
    };
    amenities: { type: string; description: string }[];
    check_in_information?: {
      check_in_after_time: string;
      check_in_before_time: string;
      check_out_before_time: string;
    };
    phone_number?: string;
    email?: string;
  };
  rooms: Room[];
  check_in_date: string;
  check_out_date: string;
}

export interface BookingQuote {
  rateId: string;
  amount: string;
  currency: string;
}

export interface HotelSearchParams {
  searchResultId: string;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
}
