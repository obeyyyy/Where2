"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiMapPin, FiCalendar, FiUsers, FiStar, FiCheck, FiX, FiLoader, FiArrowLeft } from 'react-icons/fi';

interface RoomRate {
  id: string;
  code: string;
  name?: string;
  total_amount: string;
  total_currency: string;
  board_type: string;
  payment_type: string;
  cancellation_timeline?: {
    refund_amount: string;
    currency: string;
    before: string;
  }[];
  conditions?: {
    title: string;
    description: string;
  }[];
}

interface Room {
  name: string;
  photos: { url: string }[];
  beds: { type: string; count: number }[];
  rates: RoomRate[];
}

interface HotelDetails {
  accommodation: {
    id: string;
    name: string;
    description: string;
    photos: { url: string }[];
    rating?: number;
    review_score?: number;
    location: {
      address: {
        city_name: string;
        country_code: string;
        line_one: string;
        postal_code?: string;
        region?: string;
      }
    };
    amenities: { type: string; description: string }[];
    check_in_information?: {
      check_in_after_time: string;
      check_in_before_time: string;
      check_out_before_time: string;
    };
  };
  rooms: Room[];
  check_in_date: string;
  check_out_date: string;
}

const HotelDetailsPage: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const hotelId = params?.id as string;
  
  // Extract search parameters for context
  const checkIn = searchParams?.get('checkIn') || '';
  const checkOut = searchParams?.get('checkOut') || '';
  const rooms = searchParams?.get('rooms') || '1';
  const guests = searchParams?.get('guests') || '1';

  useEffect(() => {
    const fetchHotelDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/hotel-details/${hotelId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch hotel details');
        }

        const data = await response.json();
        
        if (data.success && data.rates) {
          setHotelDetails(data.rates);
        } else {
          setError('Could not retrieve hotel details');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching hotel details');
        console.error('Error fetching hotel details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (hotelId) {
      fetchHotelDetails();
    } else {
      setError('Invalid hotel ID');
      setLoading(false);
    }
  }, [hotelId]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time (e.g., check-in time)
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Calculate number of nights
  const calculateNights = () => {
    if (!hotelDetails?.check_in_date || !hotelDetails?.check_out_date) return 0;
    
    const checkInDate = new Date(hotelDetails.check_in_date);
    const checkOutDate = new Date(hotelDetails.check_out_date);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Handle room selection
  const handleRoomSelect = (rateId: string) => {
    setSelectedRoom(rateId);
    // In a real implementation, you would navigate to a booking page
    // or open a booking modal
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <Link 
            href="/hotel/search"
            className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
          >
            <FiArrowLeft /> Back to search results
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FiLoader className="animate-spin text-4xl text-orange-500 mb-4" />
            <p className="text-gray-600">Loading hotel details...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Link 
              href="/hotel/search"
              className="mt-4 inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Return to Search Results
            </Link>
          </div>
        ) : hotelDetails ? (
          <>
            {/* Hotel header */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              {/* Image gallery */}
              <div className="relative h-80">
                {hotelDetails.accommodation.photos && hotelDetails.accommodation.photos.length > 0 ? (
                  <img 
                    src={hotelDetails.accommodation.photos[0].url} 
                    alt={hotelDetails.accommodation.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image available</span>
                  </div>
                )}
                {hotelDetails.accommodation.rating && (
                  <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {hotelDetails.accommodation.rating} <FiStar className="inline ml-1" />
                  </div>
                )}
              </div>
              
              {/* Hotel info */}
              <div className="p-6">
                <h1 className="text-3xl font-bold mb-2">{hotelDetails.accommodation.name}</h1>
                <p className="text-gray-600 mb-4 flex items-center gap-1">
                  <FiMapPin className="text-orange-500" />
                  {hotelDetails.accommodation.location.address.line_one}, {hotelDetails.accommodation.location.address.city_name}, {hotelDetails.accommodation.location.address.country_code}
                </p>
                
                {/* Stay details */}
                <div className="flex flex-wrap gap-6 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-orange-500" />
                    <div>
                      <p className="font-medium">Check-in</p>
                      <p>{formatDate(hotelDetails.check_in_date)}</p>
                      {hotelDetails.accommodation.check_in_information && (
                        <p className="text-xs text-gray-500">
                          After {formatTime(hotelDetails.accommodation.check_in_information.check_in_after_time)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-orange-500" />
                    <div>
                      <p className="font-medium">Check-out</p>
                      <p>{formatDate(hotelDetails.check_out_date)}</p>
                      {hotelDetails.accommodation.check_in_information && (
                        <p className="text-xs text-gray-500">
                          Before {formatTime(hotelDetails.accommodation.check_in_information.check_out_before_time)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUsers className="text-orange-500" />
                    <div>
                      <p className="font-medium">Guests</p>
                      <p>{guests} Guest{parseInt(guests) > 1 ? 's' : ''}, {rooms} Room{parseInt(rooms) > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700">{hotelDetails.accommodation.description}</p>
              </div>
            </div>
            
            {/* Room selection */}
            <h2 className="text-2xl font-bold mb-6">Available Rooms</h2>
            <div className="space-y-6">
              {hotelDetails.rooms.map((room, roomIndex) => (
                <div key={roomIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Room header */}
                  <div className="flex flex-col md:flex-row">
                    {/* Room image */}
                    <div className="md:w-1/3 h-48 md:h-auto">
                      {room.photos && room.photos.length > 0 ? (
                        <img 
                          src={room.photos[0].url} 
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">No image available</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Room info */}
                    <div className="p-6 md:w-2/3">
                      <h3 className="text-xl font-bold mb-2">{room.name}</h3>
                      
                      {/* Bed information */}
                      {room.beds && room.beds.length > 0 && (
                        <div className="mb-4">
                          <p className="font-medium mb-1">Bed Type:</p>
                          <div className="flex flex-wrap gap-2">
                            {room.beds.map((bed, bedIndex) => (
                              <span key={bedIndex} className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                                {bed.count} x {bed.type.charAt(0).toUpperCase() + bed.type.slice(1)} Bed
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Room rates */}
                      <div className="mt-6 space-y-4">
                        {room.rates.map((rate) => (
                          <div 
                            key={rate.id} 
                            className={`border rounded-lg p-4 transition ${
                              selectedRoom === rate.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <p className="font-medium">{rate.board_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                <p className="text-sm text-gray-600">Payment: {rate.payment_type === 'pay_now' ? 'Pay now' : 'Pay at property'}</p>
                                
                                {/* Cancellation policy */}
                                {rate.cancellation_timeline && rate.cancellation_timeline.length > 0 ? (
                                  <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                                    <FiCheck className="text-green-600" />
                                    Free cancellation before {new Date(rate.cancellation_timeline[0].before).toLocaleDateString()}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                                    <FiX className="text-red-600" />
                                    Non-refundable
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-right">
                                <p className="text-2xl font-bold text-orange-600">
                                  {rate.total_currency} {rate.total_amount}
                                </p>
                                <p className="text-xs text-gray-500">Total for {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}</p>
                                
                                <button
                                  onClick={() => handleRoomSelect(rate.id)}
                                  className={`mt-2 px-4 py-2 rounded-lg transition ${
                                    selectedRoom === rate.id 
                                      ? 'bg-orange-600 text-white' 
                                      : 'bg-orange-500 text-white hover:bg-orange-600'
                                  }`}
                                >
                                  {selectedRoom === rate.id ? 'Selected' : 'Select'}
                                </button>
                              </div>
                            </div>
                            
                            {/* Rate conditions */}
                            {rate.conditions && rate.conditions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-sm font-medium mb-1">Conditions:</p>
                                <ul className="text-xs text-gray-600">
                                  {rate.conditions.map((condition, condIndex) => (
                                    <li key={condIndex} className="mb-1">
                                      <span className="font-medium">{condition.title}:</span> {condition.description}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Booking CTA */}
            {selectedRoom && (
              <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4">
                <div className="container mx-auto flex items-center justify-between">
                  <div>
                    <p className="font-medium">Selected Room</p>
                    <p className="text-sm text-gray-600">Ready to complete your booking</p>
                  </div>
                  <Link
                    href={`/hotel/book?rateId=${selectedRoom}`}
                    className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    Continue to Book
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">No hotel details available.</p>
            <Link 
              href="/hotel/search"
              className="mt-4 inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Return to Search Results
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelDetailsPage;
