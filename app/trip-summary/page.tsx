"use client";
import React from "react";
import { useTripCart } from "../components/TripCartContext";
import TripCard from "../components/TripCard";
import { FiArrowLeft, FiCalendar, FiMapPin, FiDollarSign, FiUsers } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  
  // Format dates from the actual flight data
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
      
      {/* Flight Cards */}
      <div className="space-y-8 mb-10">
        {/* Outbound Flight */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full mr-2">Outbound</span>
            Flight Details
          </h2>
          <TripCard 
            trip={{
              ...trip.trip,
              // Only include the outbound itinerary
              itineraries: [itineraries[0]],
              // Use the actual price from the itinerary if available
              price: {
                ...price,
                total: itineraries[0]?.price?.total || 
                     (price?.breakdown?.outbound || 
                      (price?.total ? (parseFloat(price.total) * 0.75).toFixed(2) : '0'))
              }
            }}
            budget={searchParams?.budget || 9999}
            searchParams={{
              ...searchParams,
              // Use actual flight dates
              departureDate: firstSegment?.departure?.at,
              returnDate: returnSegment?.departure?.at
            }}
            flightType="outbound"
          />
        </div>
        
        {/* Return Flight */}
        {itineraries[1] && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full mr-2">Return</span>
              Flight Details
            </h2>
            <TripCard 
              trip={{
                ...trip.trip,
                // Only include the return itinerary
                itineraries: [itineraries[1]],
                // Use the actual price from the itinerary if available
                price: {
                  ...price,
                  total: itineraries[1]?.price?.total || 
                       (price?.breakdown?.return || 
                        (price?.total ? (parseFloat(price.total) * 0.25).toFixed(2) : '0'))
                }
              }}
              budget={searchParams?.budget || 9999}
              searchParams={{
                ...searchParams,
                // Swap origin and destination for return
                origin: lastSegment?.arrival?.iataCode,
                destination: firstSegment?.departure?.iataCode,
                // Use actual flight dates
                departureDate: returnSegment?.departure?.at,
                returnDate: '' // No return date for the return flight
              }}
              flightType="return"
            />
          </div>
        )}
      </div>
      
      {/* Price Summary */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Price Summary</h2>
        <div className="space-y-3">
          {/* Outbound Flight */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Outbound Flight</span>
            <span className="font-medium">{prices.outbound}</span>
          </div>
          
          {/* Return Flight */}
          {itineraries[1] && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Return Flight</span>
              <span className="font-medium">{prices.return}</span>
            </div>
          )}
          
          {/* Hotel */}
          {trip.trip.hotels?.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {trip.trip.hotels[0]?.name || 'Hotel'}
                {trip.trip.hotels[0]?.checkInDate && (
                  <span className="block text-xs text-gray-500">
                    {formatDisplayDate(trip.trip.hotels[0].checkInDate)}
                    {trip.trip.hotels[0]?.checkOutDate && ` - ${formatDisplayDate(trip.trip.hotels[0].checkOutDate)}`}
                  </span>
                )}
              </span>
              <span className="font-medium">{prices.hotel}</span>
            </div>
          )}
          
          {/* Total */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-[#FF8C00]">{prices.total}</span>
            </div>
            {prices.currency !== 'USD' && (
              <div className="text-xs text-gray-500 text-right mt-1">
                Prices shown in {prices.currency}
              </div>
            )}
          </div>
        </div>
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
