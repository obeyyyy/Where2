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
  flightType?: 'outbound' | 'return';
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



  const { price, itineraries, hotels = [] } = trip;

  const pagedHotels = hotels.slice(0, HOTELS_PER_PAGE + hotelPage * HOTELS_NEXT_COUNT);
  const hasMoreHotels = pagedHotels.length < hotels.length;

  

  const outbound = itineraries?.[0]?.segments?.[0];
  const returnSegments = itineraries?.[1]?.segments || [];
  const returnSegment = returnSegments[0];
  console.log("outbound", outbound);
  console.log("itineraries", itineraries);
  
  
  // Get logo URL and airline name for display
  const carrierCode = outbound?.operating?.carrierCode || outbound?.carrierCode || '';
  const logoUrl = carrierCode ? getAirlineLogoUrl(carrierCode) : '';
  const airlineName = carrierCode || 'Unknown Airline';
  
  // Format date and time for display
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

  // For UI: destination, dates, nights
  // Robust fallback for Kiwi and Amadeus
  const destination = outbound?.arrival?.iataCode || 'N/A';
  const origin = outbound?.departure?.iataCode || 'N/A';
  
  // Robust ISO8601 parsing and fallback for invalid dates
  const parseDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };
  
  // Handle dates differently based on flight type
  let departureDate, arrivalDate, returnDate;
  
  if (flightType === 'return' && returnSegment) {
    // For return flights, use the return segment dates
    departureDate = parseDate(returnSegment.departure?.at);
    arrivalDate = parseDate(returnSegment.arrival?.at);
    returnDate = null; // No need for returnDate in this case
  } else {
    // For outbound flights, use the outbound segment dates
    departureDate = parseDate(outbound?.departure?.at);
    arrivalDate = parseDate(outbound?.arrival?.at);
    returnDate = returnSegment?.arrival?.at ? new Date(returnSegment.arrival.at) : null;
  }
  const nights = departureDate && returnDate ? Math.max(1, Math.round((+returnDate - +departureDate) / (1000 * 60 * 60 * 24))) : null;

  const formatDuration = (duration: string) => {
    // Format duration from PT2H30M to 2h 30m
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    const hours = (match[1] ? match[1].replace('H', 'h ') : '');
    const minutes = (match[2] ? match[2].replace('M', 'm') : '');
    return `${hours}${minutes}`.trim();
  };
  
  // Calculate stops information
  const segments = itineraries?.[0]?.segments || [];
  const stops = segments.length - 1;
  const stopsLabel = stops === 0 ? 'Nonstop' : `${stops} Stop${stops > 1 ? 's' : ''}`;
  const stopsColor = stops === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

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
              <h3 className="font-bold text-gray-800">{origin} → {destination}</h3>
              <p className="text-sm text-gray-500">
                {departureDate ? formatDate(outbound?.departure?.at || '') : ''}
                {returnDate ? ` - ${formatDate(returnSegment?.arrival?.at || '')}` : ''}
              </p>
            </div>
          </div>
          
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>{formatTime(outbound?.departure?.at ?? '')} - {formatTime(outbound?.arrival?.at ?? '')}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${stopsColor}`}>{stopsLabel}</span>
            <span className="font-medium text-[#FF8C00]">{price.currency} {parseFloat(price.total).toFixed(0)}</span>
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
            <div className="text-gray-500 text-sm">{departureDate ? formatDate(outbound?.departure?.at || '') : ''} {returnDate ? `- ${formatDate(returnSegment?.arrival?.at || '')}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 mb-6 w-full">
          <div className="text-center">
            <div className="font-bold text-2xl text-[#FFA500]">{formatTime(outbound?.departure?.at ?? '')}</div>
            <div className="text-xs text-gray-500">{origin}</div>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${stopsColor} shadow-sm`}>{stopsLabel}</span>
              <span className="text-xs text-gray-400">{outbound && itineraries[0]?.duration ? formatDuration(itineraries[0].duration) : ''}</span>
            </div>
            <div className="w-full h-0.5 bg-gradient-to-r from-[#FFA500] via-yellow-200 to-[#FFA500] my-2 rounded-full" />
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-[#FFA500]">{formatTime(outbound?.arrival?.at ?? '')}</div>
            <div className="text-xs text-gray-500">{destination}</div>
          </div>
        </div>
        <div className="flex justify-between mb-4 w-full">
          <div className="text-sm text-gray-600">{airlineName} {outbound?.number || ''}</div>
          <div className="text-sm text-gray-600">{segments.length} segment{segments.length > 1 ? 's' : ''}</div>
        </div>
        <div className="mt-6 w-full flex flex-row items-center justify-between">
          <div className="bg-[#FFF8E1] px-4 py-2 rounded-md inline-block">
            <span className="text-xl font-bold text-[#FF8C00]">
              {price.currency} {parseFloat(price.total).toFixed(0)}
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
              <div className="text-gray-500 text-sm">{departureDate ? formatDate(outbound?.departure?.at || '') : ''} {returnDate ? `- ${formatDate(returnSegment?.arrival?.at || '')}` : ''}</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-6 mb-6">
            <div className="text-center">
              <div className="font-bold text-2xl text-[#FFA500]">{formatTime(outbound?.departure?.at ?? '')}</div>
              <div className="text-xs text-gray-500">{origin}</div>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${stopsColor} shadow-sm`}>{stopsLabel}</span>
                <span className="text-xs text-gray-400">{outbound && itineraries[0]?.duration ? formatDuration(itineraries[0].duration) : ''}</span>
              </div>
              <div className="w-full h-0.5 bg-gradient-to-r from-[#FFA500] via-yellow-200 to-[#FFA500] my-2 rounded-full" />
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-[#FFA500]">{formatTime(outbound?.arrival?.at ?? '')}</div>
              <div className="text-xs text-gray-500">{destination}</div>
            </div>
          </div>
          <div className="flex justify-between mb-4">
            <div className="text-sm text-gray-600">{airlineName} {outbound?.number || ''}</div>
            <div className="text-sm text-gray-600">{segments.length} segment{segments.length > 1 ? 's' : ''}</div>
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
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">
              {formatTime(seg.departure?.at ?? '')} - {formatTime(seg.arrival?.at ?? '')}
            </div>
            <span className="text-sm text-gray-500">
              {formatDate(seg.departure?.at ?? '')}
            </span>
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
          <button
            onClick={() => {
              // Save to TripCartContext for Trip Summary
              setTripInCart({
                id: trip.id,
                trip: trip
              });
              
              // Also save to localStorage for booking
              localStorage.setItem('current_booking_offer', JSON.stringify({
                trip,
                searchParams,
                budget
              }));
              
              // Navigate to trip summary
              router.push('/trip-summary');
            }}
            className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg hover:from-blue-600 hover:to-blue-500 transition mt-2"
          >
            View Summary
          </button>
          
          <button
            onClick={() => {
              // Save the full trip object (including searchParams) for booking
              localStorage.setItem('current_booking_offer', JSON.stringify({
                trip,
                searchParams,
                budget
              }));
              
              // Use router instead of window.location for better navigation
              router.push('/book');
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
