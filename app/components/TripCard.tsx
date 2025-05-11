// app/components/TripCard.tsx
import React from 'react';
import Image from 'next/image';

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
}

interface TripCardProps {
  trip: FlightOffer;
}

// Helper function to get airline logo URL
const getAirlineLogoUrl = (carrierCode: string) => {
  return `https://content.airhex.com/content/logos/airlines_${carrierCode}_100_50_r.png`;
};

export default function TripCard({ trip }: TripCardProps) {
  if (!trip) {
    return <div className="text-center p-4">No flight data available</div>;
  }

  const { price, itineraries } = trip;
  const outbound = itineraries?.[0]?.segments?.[0];
  const returnSegment = itineraries?.[1]?.segments?.[0];

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

  const renderFlightSegment = (segment: FlightSegment, type: 'outbound' | 'return') => {
    const carrierCode = segment.operating?.carrierCode || segment.carrierCode;
    const logoUrl = getAirlineLogoUrl(carrierCode);
    
    // Create a more unique key using multiple properties
    const segmentKey = `${type}-${carrierCode}-${segment.number}-${segment.departure.at}-${segment.arrival.at}`;
    
    return (
      <div key={segmentKey} className="mb-4 p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="relative w-10 h-10 mr-3">
              <Image
                src={logoUrl}
                alt={`${carrierCode} logo`}
                fill
                className="object-contain"
                onError={(e) => {
                  // Fallback to a placeholder if logo fails to load
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x50?text=Airline';
                }}
                unoptimized={true} // Required for external images
              />
            </div>
            <div>
              <p className="font-semibold">{carrierCode} {segment.number}</p>
              <p className="text-sm text-gray-500">{segment.aircraft?.code || 'N/A'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatDuration(itineraries[type === 'outbound' ? 0 : 1]?.duration || '')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-xl font-bold">{formatTime(segment.departure.at)}</p>
            <p className="text-gray-500">{segment.departure.iataCode}</p>
            {segment.departure.terminal && (
              <p className="text-xs text-gray-400">Terminal {segment.departure.terminal}</p>
            )}
          </div>
          
          <div className="flex items-center justify-center">
            <div className="h-px bg-gray-300 w-full relative">
              <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-2 h-2 border-t-2 border-r-2 border-gray-400 rotate-45"></div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xl font-bold">{formatTime(segment.arrival.at)}</p>
            <p className="text-gray-500">{segment.arrival.iataCode}</p>
            {segment.arrival.terminal && (
              <p className="text-xs text-gray-400">Terminal {segment.arrival.terminal}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">
        {outbound?.departure.iataCode} → {outbound?.arrival.iataCode}
      </h3>
      
      {outbound && renderFlightSegment(outbound, 'outbound')}
      {returnSegment && renderFlightSegment(returnSegment, 'return')}
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total price for 1 traveler</p>
            <p className="text-2xl font-bold text-[#FFA500]">
              {price.currency} {parseFloat(price.total).toFixed(2)}
            </p>
          </div>
          <button className="bg-[#FFA500] text-white px-4 py-2 rounded-lg hover:bg-[#ff8c00] transition">
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
