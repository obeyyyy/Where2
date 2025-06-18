"use client";
import React, { useState, useEffect } from "react";
import { useTripCart } from "../components/TripCartContext";
import { FiArrowLeft, FiCalendar, FiMapPin, FiDollarSign, FiUsers } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlightItineraryCard } from "../components/FlightItineraryCard";
import airportsJson from 'airports-json';
// Import the airports data
const airports = require('airports-json').airports;
// Interface for airport info
interface AirportInfo {
  iata_code: string;
  name?: string;
  city?: string;
  country?: string;
}

// Get airport data for the flight cards
const getAirportData = (iataCode: string) => {
  return airports.find((a: any) => a.iata === iataCode) || { iata_code: iataCode };
};


export default function TripSummaryPage() {
  const { trip: contextTrip, setTrip, isLoading, isValidTrip } = useTripCart();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [trip, setTripState] = useState<any>(null);

  // Load trip data from localStorage on component mount and when contextTrip changes
  useEffect(() => {
    const loadTrip = () => {
      try {
        // First try to get from localStorage (like booking page does)
        const storedTrip = localStorage.getItem('current_booking_offer');
        if (storedTrip) {
          const parsedTrip = JSON.parse(storedTrip);
          setTripState(parsedTrip);
          // Also update the context to keep them in sync
          setTrip(parsedTrip);
          return;
        }
        
        // Fall back to context if no localStorage data
        if (contextTrip) {
          setTripState(contextTrip);
        }
      } catch (error) {
        console.error('Error loading trip data:', error);
      } finally {
        setIsClient(true);
      }
    };

    loadTrip();
    
    // Set up storage event listener to detect changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'current_booking_offer') {
        try {
          if (e.newValue) {
            const newTrip = JSON.parse(e.newValue);
            setTripState(newTrip);
            setTrip(newTrip);
          } else {
            setTripState(null);
          }
        } catch (error) {
          console.error('Error parsing updated trip data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [contextTrip, setTrip]);

  // Handle loading state
  if (isLoading || !isClient) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 text-center">
        <div className="animate-pulse">
          <div className="h-20 w-20 mx-auto bg-gray-200 rounded-full mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
          <div className="h-12 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  
  // Handle empty or invalid trip state
  if ((!trip || !isValidTrip(trip)) && isClient) {
    // Clear any invalid trip from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_booking_offer');
      localStorage.removeItem('tripCart');
    }
    
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-yellow-50 rounded-full flex items-center justify-center">
            <FiCalendar className="w-10 h-10 text-[#FFA500]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {trip ? 'Trip Expired' : 'No Trip Selected'}
        </h2>
        <p className="text-gray-600 mb-8">
          {trip 
            ? 'Your trip selection has expired. Please search for flights again.'
            : 'You haven\'t selected any trips yet. Start by searching for flights.'
          }
        </p>
        <Link 
          href="/search" 
          className="inline-block bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-shadow"
          onClick={() => {
            // Clear any invalid trip from storage when clicking the search button
            if (typeof window !== 'undefined') {
              localStorage.removeItem('tripCart');
            }
          }}
        >
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
      let totalFlightPrice = 0;
      
      if (trip.trip.price?.total) {
        // Use the total price from Duffel for roundtrip
        totalFlightPrice = parseFloat(trip.trip.price.total);
      }
      
      // Calculate hotel price if available
      const hotelPrice = trip.trip.hotels?.[0]?.price?.amount 
        ? parseFloat(trip.trip.hotels[0].price.amount) 
        : 0;
      
      const total = totalFlightPrice + hotelPrice;
      
      // Format prices for display
      const formatPrice = (amount: number, currency: string = 'USD') => {
        // Return the raw number as a string to preserve decimal precision
        return amount.toString();
      };
      
      const currency = trip.trip.price?.currency || 'USD';
      
      return {
        outbound: formatPrice(totalFlightPrice, currency),
        outboundRaw: totalFlightPrice,
        return: formatPrice(totalFlightPrice, currency), // Same as outbound
        returnRaw: totalFlightPrice,
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
            total: prices.total.toString(), // Keep as string to preserve exact decimal
            currency: prices.currency,
            breakdown: {
              outbound: prices.outbound.toString(),
              return: prices.return.toString(),
              hotel: prices.hotel.toString(),
              // Add any other breakdown items if they exist
              ...(trip.trip.price?.breakdown || {})
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
        totalPrice: prices.total,
        // Add a timestamp to force refresh
        timestamp: Date.now()
      };
      
      // Encode the booking data as a URL parameter
      const bookingDataString = encodeURIComponent(JSON.stringify(bookingData));
      
      // Navigate to booking page with the data in the URL
      router.push(`/book?bookingData=${bookingDataString}`);
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
    // Determine if this is a roundtrip booking robustly
    const isRoundTrip = (searchParams.tripType === 'roundtrip' || itineraries?.length > 1);
    const paymentConfirmed = trip?.paymentStatus === 'succeeded' || trip?.paymentConfirmed || trip?.confirmed;
    const paymentStatusText = paymentConfirmed ? 'Payment Confirmed' : 'Awaiting Payment';
    const paymentStatusColor = paymentConfirmed ? 'text-green-600' : 'text-yellow-600';

    return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Payment Confirmation Section */}
      <div className="mb-8">
        <div className={`flex items-center gap-3 text-lg font-semibold ${paymentStatusColor}`}>
          {paymentConfirmed ? (
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
          )}
          <span>{paymentStatusText}{isRoundTrip && paymentConfirmed && ' for Both Flights'}</span>
        </div>
        <div className="mt-2 text-gray-700">
          {isRoundTrip && paymentConfirmed && (
            <span>
              You have successfully paid for <b>both outbound and return flights</b>.<br/>
              <span className="font-medium">Total Paid:</span> {prices.total} {prices.currency}
              <span className="block text-sm text-gray-500 mt-1">(Outbound: {prices.outbound} {prices.currency}{prices.returnRaw > 0 ? `, Return: ${prices.return} ${prices.currency}` : ''})</span>
            </span>
          )}
          {!isRoundTrip && paymentConfirmed && (
            <span>You have successfully paid for your flight.<br/>
              <span className="font-medium">Total Paid:</span> {prices.total} {prices.currency}
            </span>
          )}
        </div>
      </div>
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
                  {isRoundTrip && returnSegment && ` → ${firstSegment?.departure?.iataCode || 'N/A'}`}
                </span>
              </div>
              <div className="flex items-center">
                <FiCalendar className="mr-1" />
                <span>
                  {firstSegment?.departure?.at ? formatDisplayDate(firstSegment.departure.at) : 'N/A'}
                  {isRoundTrip && returnSegment?.departure?.at && ` - ${formatDisplayDate(returnSegment.departure.at)}`}
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
                  getAirportData(itineraries[0].segments?.[0]?.departure?.iataCode || ''),
                  getAirportData(itineraries[0].segments?.[itineraries[0].segments.length - 1]?.arrival?.iataCode || '')
                ]}
                className="mb-6"
              />
            </div>
          )}
          
          {/* Return Flight */}
          {isRoundTrip && itineraries?.[1] && (
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
                  getAirportData(itineraries[1].segments?.[0]?.departure?.iataCode || ''),
                  getAirportData(itineraries[1].segments?.[itineraries[1].segments.length - 1]?.arrival?.iataCode || '')
                ]}
              />
            </div>
          )}
        </div>
        
        {/* Flight Price */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h3 className="text-lg font-bold text-gray-800">Flight Price</h3>
          <p className="text-xl font-semibold text-[#FFA500]">
            {prices.currency} {parseFloat(prices.total).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Includes all taxes and fees</p>
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
