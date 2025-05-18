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
  
  // Extract trip data
  const { itineraries, price } = trip.trip;
  // Use searchParams from TripCartContext if available, otherwise fallback to trip.trip.searchParams
  const searchParams = trip.searchParams || trip.trip.searchParams;
  
  // Calculate total price
  const calculateTotalPrice = () => {
    let total = parseFloat(price.total);
    // Add hotel price if selected
    if (trip.trip.hotels && trip.trip.hotels.length > 0 && trip.trip.hotels[0].totalPrice) {
      total += parseFloat(trip.trip.hotels[0].totalPrice);
    }
    return total.toFixed(0);
  };
  
  // Handle booking
  const handleBooking = () => {
    // Save the full trip object (including searchParams) for booking
    localStorage.setItem('current_booking_offer', JSON.stringify({
      trip: trip.trip,
      searchParams: searchParams || {},
      budget: searchParams?.budget || 9999
    }));
    
    // Navigate to booking page
    router.push('/book');
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
              <span>{searchParams?.origin} → {searchParams?.destination}</span>
            </div>
            <div className="flex items-center">
              <FiCalendar className="mr-1" />
              <span>{searchParams?.departureDate} {searchParams?.returnDate ? `- ${searchParams.returnDate}` : ''}</span>
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
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full mr-2">Outbound</span>
            Flight Details
          </h2>
          <TripCard 
            trip={{...trip.trip, itineraries: [itineraries[0]]}} 
            budget={searchParams?.budget || 9999} 
            searchParams={searchParams || {}} 
            flightType="outbound" 
          />
        </div>
        
        {itineraries[1] && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full mr-2">Return</span>
              Flight Details
            </h2>
            <TripCard 
              trip={{
                ...trip.trip,
                // Create a new itineraries array with the return flight first
                itineraries: [
                  // Put the return itinerary first so it's treated as the main one
                  itineraries[1]
                ]
              }} 
              budget={searchParams?.budget || 9999} 
              searchParams={searchParams || {}} 
              flightType="return" 
            />
          </div>
        )}
      </div>
      
      {/* Price Summary and Booking Button */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Price Summary</h2>
          <div className="text-2xl font-bold text-[#FF8C00]">
            {price.currency} {calculateTotalPrice()}
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-gray-600">
            <span>Flight Price</span>
            <span>{price.currency} {parseFloat(price.total).toFixed(0)}</span>
          </div>
          
          {trip.trip.hotels && trip.trip.hotels.length > 0 && trip.trip.hotels[0].totalPrice && (
            <div className="flex justify-between text-gray-600">
              <span>Hotel ({trip.trip.hotels[0].name})</span>
              <span>{trip.trip.hotels[0].currency} {parseFloat(trip.trip.hotels[0].totalPrice).toFixed(0)}</span>
            </div>
          )}
          
          <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-[#FF8C00]">{price.currency} {calculateTotalPrice()}</span>
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
