"use client";

import React, { useState, useEffect, JSX } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiMapPin, FiCalendar, FiUsers, FiStar, FiCheck, FiX, FiLoader, FiArrowLeft, FiWifi, FiCoffee, FiDroplet, FiAirplay, FiMaximize2, FiPhone, FiMail } from 'react-icons/fi';

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
    phone_number?: string;
    email?: string;
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
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const idParts = (params?.id as string).split(':');
  let [searchResultId, accommodationId, checkIn, checkOut, rooms, guests] = idParts;
  
  const hotelId = idParts.length > 1 ? accommodationId : params?.id as string;
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const formatDateToYMD = (date: Date) => date.toISOString().split('T')[0];
  
  const defaultCheckIn = formatDateToYMD(today);
  const defaultCheckOut = formatDateToYMD(tomorrow);
  
  checkIn = checkIn && checkIn !== 'undefined' ? checkIn : defaultCheckIn;
  checkOut = checkOut && checkOut !== 'undefined' ? checkOut : defaultCheckOut;

  useEffect(() => {
    const fetchHotelDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = new URL(`/api/hotel-details/${searchResultId || 'none'}:${hotelId}:${checkIn}:${checkOut}:${rooms || 1}:${guests || 1}`, window.location.origin);
        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error('Failed to fetch hotel details');
        }

        const responseData = await response.json();
        const data = responseData.data?.data || responseData.data || responseData;
        
        if (data?.accommodation) {
          const transformedData = {
            accommodation: {
              ...data.accommodation,
              photos: (data.accommodation.photos || []).map((photo: any) => ({
                url: photo.url || ''
              })),
              amenities: (data.accommodation.amenities || []).map((a: any) => ({
                type: a.type || '',
                description: a.description || ''
              }))
            },
            rooms: data.rooms || [],
            check_in_date: data.check_in_date || checkIn,
            check_out_date: data.check_out_date || checkOut
          };
          
          setHotelDetails(transformedData);
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
      setLoading(false);
    }
  }, [hotelId]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const calculateNights = () => {
    if (!hotelDetails?.check_in_date || !hotelDetails?.check_out_date) return 0;
    
    const checkInDate = new Date(hotelDetails.check_in_date);
    const checkOutDate = new Date(hotelDetails.check_out_date);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleRoomSelect = (rateId: string) => {
    setSelectedRoom(rateId);
  };

  const getAmenityIcon = (type: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      'wifi': <FiWifi />,
      'breakfast': <FiCoffee />,
      'pool': <FiDroplet />,
      'tv': <FiAirplay />,
      'parking': <FiMaximize2 />
    };
    return iconMap[type.toLowerCase()] || <FiCheck />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link 
            href="/hotel/search"
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <FiArrowLeft className="text-lg" /> 
            <span>Back to search results</span>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <FiLoader className="animate-spin text-6xl text-orange-500 mb-6" />
              <div className="absolute inset-0 blur-xl bg-orange-300/30 animate-pulse"></div>
            </div>
            <p className="text-gray-600 text-lg">Loading your perfect stay...</p>
          </div>
        ) : error ? (
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-2xl p-8 text-center shadow-lg">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <p className="text-red-700 text-lg font-medium mb-4">{error}</p>
            <Link 
              href="/hotel/search"
              className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Return to Search Results
            </Link>
          </div>
        ) : hotelDetails ? (
          <>
            {/* Photo Gallery */}
            <div className="rounded-2xl shadow-xl overflow-hidden mb-8">
              <div className="relative">
                {hotelDetails.accommodation.photos && hotelDetails.accommodation.photos.length > 0 ? (
                  <div className="relative w-full h-[400px] group">
                    <img 
                      src={hotelDetails.accommodation.photos[activePhotoIndex]?.url || hotelDetails.accommodation.photos[0].url} 
                      alt={hotelDetails.accommodation.name}
                      className="w-full h-full object-contain "
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Photo navigation */}
                    {hotelDetails.accommodation.photos.length > 1 && (
                      <>
                        <button 
                          onClick={() => setActivePhotoIndex((prev) => (prev - 1 + hotelDetails.accommodation.photos.length) % hotelDetails.accommodation.photos.length)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                        >
                          ←
                        </button>
                        <button 
                          onClick={() => setActivePhotoIndex((prev) => (prev + 1) % hotelDetails.accommodation.photos.length)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                        >
                          →
                        </button>
                      </>
                    )}
                    
                    {/* Photo counter */}
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                      {activePhotoIndex + 1} / {hotelDetails.accommodation.photos.length}
                    </div>
                    
                    {/* Rating badge */}
                    {hotelDetails.accommodation.rating && (
                      <div className="absolute top-6 right-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-full text-base font-bold shadow-lg flex items-center gap-2">
                        <FiStar className="fill-current" />
                        {hotelDetails.accommodation.rating}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[500px] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-500 text-lg">No images available</span>
                  </div>
                )}
              </div>
              
              {/* Hotel Information */}
              <div className="p-8">
                <h1 className="text-4xl font-bold mb-3 text-gray-900">{hotelDetails.accommodation.name}</h1>
                <div className="flex items-start gap-2 text-gray-600 mb-6">
                  <FiMapPin className="text-orange-500 text-xl mt-1 flex-shrink-0" />
                  <p className="text-lg">
                    {hotelDetails.accommodation.location.address.line_one}, {hotelDetails.accommodation.location.address.city_name}, {hotelDetails.accommodation.location.address.country_code}
                  </p>
                </div>
                
                {/* Stay Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-orange-500 p-2 rounded-lg">
                        <FiCalendar className="text-white text-xl" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Check-in</p>
                        <p className="text-gray-700">{formatDisplayDate(hotelDetails.check_in_date)}</p>
                        {hotelDetails.accommodation.check_in_information && (
                          <p className="text-xs text-gray-600 mt-1">
                            After {formatTime(hotelDetails.accommodation.check_in_information.check_in_after_time)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-500 p-2 rounded-lg">
                        <FiCalendar className="text-white text-xl" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Check-out</p>
                        <p className="text-gray-700">{formatDisplayDate(hotelDetails.check_out_date)}</p>
                        {hotelDetails.accommodation.check_in_information && (
                          <p className="text-xs text-gray-600 mt-1">
                            Before {formatTime(hotelDetails.accommodation.check_in_information.check_out_before_time)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-purple-500 p-2 rounded-lg">
                        <FiUsers className="text-white text-xl" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Guests & Rooms</p>
                        <p className="text-gray-700">{guests} Guest{parseInt(guests) > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-600 mt-1">{rooms} Room{parseInt(rooms) > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-gray-900">About this property</h2>
                  <p className="text-gray-700 leading-relaxed text-lg">{hotelDetails.accommodation.description}</p>
                </div>
                
                {/* Amenities */}
                {hotelDetails.accommodation.amenities && hotelDetails.accommodation.amenities.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-gray-900">Amenities</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {hotelDetails.accommodation.amenities.slice(0, 8).map((amenity, index) => (
                        <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-orange-300 transition-colors">
                          <div className="text-orange-500 text-xl">
                            {getAmenityIcon(amenity.type)}
                          </div>
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {amenity.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                    {hotelDetails.accommodation.amenities.length > 8 && (
                      <button className="mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm">
                        + Show all {hotelDetails.accommodation.amenities.length} amenities
                      </button>
                    )}
                  </div>
                )}

                {/* Contact Info */}
                {(hotelDetails.accommodation.phone_number || hotelDetails.accommodation.email) && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Contact Information</h3>
                    <div className="flex flex-wrap gap-6">
                      {hotelDetails.accommodation.phone_number && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <FiPhone className="text-orange-500" />
                          <span>{hotelDetails.accommodation.phone_number}</span>
                        </div>
                      )}
                      {hotelDetails.accommodation.email && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <FiMail className="text-orange-500" />
                          <span>{hotelDetails.accommodation.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Room Selection */}
            <div className="mb-24">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Choose Your Room</h2>
              <div className="space-y-6">
                {hotelDetails.rooms.map((room, roomIndex) => (
                  <div key={roomIndex} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
                    <div className="flex flex-col lg:flex-row">
                      {/* Room Image */}
                      <div className="lg:w-2/5 h-64 lg:h-auto relative group overflow-hidden">
                        {room.photos && room.photos.length > 0 ? (
                          <img 
                            src={room.photos[0].url} 
                            alt={room.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <span className="text-gray-400">No image available</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      
                      {/* Room Details */}
                      <div className="p-6 lg:w-3/5">
                        <h3 className="text-2xl font-bold mb-4 text-gray-900">{room.name}</h3>
                        
                        {/* Bed Info */}
                        {room.beds && room.beds.length > 0 && (
                          <div className="mb-6">
                            <p className="font-semibold mb-2 text-gray-700">Bed Configuration:</p>
                            <div className="flex flex-wrap gap-2">
                              {room.beds.map((bed, bedIndex) => (
                                <span key={bedIndex} className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-4 py-2 rounded-full text-sm font-medium border border-gray-300">
                                  {bed.count} × {bed.type.charAt(0).toUpperCase() + bed.type.slice(1)} Bed
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Rates */}
                        <div className="space-y-4">
                          {room.rates.map((rate) => (
                            <div 
                              key={rate.id} 
                              className={`border-2 rounded-xl p-5 transition-all cursor-pointer ${
                                selectedRoom === rate.id 
                                  ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg scale-[1.02]' 
                                  : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                              }`}
                              onClick={() => handleRoomSelect(rate.id)}
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-lg text-gray-900">
                                      {rate.board_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                    {selectedRoom === rate.id && (
                                      <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                        SELECTED
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mb-3">
                                    💳 {rate.payment_type === 'pay_now' ? 'Pay now' : 'Pay at property'}
                                  </p>
                                  
                                  {/* Cancellation */}
                                  {rate.cancellation_timeline && rate.cancellation_timeline.length > 0 ? (
                                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                                      <FiCheck className="text-green-600 font-bold" />
                                      Free cancellation until {new Date(rate.cancellation_timeline[0].before).toLocaleDateString()}
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                                      <FiX className="text-red-600 font-bold" />
                                      Non-refundable
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-right flex-shrink-0">
                                  <div className="mb-3">
                                    <p className="text-3xl font-bold text-orange-600">
                                      {rate.total_currency} {rate.total_amount}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Total for {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  
                                  <button
                                    className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:-translate-y-0.5 hover:shadow-lg ${
                                      selectedRoom === rate.id 
                                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white' 
                                        : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                                    }`}
                                  >
                                    {selectedRoom === rate.id ? '✓ Selected' : 'Select Room'}
                                  </button>
                                </div>
                              </div>
                              
                              {/* Conditions */}
                              {rate.conditions && rate.conditions.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <p className="text-sm font-semibold mb-2 text-gray-700">Terms & Conditions:</p>
                                  <ul className="space-y-1">
                                    {rate.conditions.map((condition, condIndex) => (
                                      <li key={condIndex} className="text-xs text-gray-600 flex items-start gap-2">
                                        <span className="text-orange-500 mt-0.5">•</span>
                                        <span><span className="font-medium">{condition.title}:</span> {condition.description}</span>
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
            </div>
            
            {/* Floating Booking Bar */}
            {selectedRoom && (
              <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg shadow-2xl border-t-2 border-orange-500 p-4 z-40 animate-slide-up">
                <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl">
                  <div>
                    <p className="font-bold text-lg text-gray-900">🎉 Room Selected!</p>
                    <p className="text-sm text-gray-600">Ready to complete your booking</p>
                  </div>
                  <Link
                    href={`/hotel/book?rateId=${selectedRoom}`}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-center"
                  >
                    Continue to Book →
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-2xl p-8 text-center shadow-lg">
            <div className="text-yellow-500 text-5xl mb-4">🏨</div>
            <p className="text-yellow-800 text-lg font-medium mb-4">No hotel details available</p>
            <Link 
              href="/hotel/search"
              className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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