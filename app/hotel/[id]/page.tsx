"use client";

import React, { useState, useEffect, JSX } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiMapPin, FiCalendar, FiUsers, FiStar, FiCheck, FiX, FiLoader, FiArrowLeft, FiWifi, FiCoffee, FiDroplet, FiAirplay, FiMaximize2, FiPhone, FiMail, FiAlertCircle, FiChevronLeft, FiChevronRight, FiInfo, FiLayers } from 'react-icons/fi';

interface RoomRate {
  id: string;
  rate_plan_code: string;
  name: string;
  description?: string;
  total_amount: string;
  total_currency: string;
  board_type: string;
  payment_type: string;
  cancellation_timeline?: {
    refund_amount: string;
    currency: string;
    before: string;
  }[];
  cancellation_policy?: {
    type: 'FREE_CANCELLATION' | 'NON_REFUNDABLE' | 'PARTIALLY_REFUNDABLE';
    description?: string;
  };
  conditions?: {
    title: string;
    description: string;
  }[];
  available_rooms?: number;
  max_occupancy?: number;
  room_size?: {
    square_meters: number;
    square_feet: number;
  };
  amenities?: string[];
  photos?: { url: string; caption?: string }[];
}

interface Room {
  id: string;
  name: string;
  description?: string;
  photos: { url: string; caption?: string }[];
  beds: { type: string; count: number; description?: string }[];
  max_occupancy: number;
  room_size?: {
    square_meters: number;
    square_feet: number;
  };
  amenities?: string[];
  rates: RoomRate[];
  rate_plans?: {
    id: string;
    name: string;
    description?: string;
    cancellation_policy?: string;
    meal_plan?: string;
  }[];
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
  const [activePhotoIndices, setActivePhotoIndices] = useState<Record<string, number>>({});
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [loadingRates, setLoadingRates] = useState<{[key: string]: boolean}>({});
  const [expandedRooms, setExpandedRooms] = useState<{[key: string]: boolean}>({});
  const [bookingQuote, setBookingQuote] = useState<{rateId: string; amount: string; currency: string} | null>(null);

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
          // Check if we have rooms in the data or in the accommodation object
          const roomsData = data.rooms || data.accommodation.rooms || [];
          
          // Transform rooms data to ensure proper structure
          const transformedRooms = Array.isArray(roomsData) 
            ? roomsData.map((room: any, index: number) => {
                // Ensure each room has a unique ID
                const roomId = room.id || `room-${index}`;
                
                return {
                  id: roomId,
                  name: room.name || `Room ${index + 1}`,
                  description: room.description || '',
                  photos: Array.isArray(room.photos) ? room.photos.map((p: any) => ({
                    url: p.url || '',
                    caption: p.caption || ''
                  })) : [],
                  beds: Array.isArray(room.beds) ? room.beds : [],
                  rates: Array.isArray(room.rates) ? room.rates.map((rate: any) => ({
                    ...rate,
                    id: rate.id || `rate-${Math.random().toString(36).substr(2, 9)}`,
                    name: rate.name || 'Standard Rate',
                    total_amount: rate.total_amount || '0',
                    total_currency: rate.total_currency || 'USD',
                    cancellation_policy: rate.cancellation_policy || {
                      type: 'NON_REFUNDABLE',
                      description: 'Non-refundable rate'
                    },
                    conditions: Array.isArray(rate.conditions) ? rate.conditions : []
                  })) : [],
                  max_occupancy: room.max_occupancy || 2,
                  amenities: Array.isArray(room.amenities) ? room.amenities : []
                };
              })
            : [];

          const transformedData = {
            accommodation: {
              ...data.accommodation,
              photos: (data.accommodation.photos || []).map((photo: any) => ({
                url: photo.url || ''
              })),
              amenities: (data.accommodation.amenities || []).map((a: any) => ({
                type: a.type || '',
                description: a.description || ''
              })),
              // Ensure we have the basic accommodation info
              id: data.accommodation.id || '',
              name: data.accommodation.name || 'Unknown Hotel',
              description: data.accommodation.description || '',
              location: data.accommodation.location || {
                address: {
                  line_one: '',
                  city_name: '',
                  country_code: ''
                }
              },
              rating: data.accommodation.rating || 0,
              review_score: data.accommodation.review_score || 0
            },
            rooms: transformedRooms,
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

  const handleRoomSelect = async (rate: RoomRate | string) => {
    const rateId = typeof rate === 'string' ? rate : rate?.id;
    if (!rateId) return;
    
    const selectedRate = typeof rate === 'string' ? getRoomRateById(rateId) : rate;
    if (!selectedRate) return;

    setSelectedRoom(rateId);
    
    try {
      setLoadingRates(prev => ({ ...prev, [rateId]: true }));

      // Request a quote for the selected rate
      const response = await fetch(`/api/hotel-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rate_id: rateId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get booking quote');
      }
      
      const quoteData = await response.json();
      
      if (quoteData.success && quoteData.data) {
        setBookingQuote({
          rateId: rateId,
          amount: quoteData.data.total_amount || selectedRate.total_amount,
          currency: quoteData.data.total_currency || selectedRate.total_currency,
        });
      }
    } catch (error) {
      console.error('Error getting booking quote:', error);
      // Handle error appropriately in your UI
    } finally {
      setLoadingRates(prev => ({ ...prev, [rateId]: false }));
    }
  };
  
  const toggleRoomDetails = (roomId: string) => {
    setExpandedRooms(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  // Update active photo index for a specific room
  const updateActivePhotoIndex = (roomId: string, index: number) => {
    setActivePhotoIndices(prev => ({
      ...prev,
      [roomId]: index
    }));
  };

  // Get active photo index for a room, defaulting to 0 if not set
  const getActivePhotoIndex = (roomId: string): number => {
    return activePhotoIndices[roomId] || 0;
  };

  // Safely access room rate by ID
  const getRoomRateById = (rateId: string): RoomRate | undefined => {
    if (!hotelDetails?.rooms) return undefined;
    
    for (const room of hotelDetails.rooms) {
      const rate = room.rates?.find(r => r.id === rateId);
      if (rate) return rate;
    }
    return undefined;
  };
  
  const formatPrice = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(parseFloat(amount));
  };
  
  const getCancellationBadge = (policy?: {type: string, description?: string}) => {
    if (!policy) return null;
    
    const baseClass = 'text-xs font-medium px-2 py-1 rounded-full inline-flex items-center';
    
    switch (policy.type) {
      case 'FREE_CANCELLATION':
        return (
          <span className={`${baseClass} bg-green-50 text-green-700`}>
            <FiCheck className="mr-1" /> Free Cancellation
          </span>
        );
      case 'NON_REFUNDABLE':
        return (
          <span className={`${baseClass} bg-red-50 text-red-700`}>
            <FiX className="mr-1" /> Non-refundable
          </span>
        );
      case 'PARTIALLY_REFUNDABLE':
        return (
          <span className={`${baseClass} bg-yellow-50 text-yellow-700`}>
            <FiCheck className="mr-1" /> Partially Refundable
          </span>
        );
      default:
        return (
          <span className={`${baseClass} bg-gray-50 text-gray-700`}>
            {policy.description || 'Cancellation policy applies'}
          </span>
        );
    }
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

  // Render room rate card
  const renderRateCard = (rate: RoomRate, room: Room) => (
    <div 
      key={rate.id}
      className={`border rounded-lg overflow-hidden transition-all duration-200 ${
        selectedRoom === rate.id 
          ? 'border-orange-500 ring-2 ring-orange-200' 
          : 'border-gray-200 hover:border-orange-300'
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-gray-900">{rate.name || 'Standard Rate'}</h4>
            {rate.description && (
              <p className="text-sm text-gray-500 mt-1">{rate.description}</p>
            )}
            
            {/* Cancellation policy */}
            {rate.cancellation_policy && (
              <div className="mt-2">
                {getCancellationBadge(rate.cancellation_policy)}
              </div>
            )}
            
            {/* Room details */}
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              {room.beds?.length > 0 && (
                <div className="flex items-center">
                  <span className="w-24 text-gray-500">Bed Type:</span>
                  <span>{room.beds.map(bed => `${bed.count} ${bed.type}`).join(' + ')}</span>
                </div>
              )}
              
              {room.room_size && (
                <div className="flex items-center">
                  <span className="w-24 text-gray-500">Room Size:</span>
                  <span>{room.room_size.square_meters} m² ({room.room_size.square_feet} ft²)</span>
                </div>
              )}
              
              {rate.available_rooms !== undefined && (
                <div className="flex items-center">
                  <span className="w-24 text-gray-500">Available:</span>
                  <span>{rate.available_rooms} {rate.available_rooms === 1 ? 'room' : 'rooms'} left</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600">
              {formatPrice(rate.total_amount, rate.total_currency)}
            </div>
            <div className="text-xs text-gray-500">for {calculateNights()} nights</div>
            
            <button
              onClick={() => handleRoomSelect(rate)}
              disabled={loadingRates[rate.id]}
              className={`mt-3 w-full px-4 py-2 rounded-md font-medium text-sm ${
                selectedRoom === rate.id
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-white text-orange-600 border border-orange-600 hover:bg-orange-50'
              } transition-colors`}
            >
              {loadingRates[rate.id] ? (
                <span className="flex items-center justify-center">
                  <FiLoader className="animate-spin mr-2" />
                  Loading...
                </span>
              ) : selectedRoom === rate.id ? (
                'Selected'
              ) : (
                'Select Room'
              )}
            </button>
          </div>
        </div>
        
        {/* Additional rate details */}
        {expandedRooms[rate.id] && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h5 className="font-medium text-gray-900 mb-2">Rate Details</h5>
            
            {rate.conditions?.map((condition, idx) => (
              <div key={idx} className="text-sm text-gray-600 mb-2">
                <div className="font-medium">{condition.title}</div>
                <p className="text-gray-500">{condition.description}</p>
              </div>
            ))}
            
            {rate.cancellation_timeline && rate.cancellation_timeline.length > 0 && (
              <div className="mt-3">
                <h6 className="font-medium text-sm text-gray-900 mb-2">Cancellation Policy</h6>
                <div className="space-y-2">
                  {rate.cancellation_timeline.map((timeline, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>Before {new Date(timeline.before).toLocaleDateString()}:</span>
                      <span className="font-medium">
                        {parseFloat(timeline.refund_amount) > 0 
                          ? `Refund ${timeline.refund_amount} ${timeline.currency}`
                          : 'Non-refundable'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <button
          onClick={() => toggleRoomDetails(rate.id)}
          className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center"
        >
          {expandedRooms[rate.id] ? 'Show less details' : 'Show more details'}
          <svg
            className={`ml-1 w-4 h-4 transition-transform ${
              expandedRooms[rate.id] ? 'transform rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/hotel/search"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              <FiArrowLeft className="text-lg" /> 
              <span>Back to results</span>
            </Link>
            
            {bookingQuote && (
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Your selection</div>
                  <div className="font-medium text-orange-600">
                    {formatPrice(bookingQuote.amount, bookingQuote.currency)}
                    <span className="text-gray-500 text-sm font-normal ml-1">
                      for {calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'}
                    </span>
                  </div>
                </div>
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                  Book Now
                </button>
              </div>
            )}
          </div>
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
                    {hotelDetails.accommodation.photos.map((photo, index) => (
                      <img 
                        key={index}
                        src={photo.url} 
                        alt={`${hotelDetails.accommodation.name} - Photo ${index + 1}`}
                        className={`w-full h-full object-contain absolute inset-0 transition-opacity duration-300 ${
                          index === getActivePhotoIndex('main') ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Photo navigation */}
                    {hotelDetails.accommodation.photos.length > 1 && (
                      <>
                        <button 
                          onClick={() => {
                            const currentIndex = getActivePhotoIndex('main');
                            const newIndex = (currentIndex - 1 + hotelDetails.accommodation.photos.length) % hotelDetails.accommodation.photos.length;
                            updateActivePhotoIndex('main', newIndex);
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                        >
                          ←
                        </button>
                        <button 
                          onClick={() => {
                            const currentIndex = getActivePhotoIndex('main');
                            const newIndex = (currentIndex + 1) % hotelDetails.accommodation.photos.length;
                            updateActivePhotoIndex('main', newIndex);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                        >
                          →
                        </button>
                      </>
                    )}
                    
                    {/* Photo counter */}
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                      {getActivePhotoIndex('main') + 1} / {hotelDetails.accommodation.photos.length}
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
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Rooms</h2>
              
              {hotelDetails.rooms?.length > 0 ? (
                <div className="space-y-6">
                  {hotelDetails.rooms.map((room) => (
                    <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* Room Header */}
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{room.name}</h3>
                            {room.description && (
                              <p className="mt-1 text-gray-600">{room.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => toggleRoomDetails(room.id)}
                            className="text-sm font-medium text-orange-600 hover:text-orange-700"
                          >
                            {expandedRooms[room.id] ? 'Hide details' : 'View details'}
                          </button>
                        </div>
                      </div>

                      {/* Room Photos */}
                      {room.photos && room.photos.length > 0 && (
                        <div className="relative h-64 overflow-hidden bg-gray-100 rounded-lg">
                          {/* Main Image */}
                          <div className="relative w-full h-full">
                            {room.photos.map((photo, index) => (
                              <div
                                key={index}
                                className={`absolute inset-0 transition-opacity duration-300 ${index === getActivePhotoIndex(room.id) ? 'opacity-100' : 'opacity-0'}`}
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.caption || `Room ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  loading={index === 0 ? 'eager' : 'lazy'}
                                />
                              </div>
                            ))}
                            
                            {/* Navigation Arrows */}
                            {room.photos.length > 1 && (
                              <div className="absolute inset-0 flex items-center justify-between p-2 pointer-events-none">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentIndex = getActivePhotoIndex(room.id);
                                    const newIndex = (currentIndex - 1 + room.photos!.length) % room.photos!.length;
                                    updateActivePhotoIndex(room.id, newIndex);
                                  }}
                                  className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors pointer-events-auto"
                                  aria-label="Previous photo"
                                >
                                  <FiChevronLeft size={24} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentIndex = getActivePhotoIndex(room.id);
                                    const newIndex = (currentIndex + 1) % room.photos!.length;
                                    updateActivePhotoIndex(room.id, newIndex);
                                  }}
                                  className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors pointer-events-auto"
                                  aria-label="Next photo"
                                >
                                  <FiChevronRight size={24} />
                                </button>
                              </div>
                            )}
                            
                            {/* Photo Indicators */}
                            {room.photos.length > 1 && (
                              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                                {room.photos.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateActivePhotoIndex(room.id, idx);
                                    }}
                                    className={`h-2 rounded-full transition-all ${
                                      idx === getActivePhotoIndex(room.id) ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
                                    }`}
                                    aria-label={`View photo ${idx + 1}`}
                                  />
                                ))}
                              </div>
                            )}
                            
                            {/* Photo Counter */}
                            {room.photos.length > 1 && (
                              <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                                {getActivePhotoIndex(room.id) + 1} / {room.photos.length}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Room Details */}
                      <div className="p-6">
                        {/* Room Features */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {room.beds && room.beds.length > 0 && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiLayers className="w-4 h-4 mr-2 text-gray-400" />
                              {room.beds
                                .map((bed) => `${bed.count} ${bed.type}`)
                                .join(' + ')}
                            </div>
                          )}
                          {room.max_occupancy && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiUsers className="w-4 h-4 mr-2 text-gray-400" />
                              Sleeps {room.max_occupancy}
                            </div>
                          )}
                          {room.room_size && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiMaximize2 className="w-4 h-4 mr-2 text-gray-400" />
                              {room.room_size.square_meters} m² (
                              {room.room_size.square_feet} ft²)
                            </div>
                          )}
                          {room.amenities && room.amenities.length > 0 && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiWifi className="w-4 h-4 mr-2 text-gray-400" />
                              {room.amenities[0]}
                              {room.amenities.length > 1 && (
                                <span className="ml-1">+{room.amenities.length - 1} more</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Room Rates */}
                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <h4 className="text-sm font-medium text-gray-500 mb-4">Available Rates</h4>
                          <div className="space-y-4">
                            {room.rates?.map((rate) => (
                              <div
                                key={rate.id}
                                className={`p-4 rounded-lg border ${
                                  selectedRoom === rate.id
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-orange-300'
                                } transition-colors`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center">
                                      <h5 className="font-medium text-gray-900">
                                        {rate.board_type.replace(/_/g, ' ')}
                                      </h5>
                                      {rate.cancellation_policy && (
                                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                          {rate.cancellation_policy.type === 'FREE_CANCELLATION'
                                            ? 'Free Cancellation'
                                            : rate.cancellation_policy.type === 'NON_REFUNDABLE'
                                            ? 'Non-refundable'
                                            : 'Partially Refundable'}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {rate.conditions && rate.conditions.length > 0 && (
                                      <p className="mt-1 text-sm text-gray-500">
                                        {rate.conditions[0]?.description}
                                      </p>
                                    )}
                                    
                                    {rate.cancellation_timeline && rate.cancellation_timeline.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs text-gray-500">
                                          Free cancellation until {new Date(
                                            rate.cancellation_timeline[0].before
                                          ).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-gray-900">
                                      {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: rate.total_currency || 'USD',
                                      }).format(parseFloat(rate.total_amount))}
                                    </div>
                                    <div className="text-xs text-gray-500">for {calculateNights()} nights</div>
                                    <button
                                      onClick={() => handleRoomSelect(rate.id)}
                                      disabled={loadingRates[rate.id]}
                                      className={`mt-2 px-4 py-2 rounded-md text-sm font-medium ${
                                        selectedRoom === rate.id
                                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                                          : 'bg-white text-orange-600 border border-orange-600 hover:bg-orange-50'
                                      } transition-colors`}
                                    >
                                      {loadingRates[rate.id] ? (
                                        <span className="flex items-center">
                                          <FiLoader className="animate-spin mr-2" />
                                          Loading...
                                        </span>
                                      ) : selectedRoom === rate.id ? (
                                        'Selected'
                                      ) : (
                                        'Select'
                                      )}
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Additional rate details */}
                                {expandedRooms[room.id] && rate.conditions && rate.conditions.length > 1 && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h6 className="text-sm font-medium text-gray-900 mb-2">Rate Conditions</h6>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                      {rate.conditions.slice(1).map((condition, idx) => (
                                        <li key={idx} className="flex items-start">
                                          <FiInfo className="flex-shrink-0 w-4 h-4 mt-0.5 mr-2 text-orange-500" />
                                          <span>
                                            <span className="font-medium">{condition.title}:</span>{' '}
                                            {condition.description}
                                          </span>
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
              ) : (
                <div className="text-center py-12">
                  <FiAlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No rooms available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are no rooms available for the selected dates.
                  </p>
                </div>
              )}
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