'use client';

import React from 'react';
import Image from 'next/image';
import { FaPlaneDeparture, FaPlaneArrival, FaClock, FaCalendarAlt, FaPlane } from 'react-icons/fa';
import { getAirlineLogoUrl } from './getAirlineLogoUrl';
import { motion, AnimatePresence } from 'framer-motion';
import { MdAirplanemodeActive } from 'react-icons/md';
import { Airport } from '@duffel/components';
import airportsJson from 'airports-json';

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
  
  const flightTypeColor = type === 'outbound' ? 'blue' : 'orange';
  const flightTypeIcon = type === 'outbound' ? 'rotate-45' : 'rotate-[225deg]';
  const getCityName = (iataCode: string): string => {
    if (!iataCode) return '';
    const code = iataCode.toUpperCase();
    
    // First try direct lookup
    const airport: Airport = (airportsJson as any)[code] || (airportsJson as any).airports?.[code];

    if (airport?.name) return airport.name;
    
    // Fallback search if needed
    const airportsList: Airport[] = (airportsJson as any).airports 
      ? Object.values((airportsJson as any).airports)
      : Object.values(airportsJson as any);
      
    const found = airportsList.find((a: Airport) => 
      (a.iata_code || a.iata_code) === code
    );
    if (found?.name) return found.name;
    return code;
  };

  return (
    <motion.div 
      className={`bg-white rounded-3xl border border-orange-200 shadow-lg overflow-hidden w-full ${className || ''}`}
      whileHover={{ boxShadow: "0 8px 24px rgba(255, 165, 0, 0.15)" }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
    >
      {/* Header */}
      <div className={`relative ${type === 'outbound' ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB400]' : 'bg-gradient-to-r from-[#FF7A00] via-[#FF9A00] to-[#FFD700]'} p-4 sm:p-5 text-white overflow-hidden`}>
        {/* Vacation-themed decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300/30 to-orange-400/30 -mr-8 -mt-8 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-gradient-to-tr from-[#00B4D8]/20 to-[#90E0EF]/20 -ml-6 -mb-6 blur-lg"></div>
        
        <div className="absolute top-0 left-0 h-full w-full bg-white/10 backdrop-blur-sm"></div>
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 relative z-10">

          {/* Flight info with icon */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <motion.div 
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 shadow-sm`}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <FaPlane className={`text-white text-sm sm:text-base ${flightTypeIcon}`} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm sm:text-base font-semibold text-white whitespace-nowrap">
                    {flightTypeLabel} • {depAirport?.iata_code} → {arrAirport?.iata_code}
                  </span>
                </div>
                
                {/* Details row */}
                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
                  <motion.span 
                    className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs sm:text-sm shadow-sm"
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.3)' }}
                  >
                    <FaCalendarAlt className="text-[10px] sm:text-xs flex-shrink-0" />
                    <span className="whitespace-nowrap font-medium">{formatDate(date)}</span>
                  </motion.span>
                  <motion.span 
                    className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs sm:text-sm shadow-sm"
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.3)' }}
                  >
                    <FaClock className="text-[10px] sm:text-xs flex-shrink-0" />
                    <span className="whitespace-nowrap font-medium">{totalTravelTime}</span>
                  </motion.span>
                  <motion.span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/30 whitespace-nowrap shadow-sm"
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.4)' }}
                  >
                    {hasStops ? `${totalStops} Stop${totalStops > 1 ? 's' : ''}` : 'Direct'}
                  </motion.span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6 md:p-8 w-full">
        {/* Flight Summary */}
        <div className="grid grid-cols-10 items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Departure */}
          <div className="col-span-4">
            <div className="text-xl xs:text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent leading-tight">
              {firstSeg?.departure?.iataCode}
            </div>
            <div className="text-sm xs:text-base sm:text-lg font-semibold text-orange-900">
              {formatTime(firstSeg?.departure?.at)}
            </div>
            <div className="text-xs xs:text-sm sm:text-base text-orange-700 truncate">
              {getCityName(firstSeg?.departure?.iataCode || 'none')}
            </div>
          </div>

          {/* Flight Path */}
          <div className="col-span-2 flex flex-col items-center px-1">
            <div className="relative w-full p-3">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-300 to-yellow-300"></div>
              <motion.div 
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white border-2 border-orange-200 shadow-md rounded-full flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <MdAirplanemodeActive className="text-orange-500 text-lg sm:text-xl" />
              </motion.div>
            </div>
            <div className="text-xs xs:text-sm text-orange-600 font-medium mt-2 sm:mt-3">{totalTravelTime}</div>
          </div>

          {/* Arrival */}
          <div className="col-span-4 text-right">
            <div className="text-xl xs:text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent leading-tight">
              {lastSeg?.arrival?.iataCode}
            </div>
            <div className="text-sm xs:text-base sm:text-lg font-semibold text-orange-900">
              {formatTime(lastSeg?.arrival?.at)}
            </div>
            <div className="text-xs xs:text-sm sm:text-base text-orange-700 truncate">
              {getCityName(lastSeg?.arrival?.iataCode || 'none')}
            </div>
          </div>
        </div>

        {/* Segments */}
        <div className="space-y-6 mt-6">
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
              <motion.div 
                key={`${type}-seg-${i}`}
                className="bg-gradient-to-br from-white to-orange-50 rounded-3xl p-5 border border-orange-200 shadow-md"
                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(255, 165, 0, 0.1)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 150, damping: 20, delay: i * 0.1 }}
              >
                {/* Airline Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pb-4 border-b border-orange-100">
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-50 to-yellow-100 p-2 shadow-sm flex items-center justify-center border border-orange-100">
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
                      <div className="font-semibold text-orange-900 text-lg">{seg.carrierName}</div>
                      <div className="text-sm text-orange-700">Flight {seg.carrierCode}-{seg.number}</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-gradient-to-r from-[#FF7A00] to-[#FFB400] text-white rounded-full text-xs font-medium shadow-sm mt-2 sm:mt-0 inline-block sm:inline-flex items-center">
                    <span>{i === 0 ? 'First' : i === itinerary.segments.length - 1 ? 'Last' : `Connection ${i}`} Segment</span>
                  </div>
                </div>

                {/* Flight Details */}
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Departure */}
                  <div className="col-span-4 pr-2">
                    <div className="text-xl font-bold text-orange-900">{formatTime(seg.departure.at)}</div>
                    <div className="text-base font-semibold bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent">{seg.departure.iataCode}</div>
                    <div className="text-sm text-orange-700 truncate">{getCityName(seg.departure.iataCode)}</div>
                  </div>

                  {/* Duration */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div className="relative w-full">
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <motion.div
                          whileHover={{ rotate: 15, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <MdAirplanemodeActive className="text-orange-500 text-xl" />
                        </motion.div>
                      </div>
                      <div className="w-full flex items-center px-2">
                        <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-300 to-yellow-300"></div>
                        <div className="mx-2 text-sm text-orange-500 font-bold">•</div>
                        <div className="flex-1 h-0.5 bg-gradient-to-r from-yellow-300 to-orange-300"></div>
                      </div>
                    </div>
                    <div className="text-sm text-orange-700 font-medium mt-3">
                      {segmentHours > 0 ? `${segmentHours}h ` : ''}{segmentMinutes}m
                    </div>
                  </div>

                  {/* Arrival */}
                  <div className="col-span-4 text-right pl-2">
                    <div className="text-xl font-bold text-orange-900">{formatTime(seg.arrival.at)}</div>
                    <div className="text-base font-semibold bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent">{seg.arrival.iataCode}</div>
                    <div className="text-sm text-orange-700 truncate">{getCityName(seg.arrival.iataCode)}</div>
                  </div>
                </div>

                {/* Layover */}
                {layover && (
                  <motion.div 
                    className="mt-4 text-center"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-[#00B4D8]/10 to-[#90E0EF]/20 text-[#0077B6] border border-[#90E0EF]/30 shadow-sm">
                      <FaClock className="mr-2 text-[#0096C7]" />
                      <span className="relative">
                        <span className="relative z-10">{formatLayover(layover)} at {getCityName(seg.arrival.iataCode)} ({seg.arrival.iataCode})</span>
                        {/* Subtle highlight effect */}
                        <span className="absolute inset-0 bg-gradient-to-r from-[#00B4D8]/0 via-[#90E0EF]/20 to-[#00B4D8]/0 rounded-full blur-sm"></span>
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}