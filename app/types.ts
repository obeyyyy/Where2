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
    segments: Array<{
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
    }>;
  }>;
  deep_link?: string;
}

export interface SearchParams {
  budget: number;
  currency: string;
  originType: 'Airport' | 'City' | 'Country';
  origin: string;
  destinationType: 'Airport' | 'City' | 'Country';
  destination: string;
  departureDate: string;
  returnDate?: string;
  travelers: number;
  tripType: 'oneway' | 'roundtrip';
  [key: string]: any; // For any additional params
}
