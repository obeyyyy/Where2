"use client";
import React, { useState, useEffect } from "react";
import { useTripCart } from "../components/TripCartContext";
import { FiArrowLeft, FiCalendar, FiMapPin, FiDollarSign, FiUsers, FiCheckCircle } from "react-icons/fi";
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

// Add new styled components
const SummaryHeader = ({ children }: { children: React.ReactNode }) => (
  <h1 className="text-3xl font-bold text-gray-900 mb-6">{children}</h1>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-800 mb-4">{children}</h2>
);

const PrimaryButton = ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
  >
    {children}
  </button>
);

const SuccessBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
    <FiCheckCircle className="text-green-500" />
    {children}
  </div>
);

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
      <div className="max-w-xl mx-auto mt-16 p-8 rounded-xl shadow-lg text-center">
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
          className="inline-block text-white bg-[#FFA500] hover:bg-[#FFA500] px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
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

    return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-l-4 border-[#FFA500]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 flex items-center">
              <span className="bg-[#FFA500] text-white p-1 rounded-md mr-2">
                <FiMapPin className="w-5 h-5" />
              </span>
              Trip Summary
            </h1>
            
            <div className="flex flex-col sm:flex-row flex-wrap text-gray-600 text-sm sm:text-base gap-3 sm:gap-5">
              <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg">
                <FiMapPin className="mr-2 text-[#FFA500]" />
                <span className="font-medium">
                  {firstSegment?.departure?.iataCode || 'N/A'}
                  <span className="mx-1 text-gray-400">→</span>
                  {lastSegment?.arrival?.iataCode || 'N/A'}
                  {isRoundTrip && returnSegment && (
                    <>
                      <span className="mx-1 text-gray-400">→</span>
                      {firstSegment?.departure?.iataCode || 'N/A'}
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg">
                <FiCalendar className="mr-2 text-[#FFA500]" />
                <span className="font-medium">
                  {firstSegment?.departure?.at ? formatDisplayDate(firstSegment.departure.at) : 'N/A'}
                  {isRoundTrip && returnSegment?.departure?.at && (
                    <>
                      <span className="mx-1 text-gray-400">-</span>
                      {formatDisplayDate(returnSegment.departure.at)}
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg">
                <FiUsers className="mr-2 text-[#FFA500]" />
                <span className="font-medium">{searchParams.travelers || 5} Traveler{(Number(searchParams.travelers || 5) > 1 ? 's' : '')}</span>
              </div>
            </div>
          </div>
          
          <Link 
            href="/search" 
            className="text-[#FFA500] hover:text-[#FF8C00] border border-[#FFA500] hover:border-[#FF8C00] px-4 py-2 rounded-lg transition-colors duration-200 flex items-center font-medium"
          >
            <FiArrowLeft className="mr-2" /> Back to Search
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <SectionTitle>Flight Itinerary</SectionTitle>
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
             
              airports={[
                getAirportData(itineraries[1].segments?.[0]?.departure?.iataCode || ''),
                getAirportData(itineraries[1].segments?.[itineraries[1].segments.length - 1]?.arrival?.iataCode || '')
              ]}
            />
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <SecondaryButton onClick={() => router.back()}>
          Back to Search
        </SecondaryButton>
        <PrimaryButton onClick={handleBooking}>
          Book This Package
        </PrimaryButton>
      </div>
    </div>
  );

}