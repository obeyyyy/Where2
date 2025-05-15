// app/components/TripCard.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTripCart } from './TripCartContext';

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
}

// Helper function to get airline logo URL
const getAirlineLogoUrl = (carrierCode: string) => {
  return `https://content.airhex.com/content/logos/airlines_${carrierCode}_100_50_r.png`;
};

import HotelCard from './HotelCard';

export default function TripCard({ trip, budget, searchParams }: TripCardProps) {
  // Removed setTrip effect to avoid infinite update loop in summary view
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
  const returnSegment = itineraries?.[1]?.segments?.[0];

  // For UI: destination, dates, nights
  // Robust fallback for Kiwi and Amadeus
  const destination = outbound?.arrival?.iataCode || outbound?.arrival?.iataCode || outbound?.arrival?.iataCode || 'N/A';
  const origin = outbound?.departure?.iataCode || outbound?.departure?.iataCode || outbound?.departure?.iataCode || 'N/A';
  // Robust ISO8601 parsing and fallback for invalid dates
  const parseDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };
  const departureDate = parseDate(outbound?.departure?.at);
  const arrivalDate = parseDate(outbound?.arrival?.at);
  const returnDate = returnSegment?.arrival?.at ? new Date(returnSegment.arrival.at) : null;
  const nights = departureDate && returnDate ? Math.max(1, Math.round((+returnDate - +departureDate) / (1000 * 60 * 60 * 24))) : null;

  // Flight details for stops
  const segments = itineraries?.[0]?.segments || [];
  const stops = segments.length - 1;
  const stopsLabel = stops === 0 ? 'Nonstop' : `${stops} Stop${stops > 1 ? 's' : ''}`;
  const stopsColor = stops === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

  // Airline logo (first segment)
  const carrierCode = outbound?.operating?.carrierCode || outbound?.carrierCode || '';
  const logoUrl = carrierCode ? getAirlineLogoUrl(carrierCode) : '';
  const airlineName = carrierCode || 'Unknown Airline';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (duration: string) => {
    // Format duration from PT2H30M to 2h 30m
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    const hours = (match[1] ? match[1].replace('H', 'h ') : '');
    const minutes = (match[2] ? match[2].replace('M', 'm') : '');
    return `${hours}${minutes}`.trim();
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-0 mb-10 flex flex-col md:flex-row overflow-hidden border border-yellow-100">
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
      {/* Right: Hotel Info */}
      <div className="md:w-1/2 w-full bg-gradient-to-br from-[#fff] to-[#fffbe6] px-8 py-8 flex flex-col justify-between border-l border-yellow-50">
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
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-50" />


          {/* Book Button, Total Price, and (optionally) under budget */}
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex justify-between items-center">
              {(() => {
                // Calculate total price based on whether a hotel is selected
                let hotelTotal = 0;
                if (selectedHotelIdx !== null && pagedHotels[selectedHotelIdx]) {
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
                if (selectedHotelIdx === null) {
                  return parseFloat(price.total).toFixed(0);
                }
                // Otherwise add hotel price to flight price
                const selectedHotel = pagedHotels[selectedHotelIdx];
                const hotelTotal = selectedHotel?.totalPrice ? parseFloat(selectedHotel.totalPrice) : 0;
                return (parseFloat(price.total) + hotelTotal).toFixed(0);
              })()}</span>
            </div>
            <button
              onClick={() => {
                // Save the full trip object (including searchParams) for booking
                localStorage.setItem('current_booking_offer', JSON.stringify({
                  trip,
                  searchParams,
                  budget
                }));
                window.location.href = '/book';
              }}
              className="w-full bg-gradient-to-br from-[#FFA500] to-[#FF8C00]
              text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:from-[#FF8C00] 
              hover:to-[#FFA500] transition mt-2"
            >
              Book Package
            </button>
            {trip.deep_link ? (
              <a
                href={trip.deep_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block text-center bg-[#00BFAE] hover:bg-[#00897B] text-white px-6 py-3 rounded-lg font-bold shadow-lg transition mt-2"
                style={{ textDecoration: 'none' }}
              >
                Book on Kiwi.com
              </a>
            ) : (
              <div className="w-full text-center text-xs text-gray-400 mt-2">
                Booking link not available for this flight.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
