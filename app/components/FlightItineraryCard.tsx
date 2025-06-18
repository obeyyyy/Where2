'use client';

import React from 'react';
import Image from 'next/image';
import { FaPlaneDeparture, FaPlaneArrival, FaClock, FaCalendarAlt, FaPlane } from 'react-icons/fa';
import { getAirlineLogoUrl } from './getAirlineLogoUrl';
import { motion } from 'framer-motion';
import { MdAirplanemodeActive } from 'react-icons/md';

interface Segment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  carrierName: string;
  number: string;
  aircraft: { code: string };
}

interface Itinerary {
  segments: Segment[];
  duration: string;
}

interface FlightItineraryCardProps {
  // Original single itinerary props
  itinerary?: Itinerary;
  type?: 'outbound' | 'return';
  date?: string;
  
  // New combined itineraries props
  outboundItinerary?: Itinerary;
  returnItinerary?: Itinerary;
  outboundDate?: string;
  returnDate?: string;
  
  airports: Array<{ iata_code: string; name?: string; city?: string }>;
  className?: string;
  tripType?: 'oneway' | 'roundtrip';
}

export const FlightItineraryCard: React.FC<FlightItineraryCardProps> = ({
  // Original props
  itinerary,
  type = 'outbound',
  date,
  
  // New combined props
  outboundItinerary,
  returnItinerary,
  outboundDate,
  returnDate,
  
  airports,
  className = '',
  tripType = 'oneway'
}) => {
  // Determine if we're using the combined mode or single itinerary mode
  const isCombinedMode = !!(outboundItinerary || returnItinerary);
  
  // Format time for display (24-hour format)
  const formatTime = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
  
  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (duration: string): string => {
    const match = duration.match(/P(?:([0-9]*)D)?T?(?:([0-9]*)H)?(?:([0-9]*)M)?/);
    if (!match) return duration;
    const [_, d, h, m] = match;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m || parts.length === 0) parts.push(`${m || '0'}m`);
    return parts.join(' ');
  };

  const calculateLayover = (arrival: string, departure: string): { hours: number, minutes: number } | null => {
    const arrivalTime = new Date(arrival).getTime();
    const departureTime = new Date(departure).getTime();
    
    if (isNaN(arrivalTime) || isNaN(departureTime)) {
      console.error('Invalid date format in calculateLayover');
      return null;
    }
    
    const diff = departureTime - arrivalTime;
    if (diff < 0) {
      console.error('Negative layover time detected');
      return null;
    }
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { hours: h, minutes: m };
  };

  // Calculate total travel time including layovers
  const calculateTotalTravelTime = (segments: Segment[]): string => {
    if (!segments || !segments.length) return '0h 0m';
    const start = new Date(segments[0].departure.at);
    const end = new Date(segments[segments.length - 1].arrival.at);
    const diff = end.getTime() - start.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  // Format layover time with leading zeros for minutes
  const formatLayover = (layover: { hours: number, minutes: number }): string => {
    const hours = layover.hours > 0 ? `${layover.hours}h ` : '';
    const minutes = `${layover.minutes.toString().padStart(2, '0')}m`;
    return `${hours}${minutes} layover`;
  };
  
  // For single itinerary mode
  let firstSeg: Segment | undefined;
  let lastSeg: Segment | undefined;
  let depAirport: { iata_code: string; name?: string; city?: string } | undefined;
  let arrAirport: { iata_code: string; name?: string; city?: string } | undefined;
  let hasStops = false;
  let totalTravelTime = '0h 0m';
  let totalStops = 0;
  let flightTypeLabel = type === 'outbound' ? 'Outbound Flight' : 'Return Flight';
  
  if (!isCombinedMode && itinerary && itinerary.segments.length > 0) {
    firstSeg = itinerary.segments[0];
    lastSeg = itinerary.segments[itinerary.segments.length - 1];
    depAirport = airports.find(a => a.iata_code === firstSeg?.departure?.iataCode);
    arrAirport = airports.find(a => a.iata_code === lastSeg?.arrival?.iataCode);
    hasStops = itinerary.segments.length > 1;
    totalTravelTime = calculateTotalTravelTime(itinerary.segments);
    totalStops = itinerary.segments.length - 1;
  }

  // For outbound itinerary in combined mode
  let outboundFirstSeg: Segment | undefined;
  let outboundLastSeg: Segment | undefined;
  let outboundDepAirport: { iata_code: string; name?: string; city?: string } | undefined;
  let outboundArrAirport: { iata_code: string; name?: string; city?: string } | undefined;
  let outboundHasStops = false;
  let outboundTotalTravelTime = '0h 0m';
  let outboundTotalStops = 0;
  
  if (outboundItinerary && outboundItinerary.segments.length > 0) {
    outboundFirstSeg = outboundItinerary.segments[0];
    outboundLastSeg = outboundItinerary.segments[outboundItinerary.segments.length - 1];
    outboundDepAirport = airports.find(a => a.iata_code === outboundFirstSeg?.departure?.iataCode);
    outboundArrAirport = airports.find(a => a.iata_code === outboundLastSeg?.arrival?.iataCode);
    outboundHasStops = outboundItinerary.segments.length > 1;
    outboundTotalTravelTime = calculateTotalTravelTime(outboundItinerary.segments);
    outboundTotalStops = outboundItinerary.segments.length - 1;
  }

  // For return itinerary in combined mode
  let returnFirstSeg: Segment | undefined;
  let returnLastSeg: Segment | undefined;
  let returnDepAirport: { iata_code: string; name?: string; city?: string } | undefined;
  let returnArrAirport: { iata_code: string; name?: string; city?: string } | undefined;
  let returnHasStops = false;
  let returnTotalTravelTime = '0h 0m';
  let returnTotalStops = 0;
  
  if (returnItinerary && returnItinerary.segments.length > 0) {
    returnFirstSeg = returnItinerary.segments[0];
    returnLastSeg = returnItinerary.segments[returnItinerary.segments.length - 1];
    returnDepAirport = airports.find(a => a.iata_code === returnFirstSeg?.departure?.iataCode);
    returnArrAirport = airports.find(a => a.iata_code === returnLastSeg?.arrival?.iataCode);
    returnHasStops = returnItinerary.segments.length > 1;
    returnTotalTravelTime = calculateTotalTravelTime(returnItinerary.segments);
    returnTotalStops = returnItinerary.segments.length - 1;
  }
  
  const flightTypeColor = type === 'outbound' ? 'blue' : 'green';

  return (
    <div className={`relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm ${className}`}>
      {/* Header with gradient - Improved mobile flex */}
      <div className={`relative ${type === 'outbound' ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-green-600 to-green-500'} p-3 sm:p-4 text-white`}>
        <div className="absolute top-0 left-0 h-full bg-white/20"></div>
       
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Flight info with icon */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <FaPlane className={`text-white text-xs sm:text-sm ${type === 'outbound' ? 'rotate-45' : 'rotate-[225deg]'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[11px] sm:text-xs font-medium text-white/90 whitespace-nowrap">
                    {flightTypeLabel} • {depAirport?.iata_code} → {arrAirport?.iata_code}
                  </span>
                </div>
                
                {/* Details row */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 sm:mt-2">
                  <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                    <FaCalendarAlt className="text-[8px] sm:text-[10px] flex-shrink-0" />
                    <span className="whitespace-nowrap">{formatDate(date)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                    <FaClock className="text-[8px] sm:text-[10px] flex-shrink-0" />
                    <span className="whitespace-nowrap">{totalTravelTime}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-white/20 whitespace-nowrap">
                    {hasStops ? `${totalStops} Stop${totalStops > 1 ? 's' : ''}` : 'Direct'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 md:p-6">
        {/* Flight Summary */}
        <div className="grid grid-cols-10 items-center gap-1 sm:gap-2 mb-4 sm:mb-6">
          {/* Departure */}
          <div className="col-span-4">
            <div className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-[#5D4037] leading-tight">
              {firstSeg?.departure?.iataCode}
            </div>
            <div className="text-xs xs:text-sm sm:text-base font-semibold text-[#5D4037]">
              {formatTime(firstSeg?.departure?.at)}
            </div>
            <div className="text-[10px] xs:text-xs sm:text-sm text-[#5D4037] truncate">
              {depAirport?.city || depAirport?.name}
            </div>
          </div>

          {/* Flight Path */}
          <div className="col-span-2 flex flex-col items-center px-1">
            <div className="relative w-full p-3">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300"></div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                <MdAirplanemodeActive className="text-gray-500 text-base sm:text-lg" />
              </div>
            </div>
            <div className="text-[10px] xs:text-xs text-gray-500 mt-0.5 sm:mt-1">{totalTravelTime}</div>
          </div>

          {/* Arrival */}
          <div className="col-span-4 text-right">
            <div className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-[#5D4037] leading-tight">
              {lastSeg?.arrival?.iataCode}
            </div>
            <div className="text-xs xs:text-sm sm:text-base font-semibold text-[#5D4037]">
              {formatTime(lastSeg?.arrival?.at)}
            </div>
            <div className="text-[10px] xs:text-xs sm:text-sm text-[#5D4037] truncate">
              {arrAirport?.city || arrAirport?.name}
            </div>
          </div>
        </div>

        {/* Segments */}
        <div className="space-y-4">
          {itinerary?.segments.map((seg, i) => {
            console.log(`Rendering segment ${i + 1} of ${itinerary.segments.length}`);
            const dep = airports.find(a => a.iata_code === seg.departure.iataCode);
            const arr = airports.find(a => a.iata_code === seg.arrival.iataCode);
            
            // Calculate layover only if there's a next segment
            let layover = null;
            if (i < itinerary.segments.length - 1) {
              const nextSeg = itinerary.segments[i + 1];
              console.log(`Calculating layover between segment ${i + 1} and ${i + 2}`);
              console.log('Current segment arrival:', seg.arrival.at);
              console.log('Next segment departure:', nextSeg.departure.at);
              layover = calculateLayover(seg.arrival.at, nextSeg.departure.at);
              console.log('Calculated layover:', layover);
            }
            const segmentDuration = Math.floor(
              (new Date(seg.arrival.at).getTime() - new Date(seg.departure.at).getTime()) / 60000
            );
            const segmentHours = Math.floor(segmentDuration / 60);
            const segmentMinutes = segmentDuration % 60;

            return (
              <div 
                key={`${type}-seg-${i}`}
                className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm"
              >
                {/* Airline Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2 sm:mb-0">
                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 p-1">
                      <img 
                        src={getAirlineLogoUrl(seg.carrierCode)}
                        alt={seg.carrierName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://via.placeholder.com/32/cccccc/ffffff?text=${seg.carrierCode}`;
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{seg.carrierName}</div>
                      <div className="text-xs text-gray-500">Flight {seg.carrierCode}-{seg.number}</div>
                    </div>
                  </div>
                  
                </div>

                {/* Flight Details */}
                <div className="grid grid-cols-12 gap-2 items-center text-md">
                  {/* Departure */}
                  <div className="col-span-4 pr-2">
                    <div className="font-semibold text-gray-900">{formatTime(seg.departure.at)}</div>
                    <div className="text-sm text-gray-700">{seg.departure.iataCode}</div>
                    <div className="text-xs text-gray-500 truncate">{dep?.city || dep?.name}</div>
                  </div>

                  {/* Duration */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div className="relative w-full">
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <MdAirplanemodeActive className={`text-${flightTypeColor}-500 -rotate-90 text-lg`} />
                      </div>
                      <div className="w-full flex items-center px-2">
                        <div className="flex-1 h-0.5 bg-gray-500"></div>
                        <div className="mx-2 text-sm text-gray-500 font-bold">•</div>
                        <div className="flex-1 h-0.5 bg-gray-500"></div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {segmentHours > 0 ? `${segmentHours}h ` : ''}{segmentMinutes}m
                    </div>
                  </div>

                  {/* Arrival */}
                  <div className="col-span-4 text-right pl-2">
                    <div className="font-semibold text-gray-900">{formatTime(seg.arrival.at)}</div>
                    <div className="text-sm text-gray-700">{seg.arrival.iataCode}</div>
                    <div className="text-xs text-gray-500 truncate">{arr?.city || arr?.name}</div>
                  </div>
                </div>

                {/* Layover */}
                {layover && (
                  <div className="mt-3 text-center">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <FaClock className="mr-1.5" />
                      {formatLayover(layover)} at {arr?.iata_code}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};