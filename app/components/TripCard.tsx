// app/components/TripCard.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTripCart } from './TripCartContext';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomButton from './CustomButton';
import { motion } from 'framer-motion';

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

  // Format price for display - always show 2 decimal places for consistency
  const formatPriceValue = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  // Format duration
  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    const hours = (match[1] ? match[1].replace('H', 'h ') : '');
    const minutes = (match[2] ? match[2].replace('M', 'm') : '');
    return `${hours}${minutes}`.trim();
  };

  // Enhanced price display for clarity
  const displayPriceValue = formatPriceValue(price.total);

  // Combined display for both outbound and inbound flights
  const displayFlights = itineraries.map((itinerary, index) => (
    <motion.div 
      key={index} 
      className={`bg-white rounded-3xl border border-orange-200 shadow-lg overflow-hidden w-full ${selected ? 'ring-2 ring-orange-500' : ''} relative`}
      whileHover={{ boxShadow: "0 8px 24px rgba(255, 165, 0, 0.25)" }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
    >
      {/* Vacation-themed decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300/20 to-orange-400/20 -mr-10 -mt-10 blur-xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-gradient-to-tr from-[#00B4D8]/10 to-[#90E0EF]/10 -ml-8 -mb-8 blur-lg"></div>
      
      <div className="absolute top-0 right-0 bg-gradient-to-r from-[#FF7A00] to-[#FFB400] text-white px-4 py-1.5 rounded-bl-2xl text-sm font-bold z-10 shadow-md">
        {displayPriceValue} {currency}
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 p-1 shadow-sm flex items-center justify-center">
            <Image src={getAirlineLogoUrl(itinerary.segments[0].carrierCode)} alt="Airline Logo" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <span className="font-semibold text-orange-900">{itinerary.segments[0].carrierCode} {itinerary.segments[0].number}</span>
            <div className="mt-1">
              <span className="px-3 py-1 bg-gradient-to-r from-[#FF7A00] to-[#FFB400] text-white rounded-full text-xs font-medium shadow-sm">
                {index === 0 ? 'Outbound' : 'Return'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4 relative">
          {/* Flight path line with vacation-themed styling */}
          <div className="absolute left-0 right-0 top-6 h-1 bg-gradient-to-r from-[#FF7A00] via-[#FFB400] to-[#00B4D8]/40 z-0 rounded-full shadow-sm"></div>
          {/* Decorative airplane icon */}
          <div className="absolute left-1/2 top-5 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
              <span className="text-xs text-[#FF7A00]">✈️</span>
            </div>
          </div>
          
          {/* Departure */}
          <div className="relative z-10 text-center group">
            <motion.div 
              className="text-2xl font-bold text-orange-900 relative inline-block"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {formatTime(itinerary.segments[0].departure.at)}
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-[#FF7A00] to-[#FFB400] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
            </motion.div>
            <div className="text-lg font-semibold bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent mt-1">
              {itinerary.segments[0].departure.iataCode}
            </div>
            <div className="text-sm text-orange-700 mt-1 font-medium">{formatDateString(itinerary.segments[0].departure.at)}</div>
            <div className="text-xs bg-gradient-to-r from-[#00B4D8] to-[#90E0EF] bg-clip-text text-transparent font-medium mt-0.5">{getCityName(itinerary.segments[0].departure.iataCode)}</div>
          </div>
          
          {/* Duration */}
          <div className="flex flex-col items-center justify-center z-10">
            <motion.div 
              className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-orange-50 border border-orange-200 shadow-md flex items-center justify-center mb-2"
              whileHover={{ scale: 1.1, rotate: 15, boxShadow: "0 8px 16px rgba(255, 122, 0, 0.15)" }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-lg bg-gradient-to-r from-[#FF7A00] to-[#00B4D8] bg-clip-text text-transparent">✈️</span>
            </motion.div>
            <div className="text-sm font-medium bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent">
              {(() => {
                const match = itinerary.duration.match(/PT(\d+H)?(\d+M)?/);
                if (!match) return itinerary.duration;
                const hours = (match[1] ? match[1].replace('H', 'h ') : '');
                const minutes = (match[2] ? match[2].replace('M', 'm') : '');
                return `${hours}${minutes}`.trim();
              })()}
            </div>
            <div className="mt-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#00B4D8]/10 to-[#90E0EF]/20 text-xs font-medium text-[#0077B6] border border-[#90E0EF]/30">
              {itinerary.segments.length > 1 ? `${itinerary.segments.length - 1} stop${itinerary.segments.length > 2 ? 's' : ''}` : 'Direct'}
            </div>
          </div>
          
          {/* Arrival */}
          <div className="relative z-10 text-center group">
            <motion.div 
              className="text-2xl font-bold text-orange-900 relative inline-block"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {formatTime(itinerary.segments[itinerary.segments.length - 1].arrival.at)}
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-[#FFB400] to-[#FF7A00] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
            </motion.div>
            <div className="text-lg font-semibold bg-gradient-to-r from-[#FFB400] to-[#FF7A00] bg-clip-text text-transparent mt-1">
              {itinerary.segments[itinerary.segments.length - 1].arrival.iataCode}
            </div>
            <div className="text-sm text-orange-700 mt-1 font-medium">{formatDateString(itinerary.segments[itinerary.segments.length - 1].arrival.at)}</div>
            <div className="text-xs bg-gradient-to-r from-[#90E0EF] to-[#00B4D8] bg-clip-text text-transparent font-medium mt-0.5">{getCityName(itinerary.segments[itinerary.segments.length - 1].arrival.iataCode)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  ));

  // Format price for display - always show 2 decimal places for consistency
  const formatPrice = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  // Enhanced price display for clarity
  const displayPrice = (
    <motion.div 
      className="flex flex-col gap-0.5 group relative mt-2 mb-2 p-4 bg-gradient-to-br from-white to-orange-50 rounded-2xl border border-orange-200 shadow-md"
      whileHover={{ y: -2, boxShadow: "0 12px 24px rgba(255, 122, 0, 0.15)" }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300/10 to-orange-400/10 -mr-6 -mt-6 blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-gradient-to-tr from-[#00B4D8]/5 to-[#90E0EF]/10 -ml-5 -mb-5 blur-md"></div>
      
      <span className="font-bold text-2xl bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent relative z-10">
        Total price:
      </span>
      <div className="flex items-baseline relative z-10">
        <span className="font-extrabold text-3xl text-gray-900 mr-1">
          {price.currency}
        </span>
        <span className="font-extrabold text-4xl bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent">
          {formatPriceValue(price.total)}
        </span>
      </div>
      <div className="text-xs text-[#00B4D8] font-medium mt-1 flex items-center relative z-10">
        <span className="mr-1">✓</span> Best value for your budget
      </div>
    </motion.div>
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
    <motion.div
      className={`w-full max-w-3xl mx-auto rounded-3xl overflow-hidden relative transition-all`}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect();
      }}
      style={{ cursor: 'pointer' }}
      initial={{ opacity: 0.9, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ boxShadow: "0 8px 24px rgba(255, 165, 0, 0.15)" }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
    >
      <div className="p-5 relative z-10 bg-white rounded-3xl border border-orange-200">
        {/* Compact Header with Essential Info */}
        <div className="flex justify-between items-center mb-4 gap-3">
          {/* Flight Summary */}
          <div className="flex-1 min-w-0">
            <motion.div 
              className="flex items-center gap-3 mb-2"
              whileHover={{ x: 3 }}
              transition={{ type: "spring", stiffness: 250, damping: 20 }}
            >
              <motion.div 
                className="relative w-10 h-10 bg-orange-200 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-orange-600 shadow-sm"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {/* Clean background to match FAQSection style */}
                <Image 
                  src={getAirlineLogoUrl(itineraries[0].segments[0].carrierCode)} 
                  alt="Airline logo" 
                  fill 
                  className="object-contain w-full h-full p-1 relative z-10" 
                  unoptimized={true} 
                />
              </motion.div>
              <div className="truncate">
                <h3 className="text-lg sm:text-xl font-bold text-orange-900 truncate">
                  {getCityName(itineraries[0].segments[0].departure.iataCode)} <span className="mx-2 text-orange-600">✈</span> {getCityName(itineraries[0].segments[itineraries[0].segments.length - 1].arrival.iataCode)}
                </h3>
                <p className="text-xs font-medium text-orange-700">
                  {itineraries[0].segments[0].carrierCode} {itineraries[0].segments[0].number} • {formatDisplayDate(new Date(itineraries[0].segments[0].departure.at))}
                </p>
              </div>
            </motion.div>
            
            {/* Stops Badge */}
            <div className="flex gap-2 flex-wrap">
              {effectiveTripType === 'roundtrip' ? (
                <>
                  <motion.span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="mr-1">🛫</span> {outboundStopsLabel}
                  </motion.span>
                  <motion.span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="mr-1">🛬</span> {returnStopsLabel}
                  </motion.span>
                </>
              ) : (
                <motion.span 
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <span className="mr-1">✈️</span> {stopsLabel}
                </motion.span>
              )}
            </div>
          </div>
          
          {/* Total Price */}
          <motion.div 
            className="bg-orange-50 border border-orange-200 text-orange-800 font-bold text-sm sm:text-lg px-2 sm:px-3 py-1 sm:py-2 rounded-lg whitespace-nowrap flex-shrink-0 shadow-sm mt-1 sm:mt-0"
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {price.currency} {(() => {
              if (!selectedHotel) return parseFloat(price.total).toFixed(0);
              const hotelTotal = selectedHotel.totalPrice ? parseFloat(selectedHotel.totalPrice) : 0;
              return (parseFloat(price.total) + hotelTotal).toFixed(0);
            })()}
          </motion.div>
        </div>
      
      {/* Outbound Flight Route */}
      <div className="my-6">
        <motion.h4 
          className="text-sm font-bold mb-3 flex items-center relative z-10"
          whileHover={{ x: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <motion.span 
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-900 border border-orange-200 mr-2"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="mr-1">🛫</span> Outbound Flight
          </motion.span>
        </motion.h4>
          <div className="relative">
            {/* Flight path line with FAQSection theme */}
            <div className="absolute left-1/4 right-1/4 top-1/2 h-[2px] bg-orange-200 -translate-y-1/2 z-0"></div>
            {/* Removed decorative airplane icon to prevent overlap with duration */}
            
            <div className="relative grid grid-cols-[1fr_auto_1fr] items-center mt-4 px-2 sm:px-4">
            {/* Outbound Departure */}
            <motion.div 
              className="text-left pr-3 z-10"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="text-2xl font-bold text-orange-900">{formatTime(itineraries[0].segments[0].departure.at)}</div>
              <div className="text-lg font-medium text-orange-700">{itineraries[0].segments[0].departure.iataCode}</div>
              <div className="text-xs text-orange-800 font-medium">{getCityName(itineraries[0].segments[0].departure.iataCode)}</div>
            </motion.div>
            
            {/* Outbound Duration */}
            <motion.div 
              className="px-4 py-1.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200 text-sm font-medium mx-auto z-20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-orange-900">
                {(() => {
                  const match = outboundDuration.match(/PT(\d+H)?(\d+M)?/);
                  if (!match) return outboundDuration;
                  const hours = (match[1] ? match[1].replace('H', 'h ') : '');
                  const minutes = (match[2] ? match[2].replace('M', 'm') : '');
                  return `${hours}${minutes}`.trim();
                })()}
              </span>
            </motion.div>
            
            {/* Outbound Arrival */}
            <motion.div 
              className="text-right pl-3 z-10"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="text-2xl font-bold text-orange-900">{formatTime(itineraries[0].segments[itineraries[0].segments.length - 1].arrival.at)}</div>
              <div className="text-lg font-medium text-orange-700">{itineraries[0].segments[itineraries[0].segments.length - 1].arrival.iataCode}</div>
              <div className="text-xs text-orange-800 font-medium">{getCityName(itineraries[0].segments[itineraries[0].segments.length - 1].arrival.iataCode)}</div>
              <div className="text-xs text-orange-600 mt-0.5">
                {formatDisplayDate(new Date(itineraries[0].segments[itineraries[0].segments.length - 1].arrival.at))}
              </div>
            </motion.div>
          </div>
          
          {/* Layover Information for Outbound Flight */}
          {outboundSegments.length > 1 && (
            <div className="mt-4 pt-3 border-t border-orange-100">
              <h4 className="text-xs font-medium text-orange-700 uppercase tracking-wider mb-2">
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
            <motion.span 
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-900 border border-orange-200 w-fit"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="mr-1">🛬</span> Return Flight
            </motion.span>
            
          </div>
        
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center mt-4 px-2 sm:px-4">
            {/* Inbound Departure */}
            {/* Flight path line with FAQSection theme */}
            <div className="absolute left-1/4 right-1/4 top-1/2 h-[2px] bg-orange-200 -translate-y-1/2 z-0"></div>
            {/* Removed decorative airplane icon to prevent overlap with duration */}
            
            <motion.div 
              className="text-left pr-3 z-10"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="text-2xl font-bold text-orange-900">{formatTime(itineraries[1].segments[0].departure.at)}</div>
              <div className="text-lg font-medium text-orange-700">{itineraries[1].segments[0].departure.iataCode}</div>
              <div className="text-xs text-orange-800 font-medium">{getCityName(itineraries[1].segments[0].departure.iataCode)}</div>
              <div className="text-xs text-orange-600 mt-0.5">
                {formatDisplayDate(new Date(itineraries[1].segments[0].departure.at))}
              </div>
            </motion.div>
            
            {/* Inbound Duration */}
            <motion.div 
              className="px-4 py-1.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200 text-sm font-medium mx-auto z-20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-orange-900">
                {formatDuration(returnDuration)}
              </span>
            </motion.div>
            
            {/* Inbound Arrival */}
            <motion.div 
              className="text-right pl-3 z-10"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="text-2xl font-bold text-orange-900">{formatTime(itineraries[1].segments[itineraries[1].segments.length - 1].arrival.at)}</div>
              <div className="text-lg font-medium text-orange-700">{itineraries[1].segments[itineraries[1].segments.length - 1].arrival.iataCode}</div>
              <div className="text-xs text-orange-800 font-medium">{getCityName(itineraries[1].segments[itineraries[1].segments.length - 1].arrival.iataCode)}</div>
              <div className="text-xs text-orange-600 mt-0.5">
                {formatDisplayDate(new Date(itineraries[1].segments[itineraries[1].segments.length - 1].arrival.at))}
              </div>
            </motion.div>
          </div>
          
          {/* Layover Information for Return Flight */}
          {returnSegments.length > 1 && (
            <div className="mt-4 pt-3 border-t border-orange-100">
              <h4 className="text-xs font-medium text-orange-700 uppercase tracking-wider mb-2">
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
    </motion.div>
  );
}