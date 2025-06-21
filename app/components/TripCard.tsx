// app/components/TripCard.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTripCart } from './TripCartContext';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomButton from './CustomButton';

// Helper function to get city name from IATA code
interface Airport {
  iata_code?: string;
  iata?: string;
  city?: string;
  name?: string;
}

const getCityName = (iataCode: string): string => {
  if (!iataCode) return '';
  const code = iataCode.toUpperCase();
  
  // First try direct lookup
  const airport: Airport = (airportsJson as any)[code] || (airportsJson as any).airports?.[code];
  if (airport?.city) return airport.city.split(',')[0].trim();
  if (airport?.name) return airport.name.split(',')[0].trim();
  
  // Fallback search if needed
  const airportsList: Airport[] = (airportsJson as any).airports 
    ? Object.values((airportsJson as any).airports)
    : Object.values(airportsJson as any);
    
  const found = airportsList.find((a: Airport) => 
    (a.iata_code || a.iata) === code
  );
  
  if (found?.city) return found.city.split(',')[0].trim();
  if (found?.name) return found.name.split(',')[0].trim();
  
  return code;
};

interface FlightSegment {
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

interface HotelInfo {
  price: string;
  currency: string;
  name?: string;
  offerId?: string;
  totalPrice?: string;
  rating?: number; // Hotel stars (1-5)
  address?: string;
  amenities?: string[];
  sentiment?: any;
}

interface FlightOffer {
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
  hotels?: HotelInfo[];
  deep_link?: string;
}

interface TripCardProps {
  trip: FlightOffer;
  budget: number;
  currency: string;
  flightType?: 'outbound' | 'return' | 'oneway';
  onSelect?: () => void;
  selected?: boolean;
  tripTypeParam?: 'roundtrip' | 'oneway';
  searchParams?: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    tripType?: string;
    nights?: string;
    travelers?: string;
    currency?: string;
    budget?: string;
  };
  onBook?: (tripData: any) => void;
}

// Helper function to get airline logo URL
const getAirlineLogoUrl = (carrierCode: string) => {
  return `https://content.airhex.com/content/logos/airlines_${carrierCode}_100_50_r.png`;
};

// Helper function to get airline name
const getAirlineName = (carrierCode: string) => {
  return (airportsJson as any)[carrierCode]?.name || '';
};

import HotelCard from './HotelCard';
import airportsJson from 'airports-json';

export default function TripCard({ 
  trip, 
  budget, 
  currency, 
  flightType = 'outbound', 
  onSelect, 
  selected,
  tripTypeParam,
  searchParams: propSearchParams,
  onBook
}: TripCardProps) {
  // Use searchParams from props or fallback to URL search params
  const searchParams = propSearchParams || useSearchParams();
  // Get the trip cart context for saving to trip summary
  const { setTrip: setTripInCart, clearCart } = useTripCart();
  const router = useRouter();
  
  // Define the shape of our search parameters
  type SearchParamKey = 
    | 'tripType' 
    | 'origin' 
    | 'destination' 
    | 'departureDate' 
    | 'returnDate' 
    | 'nights' 
    | 'travelers' 
    | 'currency' 
    | 'budget';

  // Helper function to safely get search params with proper typing
  const getSearchParam = (key: SearchParamKey): string => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) || '';
    }
    // Handle case where searchParams is a plain object
    const params = searchParams as Record<string, string | string[] | undefined>;
    const value = params[key];
    return Array.isArray(value) ? value[0] || '' : value || '';
  };
  
  // Get all search params using the helper function
  // Use tripTypeParam from props or fallback to search params
  const tripTypeParamFromUrl = getSearchParam('tripType');
  const effectiveTripType = tripTypeParam || tripTypeParamFromUrl;
  const originParam = getSearchParam('origin');
  const destinationParam = getSearchParam('destination');
  const departureDateParam = getSearchParam('departureDate');
  const returnDateParam = getSearchParam('returnDate');
  const nightsParam = getSearchParam('nights');
  const travelersParam = getSearchParam('travelers');
  const budgetParam = getSearchParam('budget');
  const currencyParam = getSearchParam('currency');
  
  // Parse numeric values with fallbacks
  const travelers = parseInt(travelersParam) || 1;
  const parsedBudget = parseFloat(budgetParam) || 0;
  
  // Hotel selection state
  const [selectedHotel, setSelectedHotel] = useState<HotelInfo | null>(null);
  const [hotelPage, setHotelPage] = useState(0);
  const HOTELS_PER_PAGE = 3;
  const HOTELS_NEXT_COUNT = 2;
  
  // Filter out duplicate hotels based on offerId
  const uniqueHotels = Array.from(new Map(trip.hotels?.map(hotel => [hotel.offerId, hotel]) || []).values());
  const pagedHotels = uniqueHotels.slice(0, HOTELS_PER_PAGE + hotelPage * HOTELS_NEXT_COUNT);
  const hasMoreHotels = pagedHotels.length < (trip.hotels?.length || 0);
  
  // Helper function to format date string
  const formatDateString = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? dateStr : date.toISOString();
    } catch (e) {
      return dateStr;
    }
  };

  // Helper function to format time - 24h format with leading zeros, no seconds
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // If trip is missing, show a message (handle as a view state)
  if (!trip) {
    return <div className="text-center p-4">No flight data available</div>;
  }

  // Destructure trip data first
  const { price: tripPrice, itineraries = [], hotels = [] } = trip;
  
  // Ensure TripCard displays both outbound and inbound itineraries together
  const combinedSegments = itineraries.flatMap(itinerary => itinerary.segments);

  // Adjust price logic to show total for roundtrip
  const price = {
    total: tripPrice.total || '0',
    currency: tripPrice.currency || 'USD',
    isBreakdown: false,
    breakdown: undefined
  };

  // Combined display for both outbound and inbound flights
  const displayFlights = itineraries.map((itinerary, index) => (
    <div key={index} className="flight-segment mb-4">
      <div className="flex items-center">
        <Image src={getAirlineLogoUrl(itinerary.segments[0].carrierCode)} alt="Airline Logo" width={50} height={25} />
        <span className="ml-2 font-semibold">{itinerary.segments[0].carrierCode} {itinerary.segments[0].number}</span>
        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {index === 0 ? 'Outbound' : 'Return'}
        </span>
      </div>
      <div className="flex justify-between mt-1">
        <span>{formatDateString(itinerary.segments[0].departure.at)} {formatTime(itinerary.segments[0].departure.at)}</span>
        <span>{itinerary.segments[0].departure.iataCode} ➔ {itinerary.segments[itinerary.segments.length - 1].arrival.iataCode}</span>
        <span>{formatDateString(itinerary.segments[itinerary.segments.length - 1].arrival.at)} {formatTime(itinerary.segments[itinerary.segments.length - 1].arrival.at)}</span>
      </div>
    </div>
  ));

  // Format price for display - always show 2 decimal places for consistency
  const formatPrice = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  // Enhanced price display for clarity
  const displayPrice = (
    <div className="flex flex-col gap-0.5 group relative mt-2 mb-2">
      <span className="font-bold text-2xl text-orange-600">
        Total price:
      </span>
      <span className="font-extrabold text-3xl text-gray-900">
        {price.currency} {formatPrice(price.total)}
      </span>
    </div>
  );

  // Get the appropriate segments based on flight type
  const outboundSegment = itineraries[0]?.segments[0] || {} as FlightSegment;
  const returnSegment = itineraries[1]?.segments[0] || {} as FlightSegment;
  
  // Get carrier code based on flight type
  const carrierCode = returnSegment?.operating?.carrierCode || returnSegment?.carrierCode || outboundSegment?.operating?.carrierCode || outboundSegment?.carrierCode || '';
  const logoUrl = carrierCode ? getAirlineLogoUrl(carrierCode) : '';
  const airlineName = carrierCode || 'Unknown Airline';

  // For the main flight segment, use the first segment of the first itinerary
  const flightSegment = outboundSegment;
  
  // For flight segments, handle outbound and return separately for roundtrip
  const outboundSegments = itineraries[0]?.segments || [];
  const returnSegments = itineraries[1]?.segments || [];
  
  // Use combined segments only for one-way flights or when we need to display all segments together
  const flightSegments = effectiveTripType === 'roundtrip' ? outboundSegments : combinedSegments;

  // Debug logging
  console.log('TripCard Debug:', {
    flightType,
    flightSegment: flightSegment,
    returnSegment: returnSegment,
    outbound: outboundSegment,
    price: price,
    displayPrice: displayPrice,
    departureDate: flightSegment?.departure?.at,
    arrivalDate: flightSegment?.arrival?.at
  });

  // Correct variable references for segments
  const origin = itineraries[0]?.segments[0]?.departure?.iataCode || 'N/A';
  const destination = itineraries[1]?.segments[itineraries[1].segments.length - 1]?.arrival?.iataCode || 'N/A';

  // Get city names for origin and destination
  const originCity = getCityName(origin) || origin;
  const destinationCity = getCityName(destination) || destination;
  const getValidDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const departureDate = getValidDate(
    itineraries[0]?.segments[0]?.departure?.at || outboundSegment?.departure?.at
  );
  
  const arrivalDate = getValidDate(
    itineraries[1]?.segments[itineraries[1].segments.length - 1]?.arrival?.at || outboundSegment?.arrival?.at
  );

  // Log detailed flight information for debugging
  console.log(`Flight Card [roundtrip]:`, {
    origin,
    destination,
    departure: departureDate?.toISOString(),
    arrival: arrivalDate?.toISOString(),
    price: trip.price,
    segments: combinedSegments,
    currency
  });

  // Robust ISO8601 parsing and fallback for invalid dates
  const parseDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };


  // Format date for display
  const formatDisplayDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatDisplayTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
    
  // Calculate total duration for multi-segment flights
  const calculateTotalDuration = (segments: any[]) => {
    if (!segments || segments.length === 0) return 'PT0H0M';
    const firstDeparture = new Date(segments[0]?.departure?.at);
    const lastArrival = new Date(segments[segments.length - 1]?.arrival?.at);
    const totalMinutes = Math.round((lastArrival.getTime() - firstDeparture.getTime()) / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `PT${hours}H${minutes}M`;
  };
  
  // Calculate durations for outbound and return flights separately
  const outboundDuration = calculateTotalDuration(outboundSegments);
  const returnDuration = calculateTotalDuration(returnSegments);
  
  // For one-way flights or backward compatibility, use outbound duration
  const totalDuration = effectiveTripType === 'roundtrip' ? outboundDuration : calculateTotalDuration(flightSegments);

  // Calculate stops information for outbound and return flights separately
  const outboundStops = Math.max(0, outboundSegments.length - 1);
  const returnStops = Math.max(0, returnSegments.length - 1);
  
  // For one-way flights, use outbound stops; for roundtrip, we'll display both separately
  const stops = outboundStops;
  
  // Labels for outbound and return stops
  const outboundStopsLabel = outboundStops === 0 ? 'Nonstop' : `${outboundStops} Stop${outboundStops > 1 ? 's' : ''}`;
  const returnStopsLabel = returnStops === 0 ? 'Nonstop' : `${returnStops} Stop${returnStops > 1 ? 's' : ''}`;
  
  // Colors for outbound and return stops
  const outboundStopsColor = outboundStops === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
  const returnStopsColor = returnStops === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

  // For backward compatibility with existing code
  const stopsLabel = outboundStopsLabel;
  const stopsColor = outboundStopsColor;

  // Format duration
  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    const hours = (match[1] ? match[1].replace('H', 'h ') : '');
    const minutes = (match[2] ? match[2].replace('M', 'm') : '');
    return `${hours}${minutes}`.trim();
  };

  // Calculate nights (only for outbound flights)
  const nights = departureDate && arrivalDate ? 
    Math.max(1, Math.round((+arrivalDate - +departureDate) / (1000 * 60 * 60 * 24))) : null;

  // Debug logging for price and flight data
  if (flightType === 'return' || flightType === 'outbound') {
    console.log(`[${flightType}] Trip data:`, {
      price: price,
      tripPrice: trip.price,
      segments: flightSegments,
      origin,
      destination,
      departureDate: departureDate?.toISOString(),
      arrivalDate: arrivalDate?.toISOString(),
      currency
    });
  }

  // Card for selecting a single flight (outbound or return)
  // Unified TripCard UI: always use the same layout, regardless of selection or summary state
  // Remove all conditional styling/layout based on 'selected' or 'onSelect'
  // Always use the modern, elegant layout for all states
  // --- BEGIN UNIFIED CARD RENDER ---
  const departureTime = formatTime(departureDate?.toISOString() ?? '');
  const arrivalTime = formatTime(arrivalDate?.toISOString() ?? '');
  const flightNumber = returnSegment?.number || outboundSegment?.number;
  const aircraftCode = returnSegment?.aircraft?.code || outboundSegment?.aircraft?.code;

  return (
    <div
      className={`w-full max-w-3xl mx-auto bg-white rounded-xl shadow-sm transition-all border border-gray-100 overflow-hidden`}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect();
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="p-5">
        {/* Compact Header with Essential Info */}
        <div className="flex justify-between items-center mb-4 gap-3">
          {/* Flight Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="relative w-8 h-8 bg-white rounded-lg border border-gray-100 flex-shrink-0">
                <Image 
                  src={getAirlineLogoUrl(itineraries[0].segments[0].carrierCode)} 
                  alt="Airline logo" 
                  fill 
                  className="object-contain w-full h-full p-1" 
                  unoptimized={true} 
                />
              </div>
              <div className="truncate">
                <h3 className="text-lg font-medium text-gray-900">
                  {getCityName(itineraries[0].segments[0].departure.iataCode)}    -    {getCityName(itineraries[0].segments[itineraries[0].segments.length - 1].arrival.iataCode)}
                </h3>
                <p className="text-xs text-gray-500">
                  {itineraries[0].segments[0].carrierCode} {itineraries[0].segments[0].number} • {formatDisplayDate(new Date(itineraries[0].segments[0].departure.at))}
                </p>
              </div>
            </div>
            
            {/* Stops Badge */}
            <div className="flex gap-1">
              {effectiveTripType === 'roundtrip' ? (
                <>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {outboundStopsLabel}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {returnStopsLabel}
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {stopsLabel}
                </span>
              )}
            </div>
          </div>
          
          {/* Total Price */}
          <div className="bg-gradient-to-r from-orange-100 to-amber-50 text-amber-700 font-bold text-lg px-3 py-2 rounded-lg whitespace-nowrap flex-shrink-0">
            {price.currency} {(() => {
              if (!selectedHotel) return parseFloat(price.total).toFixed(0);
              const hotelTotal = selectedHotel.totalPrice ? parseFloat(selectedHotel.totalPrice) : 0;
              return (parseFloat(price.total) + hotelTotal).toFixed(0);
            })()}
          </div>
        </div>
      
      {/* Outbound Flight Route */}
      <div className="my-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
              Outbound Flight
            </span>
          </h4>
          <div className="relative">
            {/* Flight path line - narrower */}
            <div className="absolute left-1/4 right-1/4 top-1/2 h-[2px] bg-gradient-to-r from-blue-400 to-blue-500 -translate-y-1/2 z-0"></div>
            
            <div className="relative grid grid-cols-[1fr_auto_1fr] items-center mt-4 px-2 sm:px-4">
            {/* Outbound Departure */}
            <div className="text-left pr-3 z-10">
              <div className="text-2xl font-bold text-gray-900">{formatTime(itineraries[0].segments[0].departure.at)}</div>
              <div className="text-sm font-medium text-gray-700">{itineraries[0].segments[0].departure.iataCode}</div>
              <div className="text-xs text-gray-500 whitespace-normal leading-snug line-clamp-2 max-w-[80px] sm:max-w-none">{getCityName(itineraries[0].segments[0].departure.iataCode)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {formatDisplayDate(new Date(itineraries[0].segments[0].departure.at))}
              </div>
            </div>
            
            {/* Outbound Duration */}
            <div className="px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-medium text-gray-700 mx-auto z-20">
              {formatDuration(outboundDuration)}
            </div>
            
            {/* Outbound Arrival */}
            <div className="text-right pl-3 z-10">
              <div className="text-2xl font-bold text-gray-900">{formatTime(itineraries[0].segments[itineraries[0].segments.length - 1].arrival.at)}</div>
              <div className="text-sm font-medium text-gray-700">{itineraries[0].segments[itineraries[0].segments.length - 1].arrival.iataCode}</div>
              <div className="text-xs text-gray-500 whitespace-normal leading-snug line-clamp-2 max-w-[80px] sm:max-w-none">{getCityName(itineraries[0].segments[itineraries[0].segments.length - 1].arrival.iataCode)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {formatDisplayDate(new Date(itineraries[0].segments[itineraries[0].segments.length - 1].arrival.at))}
              </div>
            </div>
          </div>
          
          {/* Layover Information for Outbound Flight */}
          {outboundSegments.length > 1 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Outbound Layover{outboundSegments.length > 2 ? 's' : ''}
              </h4>
              <div className="space-y-2">
                {outboundSegments.slice(0, -1).map((seg, idx) => {
                    const minutes = Math.round((new Date(outboundSegments[idx + 1].departure.at).getTime() - new Date(seg.arrival.at).getTime()) / (1000 * 60));
                    const durationStr = `PT${Math.floor(minutes / 60)}H${minutes % 60}M`;
                    return (
                      <div key={`outbound-${idx}`} className="flex items-center text-sm">
                        <span className="font-medium text-gray-700">
                          {getCityName(seg.arrival.iataCode)} ({seg.arrival.iataCode})
                        </span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-gray-600">
                          {formatDuration(durationStr)} layover
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Return Flight for Roundtrip */}
      {effectiveTripType === 'roundtrip' && itineraries.length > 1 && (
        <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
            <div className="flex items-center">
              <div className="relative w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-lg border border-gray-100 flex items-center justify-center mr-2">
                <Image 
                  src={getAirlineLogoUrl(itineraries[1].segments[0].carrierCode)} 
                  alt={`${itineraries[1].segments[0].carrierCode} logo`} 
                  fill 
                  className="object-contain p-0.5 sm:p-1" 
                  unoptimized={true} 
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                {itineraries[1].segments[0].carrierCode} {itineraries[1].segments[0].number}
              </span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 w-fit">
              Return Flight
            </span>
            
          </div>
        
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center mt-4 px-2 sm:px-4">
            {/* Inbound Departure */}
            {/* Flight path line - narrower */}
            <div className="absolute left-1/4 right-1/4 top-1/2 h-[2px] bg-gradient-to-r from-purple-400 to-purple-500 -translate-y-1/2 z-0"></div>
            <div className="text-left pr-3 z-10">
              <div className="text-2xl font-bold text-gray-900">{formatTime(itineraries[1].segments[0].departure.at)}</div>
              <div className="text-sm font-medium text-gray-700">{itineraries[1].segments[0].departure.iataCode}</div>
              <div className="text-xs text-gray-500 whitespace-normal leading-snug line-clamp-2 max-w-[80px] sm:max-w-none">{getCityName(itineraries[1].segments[0].departure.iataCode)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {formatDisplayDate(new Date(itineraries[1].segments[0].departure.at))}
              </div>
            </div>
            
            {/* Inbound Duration */}
            <div className="px-3 py-1 h-[28px] flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-xs font-medium text-gray-700 mx-auto z-20">
              {formatDuration(returnDuration)}
            </div>
            
            {/* Inbound Arrival */}
            <div className="text-right pl-3 z-10">
              <div className="text-2xl font-bold text-gray-900">{formatTime(itineraries[1].segments[itineraries[1].segments.length - 1].arrival.at)}</div>
              <div className="text-sm font-medium text-gray-700">{itineraries[1].segments[itineraries[1].segments.length - 1].arrival.iataCode}</div>
              <div className="text-xs text-gray-500 whitespace-normal leading-snug line-clamp-2 max-w-[80px] sm:max-w-none">{getCityName(itineraries[1].segments[itineraries[1].segments.length - 1].arrival.iataCode)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {formatDisplayDate(new Date(itineraries[1].segments[itineraries[1].segments.length - 1].arrival.at))}
              </div>
            </div>
          </div>
          
          {/* Layover Information for Return Flight */}
          {returnSegments.length > 1 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Return Layover{returnSegments.length > 2 ? 's' : ''}
              </h4>
              <div className="space-y-2">
                {returnSegments.slice(0, -1).map((seg, idx) => {
                    const minutes = Math.round((new Date(returnSegments[idx + 1].departure.at).getTime() - new Date(seg.arrival.at).getTime()) / (1000 * 60));
                    const durationStr = `PT${Math.floor(minutes / 60)}H${minutes % 60}M`;
                    return (
                      <div key={`return-${idx}`} className="flex items-center text-sm">
                        <span className="font-medium text-gray-700">
                          {getCityName(seg.arrival.iataCode)} ({seg.arrival.iataCode})
                        </span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-gray-600">
                          {formatDuration(durationStr)} layover
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
      
     
      
      <div className="my-6 h-px bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-50" />
      {/* Book Button, Total Price, and (optionally) under budget */}
      <div className="flex flex-col gap-2 mt-4 w-full">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <CustomButton
            onClick={() => {
              // Prepare the trip data with all itineraries for roundtrips
              const tripData = {
                id: trip.id,
                trip: {
                  ...trip,
                  // Explicitly include both itineraries if they exist
                  itineraries: [
                    ...(trip.itineraries?.[0] ? [trip.itineraries[0]] : []), // Outbound
                    ...(tripTypeParam === 'roundtrip' && trip.itineraries?.[1] ? [trip.itineraries[1]] : [])  // Return if exists and roundtrip
                  ]
                },
                searchParams: {
                  origin: originParam,
                  destination: destinationParam,
                  departureDate: departureDateParam,
                  returnDate: returnDateParam,
                  tripType: tripTypeParam,
                  nights: nightsParam,
                  travelers: travelersParam,
                  currency: currencyParam,
                  budget: budgetParam
                },
                totalPrice: trip.price.total
              };
              
              console.log('Saving trip to cart:', tripData);
              try {
                // Save to localStorage first (like the booking page expects)
                localStorage.setItem('current_booking_offer', JSON.stringify(tripData));
                
                // Clear any existing trip in the cart
                clearCart();
                
                // Set the new trip data in context
                setTripInCart(tripData);
                
                console.log('Saving trip to cart and localStorage:', tripData);
                
                // For roundtrip, go directly to booking
                if (effectiveTripType === 'roundtrip') {
                  router.push('/trip-summary');
                } else {
                  // For one-way, go to trip summary
                  // Force a re-render by navigating to a different route first if we're already on trip-summary
                  if (window.location.pathname === '/trip-summary') {
                    // Force a full page reload to ensure fresh data
                    window.location.href = '/trip-summary';
                  } else {
                    router.push('/trip-summary');
                  }
                }
              } catch (error) {
                console.error('Error updating trip:', error);
              }
            }}
            active={tripTypeParam === 'roundtrip'}
            className="flex-1"
          >
            {tripTypeParam === 'roundtrip' ? 'Book Now' : 'View Summary'}
          </CustomButton>
        </div>
        </div>
      </div>
    </div>
  );
}