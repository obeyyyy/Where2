'use client';

import React from 'react';
import { MdFlight, MdAirlineSeatReclineNormal, MdAirplanemodeActive } from 'react-icons/md';
import { FaPlaneDeparture, FaPlaneArrival, FaClock, FaCalendarAlt, FaPlane } from 'react-icons/fa';
import { getAirlineLogoUrl } from './getAirlineLogoUrl';
import { motion } from 'framer-motion';

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
  itinerary: Itinerary;
  type: 'outbound' | 'return';
  date: string;
  price?: {
    currency: string;
    total: string;
    breakdown?: { [key: string]: string };
  };
  airports: Array<{ iata_code: string; name?: string; city?: string }>;
  className?: string;
}


export const FlightItineraryCard: React.FC<FlightItineraryCardProps> = ({
  itinerary,
  type,
  date,
  price,
  airports,
  className = '',
}) => {
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const formatDuration = (duration: string) => {
    const match = duration.match(/P(?:([0-9]*)D)?T?(?:([0-9]*)H)?(?:([0-9]*)M)?/);
    if (!match) return duration;
    const [_, d, h, m] = match;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m || parts.length === 0) parts.push(`${m || '0'}m`);
    return parts.join(' ');
  };

  const calculateLayover = (arrival: string, departure: string) => {
    const diff = new Date(departure).getTime() - new Date(arrival).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m layover`;
  };

  const firstSeg = itinerary.segments[0];
  const lastSeg = itinerary.segments[itinerary.segments.length - 1];
  const depAirport = airports.find(a => a.iata_code === firstSeg?.departure?.iataCode);
  const arrAirport = airports.find(a => a.iata_code === lastSeg?.arrival?.iataCode);
  const hasStops = itinerary.segments.length > 1;

  // Calculate total travel time including layovers
  const calculateTotalTravelTime = () => {
    if (!itinerary.segments.length) return '0h 0m';
    const start = new Date(itinerary.segments[0].departure.at);
    const end = new Date(itinerary.segments[itinerary.segments.length - 1].arrival.at);
    const diff = end.getTime() - start.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const totalTravelTime = calculateTotalTravelTime();
  const flightTypeColor = type === 'outbound' ? 'blue' : 'green';
  const flightTypeLabel = type === 'outbound' ? 'Outbound' : 'Return';
  const totalStops = itinerary.segments.length - 1;

  // Format layover time with leading zeros for minutes
  const formatLayover = (time: string) => {
    const [h, m] = time.split('h ');
    return `${h}h ${m.padStart(2, '0')} layover`;
  };

  return (
    <div className={`relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm ${className}`}>
      {/* Header with gradient - Improved mobile flex */}
      <div className={`relative ${type === 'outbound' ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-green-600 to-green-500'} p-3 sm:p-4 text-white`}>
        <div className="absolute top-0 left-0  h-full bg-white/20"></div>
       
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

          {/* Price Tag */}
          {price?.total && (
            <div className={`bg-white/95 backdrop-blur-sm ${
              type === 'outbound' ? 'text-blue-600 border-blue-100' : 'text-green-600 border-green-100'
            } text-sm sm:text-base font-bold px-3 py-1.5 rounded-md sm:rounded-lg shadow-sm border flex-shrink-0 self-center sm:self-start mt-1 sm:mt-0`}>
              <span className="text-xs sm:text-sm">{price.currency || '$'}</span> {parseFloat(price.total).toFixed(2)}
            </div>
          )}
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
          {itinerary.segments.map((seg, i) => {
            const dep = airports.find(a => a.iata_code === seg.departure.iataCode);
            const arr = airports.find(a => a.iata_code === seg.arrival.iataCode);
            const layover = itinerary.segments[i + 1]
              ? calculateLayover(seg.arrival.at, itinerary.segments[i + 1].departure.at)
              : null;
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