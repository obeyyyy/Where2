"use client";
import React from "react";
import { useTripCart } from "../components/TripCartContext";
import { FiArrowLeft, FiCalendar, FiMapPin, FiDollarSign, FiUsers } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlightItineraryCard } from "../components/FlightItineraryCard";
import airportsJson from 'airports-json';

// Interface for airport info
interface AirportInfo {
  iata_code: string;
  name?: string;
  city?: string;
  country?: string;
}

// Helper function to get airport info
const getAirportInfo = (iataCode: string): AirportInfo => {
  const airport = airportsJson.airports.find((a: any) => a.iata === iataCode);
  return airport ? {
    iata_code: airport.iata,
    name: airport.name,
    city: airport.city,
    country: airport.country
  } : { iata_code: iataCode };
};

export default function TripSummaryPage() {
  const { trip } = useTripCart();
  const router = useRouter();
  
  // Handle empty state with a nice UI
  if (!trip) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-yellow-50 rounded-full flex items-center justify-center">
            <FiCalendar className="w-10 h-10 text-[#FFA500]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Trip Selected</h2>
        <p className="text-gray-600 mb-8">You haven't selected any trips yet. Start by searching for flights.</p>
        <Link href="/search" className="inline-block bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-shadow">
          Search Flights
        </Link>
      </div>
    );
  }
  
  // Extract trip data from the API response
  const { itineraries, price, searchParams: apiSearchParams } = trip.trip || {};
  // Use searchParams from the API response if available, otherwise fall back to the context
  const searchParams = apiSearchParams || trip.searchParams || {};
  
  // Extract origin and destination from the first segment of the first itinerary
  const firstSegment = itineraries?.[0]?.segments?.[0] || {};
  const lastSegment = itineraries?.[0]?.segments?.[itineraries?.[0]?.segments?.length - 1] || {};
  const returnSegment = itineraries?.[1]?.segments?.[0] || {};
  
  // Format times for display
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  
  // Format dates from the actual flight data
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Calculate prices based on the trip data
  const calculatePrices = () => {
    try {
      if (!trip) return { 
        outbound: 'N/A',
        outboundRaw: 0,
        return: 'N/A',
        returnRaw: 0,
        hotel: 'N/A',
        hotelRaw: 0,
        total: 'Price not available',
        totalRaw: 0,
        currency: 'USD'
      };

      // Get prices from the breakdown if available, otherwise calculate them
      let outboundPrice = 0;
      let returnPrice = 0;
      let totalFlightPrice = 0;
      
      const isRoundTrip = trip.trip.itineraries?.length > 1;
      
      if (trip.trip.price?.breakdown) {
        // Use the breakdown if available
        outboundPrice = parseFloat(trip.trip.price.breakdown.outbound || '0');
        returnPrice = parseFloat(trip.trip.price.breakdown.return || '0');
        totalFlightPrice = outboundPrice + returnPrice;
      } else {
        // Fallback to splitting the total price
        totalFlightPrice = parseFloat(trip.trip.price?.total || '0');
        outboundPrice = isRoundTrip ? totalFlightPrice * 0.6 : totalFlightPrice;
        returnPrice = isRoundTrip ? totalFlightPrice * 0.4 : 0;
      }
      
      // Calculate hotel price if available
      const hotelPrice = trip.trip.hotels?.[0]?.price?.amount 
        ? parseFloat(trip.trip.hotels[0].price.amount) 
        : 0;
      
      const total = totalFlightPrice + hotelPrice;
      
      const formatPrice = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency || 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
      };
      
      const currency = trip.trip.price?.currency || 'USD';
      
      return {
        outbound: formatPrice(outboundPrice, currency),
        outboundRaw: outboundPrice,
        return: isRoundTrip ? formatPrice(returnPrice, currency) : 'N/A',
        returnRaw: returnPrice,
        hotel: hotelPrice > 0 ? formatPrice(hotelPrice, currency) : 'N/A',
        hotelRaw: hotelPrice,
        total: formatPrice(total, currency),
        totalRaw: total,
        currency
      };
    } catch (error) {
      console.error('Error calculating prices:', error);
      return {
        outbound: 'N/A',
        outboundRaw: 0,
        return: 'N/A',
        returnRaw: 0,
        hotel: 'N/A',
        hotelRaw: 0,
        total: 'Price not available',
        totalRaw: 0,
        currency: 'USD'
      };
    }
  };
  
  const prices = calculatePrices();
  
  // Handle booking
  const handleBooking = () => {
    try {
      // Prepare the booking data with actual flight and price information
      const bookingData = {
        trip: {
          ...trip.trip,
          // Ensure we have the latest price information
          price: {
            total: prices.total.replace(/[^0-9.]/g, ''), // Extract just the number
            currency: prices.currency,
            breakdown: {
              outbound: prices.outbound.replace(/[^0-9.]/g, ''),
              return: prices.return.replace(/[^0-9.]/g, ''),
              hotel: prices.hotel.replace(/[^0-9.]/g, '')
            }
          },
          // Include all itineraries
          itineraries: [...itineraries]
        },
        // Include search params for reference
        searchParams: {
          ...searchParams,
          // Update with actual flight details
          origin: firstSegment?.departure?.iataCode || searchParams.origin,
          destination: lastSegment?.arrival?.iataCode || searchParams.destination,
          departureDate: firstSegment?.departure?.at || searchParams.departureDate,
          returnDate: returnSegment?.departure?.at || searchParams.returnDate,
          price: prices.total
        },
        // Include calculated total price
        totalPrice: prices.total
      };
      
      // Save to localStorage
      localStorage.setItem('current_booking_offer', JSON.stringify(bookingData));
      
      // Navigate to booking page
      router.push('/book');
    } catch (error) {
      console.error('Error preparing booking:', error);
      // Fallback to simple save if there's an error
      localStorage.setItem('current_booking_offer', JSON.stringify({
        trip: trip.trip,
        searchParams: searchParams,
        totalPrice: prices.total
      }));
      router.push('/book');
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div>
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Trip Summary</h1>
            <div className="flex items-center text-gray-600 text-sm gap-4">
              <div className="flex items-center">
                <FiMapPin className="mr-1" />
                <span>
                  {firstSegment?.departure?.iataCode || 'N/A'}
                  {' → '}
                  {lastSegment?.arrival?.iataCode || 'N/A'}
                  {returnSegment && ` → ${firstSegment?.departure?.iataCode || 'N/A'}`}
                </span>
              </div>
              <div className="flex items-center">
                <FiCalendar className="mr-1" />
                <span>
                  {firstSegment?.departure?.at ? formatDisplayDate(firstSegment.departure.at) : 'N/A'}
                  {returnSegment?.departure?.at && ` - ${formatDisplayDate(returnSegment.departure.at)}`}
                </span>
              </div>
              <div className="flex items-center">
                <FiUsers className="mr-1" />
                <span>{searchParams?.travelers || 1} Traveler{(searchParams?.travelers || 1) > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <Link href="/search" className="text-blue-600 hover:underline flex items-center">
            <FiArrowLeft className="mr-1" /> Back to Search
          </Link>
        </div>
      
        {/* Flight Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Flight Details</h2>
          
          {/* Outbound Flight */}
          {itineraries?.[0] && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Outbound Flight</h3>
                <span className="text-sm text-gray-500">
                  {itineraries[0].segments?.[0]?.departure?.at ? 
                    formatDisplayDate(itineraries[0].segments[0].departure.at) : 'N/A'}
                </span>
              </div>
              
              <FlightItineraryCard
                itinerary={itineraries[0]}
                type="outbound"
                date={itineraries[0].segments?.[0]?.departure?.at || ''}
                price={{
                  currency: price?.currency || 'USD',
                  total: prices.outboundRaw.toString(),
                  breakdown: {
                    outbound: prices.outboundRaw.toString()
                  }
                }}
                airports={[
                  getAirportInfo(itineraries[0].segments?.[0]?.departure?.iataCode || ''),
                  getAirportInfo(itineraries[0].segments?.[itineraries[0].segments.length - 1]?.arrival?.iataCode || '')
                ]}
                className="mb-6"
              />
            </div>
          )}
          
          {/* Return Flight */}
          {searchParams.tripType === 'roundtrip' && itineraries?.[1] && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Return Flight</h3>
                <span className="text-sm text-gray-500">
                  {itineraries[1].segments?.[0]?.departure?.at ? 
                    formatDisplayDate(itineraries[1].segments[0].departure.at) : 'N/A'}
                </span>
              </div>
              
              <FlightItineraryCard
                itinerary={itineraries[1]}
                type="return"
                date={itineraries[1].segments?.[0]?.departure?.at || ''}
                price={{
                  currency: price?.currency || 'USD',
                  total: prices.returnRaw.toString(),
                  breakdown: {
                    return: prices.returnRaw.toString()
                  }
                }}
                airports={[
                  getAirportInfo(itineraries[1].segments?.[0]?.departure?.iataCode || ''),
                  getAirportInfo(itineraries[1].segments?.[itineraries[1].segments.length - 1]?.arrival?.iataCode || '')
                ]}
              />
            </div>
          )}
        </div>
        
        {/* Book Button */}
        <button
          onClick={handleBooking}
          className="w-full bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-6 py-4 rounded-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          Book This Package
        </button>
      </div>
    </div>
  );
}
