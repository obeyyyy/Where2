// app/components/TripCard.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTripCart } from './TripCartContext';
import { useRouter } from 'next/navigation';

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
  searchParams: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    tripType: string;
    nights: number;
    travelers: number;
    currency: string;
    budget: number;
    includeHotels: boolean;
    useKiwi: boolean;
    useDuffel: boolean;
  };
  flightType?: 'outbound' | 'return' | 'oneway';
  onSelect?: () => void;
  selected?: boolean;
}

// Helper function to get airline logo URL
const getAirlineLogoUrl = (carrierCode: string) => {
  return `https://content.airhex.com/content/logos/airlines_${carrierCode}_100_50_r.png`;
};

import HotelCard from './HotelCard';

export default function TripCard({ trip, budget, searchParams, flightType = 'outbound', onSelect, selected }: TripCardProps) {
  // Get the trip cart context for saving to trip summary
  const { setTrip: setTripInCart } = useTripCart();
  const router = useRouter();
  
  // Hotel pagination state
  const [hotelPage, setHotelPage] = useState(0);
  // Can be null if no hotel is selected (flight only option)
  const [selectedHotelIdx, setSelectedHotelIdx] = useState<number | null>(0);
  const HOTELS_PER_PAGE = 3; // Changed to 3 for better initial view
  const HOTELS_NEXT_COUNT = 5;

  // If trip is missing, show a message (handle as a view state)
  if (!trip) {
    return <div className="text-center p-4">No flight data available</div>;
  }



  // Destructure trip data first
  const { price: tripPrice, itineraries = [], hotels = [] } = trip;
  
  // Get the appropriate price based on flight type and breakdown
  const getFlightPrice = () => {
    if (!tripPrice) return { total: '0', currency: 'USD' };
    
    // Log the incoming price data for debugging
    console.log(`[${flightType}] Price data:`, {
      tripPrice,
      hasBreakdown: !!tripPrice.breakdown,
      breakdown: tripPrice.breakdown
    });
    
    // If we have a breakdown, use the appropriate price
    if (tripPrice.breakdown) {
      if (flightType === 'return' && tripPrice.breakdown.return !== undefined) {
        return {
          total: tripPrice.breakdown.return,
          currency: tripPrice.currency || 'USD',
          isBreakdown: true
        };
      } else if (flightType === 'outbound' && tripPrice.breakdown.outbound !== undefined) {
        return {
          total: tripPrice.breakdown.outbound,
          currency: tripPrice.currency || 'USD',
          isBreakdown: true
        };
      }
    }
    
    // Default to the full price if no breakdown or if flight type doesn't match
    return {
      total: tripPrice.total || '0',
      currency: tripPrice.currency || 'USD',
      isBreakdown: false
    };
  };
  
  const price = getFlightPrice();
  
  // Format price for display
  const formatPrice = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(0);
  };
  
  // Get the display price with currency
  const displayPrice = `${price.currency} ${formatPrice(price.total)}`;

  const pagedHotels = hotels.slice(0, HOTELS_PER_PAGE + hotelPage * HOTELS_NEXT_COUNT);
  const hasMoreHotels = pagedHotels.length < hotels.length;

  const outbound = flightType === 'return' ? itineraries?.[0]?.segments?.[0] : itineraries?.[0]?.segments?.[0];
  const returnSegments = flightType === 'return' ? itineraries?.[0]?.segments || [] : itineraries?.[1]?.segments || []; // For return flights, use the first itinerary's segments
  const returnSegment = flightType === 'return' ? returnSegments[0] : itineraries?.[1]?.segments?.[0];
  const carrierCode = flightType === 'return' ? returnSegment?.operating?.carrierCode || returnSegment?.carrierCode : outbound?.operating?.carrierCode || outbound?.carrierCode || '';
  const logoUrl = carrierCode ? getAirlineLogoUrl(carrierCode) : '';
  const airlineName = carrierCode || 'Unknown Airline';

  // For the main flight segment, use the first segment of the first itinerary
  const flightSegment = outbound;
  // For flight segments, use all segments of the first itinerary for outbound, or all return segments for return
  const flightSegments = flightType === 'return' ? returnSegments : (itineraries?.[0]?.segments || []);

  // Debug logging
  console.log('TripCard Debug:', {
    flightType,
    flightSegment: flightSegment,
    returnSegment: returnSegment,
    outbound: outbound,
    price: price,
    displayPrice: displayPrice,
    departureDate: flightSegment?.departure?.at,
    arrivalDate: flightSegment?.arrival?.at
  });

  // For return flights, use the full journey from the return segments
  const origin = flightType === 'return' 
    ? returnSegments[0]?.departure?.iataCode || 'N/A' 
    : outbound?.departure?.iataCode || 'N/A';
  const destination = flightType === 'return'
    ? returnSegments[returnSegments.length - 1]?.arrival?.iataCode || 'N/A'
    : outbound?.arrival?.iataCode || 'N/A';

  // Robust ISO8601 parsing and fallback for invalid dates
  const parseDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Get and validate dates from the flight data
  const getValidDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const departureDate = getValidDate(
    flightType === 'return' 
      ? returnSegments[0]?.departure?.at 
      : outbound?.departure?.at
  );
  
  const arrivalDate = getValidDate(
    flightType === 'return'
      ? returnSegments[returnSegments.length - 1]?.arrival?.at
      : outbound?.arrival?.at
  );

  // Log detailed flight information for debugging
  console.log(`Flight Card [${flightType}]:`, {
    origin,
    destination,
    departure: departureDate?.toISOString(),
    arrival: arrivalDate?.toISOString(),
    price: trip.price,
    segments: flightType === 'return' ? returnSegments : [outbound],
    searchParams: searchParams
  });

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
  
  const totalDuration = flightType === 'return' 
    ? calculateTotalDuration(returnSegments)
    : itineraries?.[0]?.duration || 'PT0H0M';

  // Calculate stops information
  const stops = flightType === 'return' 
    ? Math.max(0, returnSegments.length - 1) 
    : Math.max(0, (itineraries?.[0]?.segments?.length || 1) - 1);
  const stopsLabel = stops === 0 ? 'Nonstop' : `${stops} Stop${stops > 1 ? 's' : ''}`;
  const stopsColor = stops === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

  // Format duration
  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    const hours = (match[1] ? match[1].replace('H', 'h ') : '');
    const minutes = (match[2] ? match[2].replace('M', 'm') : '');
    return `${hours}${minutes}`.trim();
  };

  // Calculate nights (only for outbound flights)
  const nights = flightType === 'outbound' && departureDate && arrivalDate ? 
    Math.max(1, Math.round((+arrivalDate - +departureDate) / (1000 * 60 * 60 * 24))) : null;

  // Debug logging for price and flight data
  if (flightType === 'return' || flightType === 'outbound') {
    console.log(`[${flightType}] Trip data:`, {
      price: price,
      tripPrice: trip.price,
      segments: flightType === 'return' ? returnSegments : itineraries?.[0]?.segments,
      origin,
      destination,
      departureDate: flightType === 'return' 
        ? returnSegments[0]?.departure?.at 
        : outbound?.departure?.at,
      arrivalDate: flightType === 'return'
        ? returnSegments[returnSegments.length - 1]?.arrival?.at
        : outbound?.arrival?.at
    });
  }

  // Card for selecting a single flight (outbound or return)
  if (onSelect && !selected) {
    return (
      <div className={`w-full max-w-3xl mx-auto bg-white rounded-3xl shadow-lg p-6 mb-6 border border-yellow-100 hover:shadow-xl transition-shadow flex flex-col md:flex-row items-center gap-4 ${selected ? 'ring-2 ring-[#FFA500]' : ''}`}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-10 h-10 bg-white rounded-lg shadow border flex items-center justify-center">
              {logoUrl && <Image src={logoUrl} alt={`${airlineName} logo`} fill className="object-contain p-1" unoptimized={true} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="font-bold text-gray-800">
                  {origin} → {destination}
                </div>
                {flightType === 'return' && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    Return
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {departureDate && arrivalDate ? (
                  <>
                    <span className="font-medium">{formatDisplayDate(departureDate)}</span>
                    {flightType === 'return' && (
                      <span className="mx-2">→</span>
                    )}
                    {flightType === 'return' && (
                      <span className="font-medium">{formatDisplayDate(arrivalDate)}</span>
                    )}
                  </>
                ) : (
                  <span>No date information available</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>{formatTime(flightType === 'return' ? returnSegment?.departure?.at : outbound?.departure?.at ?? '')} - {formatTime(flightType === 'return' ? returnSegment?.arrival?.at : outbound?.arrival?.at ?? '')}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${stopsColor}`}>{stopsLabel}</span>
            <span className="font-medium text-[#FF8C00]">
              {displayPrice}
              {price.isBreakdown && (
                <span className="text-xs text-gray-500 ml-1">
                  ({flightType === 'outbound' ? 'outbound' : 'return'})
                </span>
              )}
            </span>
          </div>
        </div>
        <button
          onClick={onSelect}
          className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:from-[#FF8C00] hover:to-[#FFA500] transition whitespace-nowrap"
        >
          {flightType === 'outbound' ? 'Select Outbound Flight' : 'Select Return Flight'}
        </button>
      </div>
    );
  }

  // Full card view (either one-way or selected round-trip)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    }
  };

  // COMPACT MODE: If only one itinerary (outbound or return), render single-column card
  if (itineraries.length === 1) {
    return (
      <div className={`w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-lg p-6 mb-6 border border-yellow-100 hover:shadow-xl transition-shadow flex flex-col items-center gap-4 ${selected ? 'ring-2 ring-[#FFA500]' : ''}`}
        onClick={onSelect}
        style={{ cursor: onSelect ? 'pointer' : 'default' }}
      >
        <div className="flex items-center gap-4 mb-5 w-full">
          <div className="relative w-14 h-14 bg-white rounded-xl shadow border flex items-center justify-center">
            {logoUrl && <Image src={logoUrl} alt={`${airlineName} logo`} fill className="object-contain p-2" unoptimized={true} />}
          </div>
          <div>
            <div className="font-bold text-xl text-gray-800">{origin} → {destination}</div>
            <div className="text-gray-500 text-sm">{departureDate ? formatDate(flightSegment?.departure?.at || '') : ''}</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 mb-6 w-full">
          <div className="text-center">
            <div className="font-bold text-2xl text-[#FFA500]">{formatTime(flightType === 'return' ? returnSegment?.departure?.at : outbound?.departure?.at ?? '')}</div>
            <div className="text-xs text-gray-500">{origin}</div>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${stopsColor} shadow-sm`}>{stopsLabel}</span>
              <span className="text-xs text-gray-400">{itineraries?.[0]?.duration ? formatDuration(itineraries?.[0]?.duration) : ''}</span>
            </div>
            <div className="w-full h-0.5 bg-gradient-to-r from-[#FFA500] via-yellow-200 to-[#FFA500] my-2 rounded-full" />
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-[#FFA500]">{formatTime(flightType === 'return' ? returnSegment?.arrival?.at : outbound?.arrival?.at ?? '')}</div>
            <div className="text-xs text-gray-500">{destination}</div>
          </div>
        </div>
        <div className="flex justify-between mb-4 w-full">
          <div className="text-sm text-gray-600">{airlineName} {flightSegment?.number || ''}</div>
          <div className="text-sm text-gray-600">{flightSegments.length} segment{flightSegments.length > 1 ? 's' : ''}</div>
        </div>
        <div className="mt-6 w-full flex flex-row items-center justify-between">
          <div className="bg-[#FFF8E1] px-4 py-2 rounded-md inline-block">
            <span className="text-xl font-bold text-[#FF8C00]">
              {displayPrice}
              {price.isBreakdown && (
                <span className="text-xs text-gray-500 ml-1">
                  ({flightType === 'outbound' ? 'outbound' : 'return'})
                </span>
              )}
            </span>
          </div>
          {onSelect && !selected && (
            <button
              onClick={onSelect}
              className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:from-[#FF8C00] hover:to-[#FFA500] transition whitespace-nowrap ml-4"
            >
              {flightType === 'outbound' ? 'Select Outbound Flight' : 'Select Return Flight'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default: full card view (for roundtrip with both legs or hotel info)
  return (
    <div 
      className={`bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all duration-200 cursor-pointer ${selected ? 'border-[#FFA500] ring-2 ring-[#FFA500]/20' : 'border-transparent hover:border-gray-200'}`}
      onClick={handleClick}
    >
      {/* Left: Flight Info */}
      <div className="md:w-1/2 w-full bg-gradient-to-br from-[#fffbe6] to-[#fff] px-8 py-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative w-14 h-14 bg-white rounded-xl shadow border flex items-center justify-center">
              {logoUrl && <Image src={logoUrl} alt={`${airlineName} logo`} fill className="object-contain p-2" unoptimized={true} />}
            </div>
            <div>
              <div className="font-bold text-xl text-gray-800">{origin} → {destination}</div>
              <div className="text-gray-500 text-sm">{departureDate ? formatDate(flightSegment?.departure?.at || '') : ''}</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-6 mb-6">
            <div className="text-center">
              <div className="font-bold text-2xl text-[#FFA500]">
                {formatTime(flightType === 'return' 
                  ? returnSegments[0]?.departure?.at 
                  : outbound?.departure?.at ?? '')}
              </div>
              <div className="text-xs text-gray-500">{origin}</div>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${stopsColor} shadow-sm`}>
                  {stopsLabel}
                </span>
                <span className="text-xs text-gray-400">
                  {flightType === 'return' ? formatDuration(totalDuration) : (itineraries?.[0]?.duration ? formatDuration(itineraries[0].duration) : '')}
                </span>
              </div>
              <div className="w-full h-0.5 bg-gradient-to-r from-[#FFA500] via-yellow-200 to-[#FFA500] my-2 rounded-full" />
              {flightType === 'return' && returnSegments.length > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  Via {returnSegments.length - 1} connection{returnSegments.length > 2 ? 's' : ''}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-[#FFA500]">
                {formatTime(flightType === 'return'
                  ? returnSegments[returnSegments.length - 1]?.arrival?.at
                  : outbound?.arrival?.at ?? '')}
              </div>
              <div className="text-xs text-gray-500">{destination}</div>
            </div>
          </div>
          <div className="flex justify-between mb-4">
            <div className="text-sm text-gray-600">{airlineName} {flightSegment?.number || ''}</div>
            <div className="text-sm text-gray-600">{flightSegments.length} segment{flightSegments.length > 1 ? 's' : ''}</div>
          </div>
        </div>
        {/* Flight Price: bottom left */}
        <div className="mt-6">
          <div className="flex flex-col">
            <div className="bg-[#FFF8E1] px-4 py-2 rounded-md inline-block">
              <span className="text-xl font-bold text-[#FF8C00]">
                {price.currency} {parseFloat(price.total).toFixed(0)}
              </span>
            </div>
            <span className="text-xs text-gray-500 mt-1 ml-1">Flight only</span>
          </div>
        </div>
        
      </div>
      {/* Right: Return Flight or Hotel Info */}
      <div className="md:w-1/2 w-full bg-gradient-to-br from-[#fff] to-[#fffbe6] px-8 py-8 flex flex-col justify-between border-l border-yellow-50">
        {searchParams.tripType === 'round-trip' && returnSegments.length > 0 && (
  <div className="mb-8">
    <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
      <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full mr-2">Return</span>
      {destination} → {origin}
    </h4>
    <div className="space-y-3">
      {returnSegments.map((seg, idx) => (
        <div key={idx} className="bg-white rounded-xl p-4 border border-yellow-100 shadow-sm">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="text-sm">
              <div className="text-gray-600 font-medium">
                {formatDisplayTime(getValidDate(seg.departure?.at))} - {formatDisplayTime(getValidDate(seg.arrival?.at))}
              </div>
              <div className="text-gray-500 text-xs mt-0.5">
                {calculateTotalDuration([seg])}
                {returnSegments.length > 1 && ` • ${returnSegments.length - 1} ${returnSegments.length === 2 ? 'stop' : 'stops'}`}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{seg.departure?.iataCode} → {seg.arrival?.iataCode}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${stopsColor}`}>
              {/* Show stops for the whole return itinerary only on the first segment */}
              {idx === 0 ? `${returnSegments.length - 1} Stop${returnSegments.length > 2 ? 's' : ''}` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{seg.carrierCode} {seg.number}</span>
            <span>{formatDuration(itineraries[1]?.duration || '')}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">Accommodation</h4>
              <p className="text-xs text-gray-500">Your stay</p>
            </div>
            {nights && (
              <span className="text-xs font-medium text-gray-600 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100">
                {nights} night{nights > 1 ? 's' : ''}
              </span>
            )}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{returnSegment.departure?.iataCode} → {returnSegment.arrival?.iataCode}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${stopsColor}`}>
                {returnSegments.length - 1} Stop{returnSegments.length > 2 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{returnSegment.carrierCode} {returnSegment.number}</span>
              <span>{formatDuration(itineraries[1]?.duration || '')}</span>
            </div>
          </div>
        </div>
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-bold text-gray-800 mb-1">Accommodation</h4>
            <p className="text-xs text-gray-500">Your stay</p>
          </div>
          {nights && (
            <span className="text-xs font-medium text-gray-600 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100">
              {nights} night{nights > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {trip.hotels && trip.hotels.length > 0 ? (
          <div className="relative">
            {/* Display the chosen hotel info (first in array) */}
            <HotelCard
              key={trip.hotels[0].offerId || 0}
              hotel={trip.hotels[0]}
              idx={0}
              selected={true}
              nights={nights}
              onSelect={() => {}}
              sentiment={trip.hotels[0].sentiment}
            />
          </div>
        ) : (
          <button
            className="w-full bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:from-[#FF8C00] hover:to-[#FFA500] transition mt-2"
            onClick={() => {
              const params = new URLSearchParams({
                tripId: trip.id,
                origin: searchParams.origin,
                destination: searchParams.destination,
                departureDate: searchParams.departureDate,
                returnDate: searchParams.returnDate,
                tripType: searchParams.tripType,
                nights: searchParams?.nights?.toString() || "0",
                travelers: searchParams?.travelers?.toString() || "1",
                currency: searchParams?.currency || "USD",
                budget: searchParams?.budget?.toString() || "0",
              });
              window.location.href = `/choose-hotel?${params.toString()}`;
            }}
          >
            Search a hotel
          </button>
        )}
      </div>
      <div className="my-6 h-px bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-50" />
      {/* Book Button, Total Price, and (optionally) under budget */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="flex justify-between items-center">
          {(() => {
            // Calculate total price based on whether a hotel is selected
            let hotelTotal = 0;
            if (selectedHotelIdx !== null && selectedHotelIdx !== undefined && pagedHotels && pagedHotels[selectedHotelIdx]) {
              const selectedHotel = pagedHotels[selectedHotelIdx];
              hotelTotal = selectedHotel?.totalPrice ? parseFloat(selectedHotel.totalPrice) : 0;
            }
            const totalPrice = parseFloat(price.total) + hotelTotal;
            const underBudget = budget - totalPrice;
            return underBudget > 0 ? (
              <span className="text-green-600 bg-green-50 rounded-full px-3 py-1 text-xs font-semibold">
                ${underBudget.toFixed(0)} under budget
              </span>
            ) : null;
          })()}
          <span className="text-lg font-bold text-[#FFA500] ml-auto">Total: {price.currency} {(() => {
            // If no hotel is selected (selectedHotelIdx is null), only show flight price
            if (selectedHotelIdx === null || selectedHotelIdx === undefined || !pagedHotels[selectedHotelIdx]) {
              return parseFloat(price.total).toFixed(0);
            }
            // Otherwise add hotel price to flight price
            const selectedHotel = pagedHotels[selectedHotelIdx];
            const hotelTotal = selectedHotel?.totalPrice ? parseFloat(selectedHotel.totalPrice) : 0;
            return (parseFloat(price.total) + hotelTotal).toFixed(0);
          })()}</span>
        </div>
        <div className="flex gap-2">
          {searchParams.tripType === 'roundtrip' && (
            <button
              onClick={() => {
                // Save to TripCartContext for Trip Summary
                setTripInCart({
                  id: trip.id,
                  trip: {
                    ...trip,
                    itineraries: [
                      ...(trip.itineraries || [])
                    ]
                  },
                  searchParams: {
                    ...searchParams,
                    tripType: 'roundtrip' as const
                  }
                });
                
                // Navigate to trip summary
                router.push('/trip-summary');
              }}
              className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:from-blue-600 hover:to-blue-500 transition mt-2"
            >
              View Summary
            </button>
          )}
          
          <button
            onClick={() => {
              const isOneWay = searchParams.tripType === 'oneway';
              
              // For one-way trips, ensure we only have one itinerary
              const tripToBook = isOneWay 
                ? {
                    ...trip,
                    itineraries: [trip.itineraries[0]]
                  }
                : trip;
                
              // Prepare the trip data in the format expected by the booking page
              const bookingData = {
                id: trip.id,
                trip: {
                  ...tripToBook,
                  price: {
                    ...tripToBook.price,
                    breakdown: {
                      outbound: tripToBook.price.total,
                      return: isOneWay ? '0' : (tripToBook.price.breakdown?.return || '0')
                    }
                  }
                },
                searchParams: {
                  ...searchParams,
                  // Make sure the return date is cleared for one-way trips
                  returnDate: isOneWay ? '' : searchParams.returnDate,
                  tripType: isOneWay ? 'oneway' as const : 'roundtrip' as const
                },
                totalPrice: tripToBook.price.total
              };

              // Save to TripCartContext for booking
              setTripInCart(bookingData);
              
              console.log('Saving booking data:', bookingData);
              localStorage.setItem('current_booking_offer', JSON.stringify(bookingData));
              
              // Use router instead of window.location for better navigation
              router.push('/trip-summary');
            }}
            className="flex-1 bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:from-[#FF8C00] hover:to-[#FFA500] transition mt-2"
          >
            Book Package
          </button>
        </div>
      </div>
    </div>
  );
}
