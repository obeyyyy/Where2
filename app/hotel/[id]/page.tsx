"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiMapPin, FiCalendar, FiUsers, FiStar, FiCheck, FiX, 
  FiLoader, FiArrowLeft, FiWifi, FiCoffee, FiDroplet, 
  FiAirplay, FiMaximize2, FiPhone, FiMail, FiAlertCircle, 
  FiChevronLeft, FiChevronRight, FiInfo, FiLayers, FiDollarSign,
  FiClock, FiShield, FiPackage, FiAward
} from 'react-icons/fi';

interface RoomRate {
  id: string;
  rate_plan_code: string;
  name: string;
  description?: string;
  total_amount: string;
  total_currency: string;
  board_type: string;
  payment_type: string;
  
  // Price breakdown
  base_amount?: string;
  base_currency?: string;
  tax_amount?: string;
  tax_currency?: string;
  fee_amount?: string;
  fee_currency?: string;
  public_amount?: string;
  public_currency?: string;
  due_at_accommodation_amount?: string;
  due_at_accommodation_currency?: string;
  estimated_commission_amount?: string;
  estimated_commission_currency?: string;
  
  // Cancellation and policies
  cancellation_timeline?: {
    refund_amount: string;
    currency: string;
    before: string;
  }[];
  cancellation_policy?: {
    type: 'FREE_CANCELLATION' | 'NON_REFUNDABLE' | 'PARTIALLY_REFUNDABLE';
    description?: string;
  };
  
  // Room details
  conditions?: {
    title: string;
    description: string;
  }[];
  available_rooms?: number;
  quantity_available?: number;
  max_occupancy?: number;
  room_size?: {
    square_meters: number;
    square_feet: number;
  };
  
  // Additional info
  amenities?: string[];
  photos?: { url: string; caption?: string }[];
  
  // Deal and rate info
  deal_types?: string[];
  code?: string;
  
  // Payment methods
  available_payment_methods?: string[][];
  
  // Loyalty program
  supported_loyalty_programme?: string;
  loyalty_programme_required?: boolean;
  negotiated_rate_id?: string;
  
  // Additional metadata
  additional_info?: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  photos: { url: string; caption: string }[];
  beds: { type: string; count: number; description?: string }[];
  max_occupancy: number;
  room_size: {
    square_meters: number;
    square_feet: number;
  };
  amenities: string[];
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
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [activePhotoIndices, setActivePhotoIndices] = useState<Record<string, number>>({});
  const [expandedRates, setExpandedRates] = useState<Record<string, boolean>>({});
  const [bookingQuote, setBookingQuote] = useState<{rateId: string; amount: string; currency: string} | null>(null);

  // Parse URL parameters safely
  const parseUrlParams = () => {
    try {
      const idStr = decodeURIComponent(params?.id as string);
      const idParts = idStr.split(':');
      
      // Extract parameters with fallbacks
      const [
        searchResultId = 'none',
        accommodationId = idStr,
        checkIn = new Date().toISOString().split('T')[0],
        checkOut = new Date(Date.now() + 86400000).toISOString().split('T')[0],
        rooms = '1',
        guests = '1'
      ] = idParts;
      
      // Ensure hotelId is always valid
      const hotelId = idParts.length > 1 ? accommodationId : idStr;
      
      // Format dates to YYYY-MM-DD
      const formatDate = (date: string) => {
        try {
          return new Date(date).toISOString().split('T')[0];
        } catch {
          return date; // Return as is if invalid date
        }
      };
      
      return {
        searchResultId,
        hotelId,
        checkIn: formatDate(checkIn),
        checkOut: formatDate(checkOut),
        rooms: Math.max(1, parseInt(rooms) || 1),
        guests: Math.max(1, parseInt(guests) || 1)
      };
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
      // Return safe defaults
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      return {
        searchResultId: 'none',
        hotelId: params?.id as string,
        checkIn: today,
        checkOut: tomorrow,
        rooms: 1,
        guests: 1
      };
    }
  };
  
  const { searchResultId, hotelId, checkIn, checkOut, rooms, guests } = parseUrlParams();

  useEffect(() => {
    const fetchHotelDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build URL with properly encoded parameters
        const params = new URLSearchParams();
        params.append('searchId', searchResultId);
        params.append('hotelId', hotelId);
        params.append('checkIn', checkIn);
        params.append('checkOut', checkOut);
        params.append('rooms', rooms.toString());
        params.append('guests', guests.toString());
        
        const url = new URL(
          `/api/hotel-details/${encodeURIComponent(hotelId)}?${params.toString()}`,
          window.location.origin
        );
        
        console.log('Fetching hotel details:', url.toString());
        const response = await fetch(url.toString());

        if (!response.ok) throw new Error('Failed to fetch hotel details');

        const responseData = await response.json();
        const data = responseData.data;

        if (data?.accommodation) {
          const roomsData = data.rooms || data.accommodation.rooms || [];
          
          if (!Array.isArray(roomsData) || roomsData.length === 0) {
            setError('No rooms available for the selected dates');
            setLoading(false);
            return;
          }

          const transformedRooms: Room[] = roomsData
            .map((room: any, index: number) => {
              console.log('Processing room:', { index, roomId: room.id, room }); // Debug log
              
              // Normalize photos - handle both string URLs and objects with url property
              const normalizePhotos = (photos: any) => {
                if (!photos) return [];
                if (Array.isArray(photos)) {
                  return photos
                    .map((photo: any) => {
                      if (!photo) return null;
                      if (typeof photo === 'string') {
                        return { url: photo, caption: '' };
                      }
                      if (typeof photo === 'object') {
                        // Handle both { url: string } and { original: string } formats
                        const url = photo.url || photo.original;
                        if (url) {
                          return { 
                            url,
                            caption: photo.caption || photo.description || ''
                          };
                        }
                      }
                      return null;
                    })
                    .filter((p: any) => p !== null && p.url);
                }
                return [];
              };

              // First try room.photos, then fall back to room.images, then empty array
              const roomPhotos = normalizePhotos(room.photos || room.images || []);

              return {
                id: room.id || `room-${index}`,
                name: room.name || `Room ${index + 1}`,
                description: room.description || '',
                photos: roomPhotos,
                beds: Array.isArray(room.beds) ? room.beds : [],
                rates: Array.isArray(room.rates) ? room.rates.map((rate: any) => ({
                  id: rate.id || `rate-${Math.random().toString(36).substr(2, 9)}`,
                  name: rate.name || rate.board_type?.replace(/_/g, ' ') || 'Standard Rate',
                  total_amount: String(rate.total_amount || '0'),
                  total_currency: rate.total_currency || 'USD',
                  board_type: rate.board_type || 'room_only',
                  payment_type: rate.payment_type || 'pay_now',
                  cancellation_policy: rate.cancellation_policy,
                  conditions: Array.isArray(rate.conditions) ? rate.conditions : [],
                  cancellation_timeline: Array.isArray(rate.cancellation_timeline) ? rate.cancellation_timeline : [],
                  available_rooms: rate.available_rooms || rate.quantity_available,
                  rate_plan_code: rate.rate_plan_code || rate.code || '',
                  description: rate.description || ''
                })) : [],
                max_occupancy: room.max_occupancy || 2,
                room_size: room.room_size || { square_meters: 0, square_feet: 0 },
                amenities: Array.isArray(room.amenities) ? room.amenities : []
              };
            })
            .filter((room): room is Room => room.rates.length > 0);

          if (transformedRooms.length === 0) {
            setError('No rooms with available rates found');
            setLoading(false);
            return;
          }

          setHotelDetails({
            accommodation: {
              ...data.accommodation,
              photos: Array.isArray(data.accommodation?.photos) 
                ? data.accommodation.photos.map((photo: any) => ({
                    url: typeof photo === 'string' ? photo : photo?.url || ''
                  })).filter((p: any) => p.url)
                : []
            },
            rooms: transformedRooms,
            check_in_date: checkIn,
            check_out_date: checkOut
          });
        } else {
          setError('Could not retrieve hotel details');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (hotelId) fetchHotelDetails();
  }, [hotelId]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const calculateNights = () => {
    if (!hotelDetails?.check_in_date || !hotelDetails?.check_out_date) return 0;
    const checkInDate = new Date(hotelDetails.check_in_date);
    const checkOutDate = new Date(hotelDetails.check_out_date);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatPrice = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(parseFloat(amount));
  };

  const handleRoomSelect = (rateId: string, rate: RoomRate) => {
    setSelectedRoom(rateId);
    setBookingQuote({
      rateId: rateId,
      amount: rate.total_amount,
      currency: rate.total_currency,
    });
  };

  const updatePhotoIndex = (roomId: string, index: number) => {
    setActivePhotoIndices(prev => ({ ...prev, [roomId]: index }));
  };

  const getPhotoIndex = (roomId: string): number => activePhotoIndices[roomId] || 0;

  const toggleRateDetails = (rateId: string) => {
    setExpandedRates(prev => ({ ...prev, [rateId]: !prev[rateId] }));
  };

  const getBoardTypeLabel = (boardType: string) => {
    const labels: Record<string, string> = {
      room_only: 'Room Only',
      breakfast: 'Breakfast Included',
      half_board: 'Half Board',
      full_board: 'Full Board',
      all_inclusive: 'All Inclusive'
    };
    return labels[boardType] || boardType.replace(/_/g, ' ');
  };

  const CancellationBadge = ({ policy }: { policy?: RoomRate['cancellation_policy'] }) => {
    if (!policy) return null;

    const badges = {
      FREE_CANCELLATION: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <FiCheck className="w-3 h-3" />,
        label: 'Free Cancellation'
      },
      NON_REFUNDABLE: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <FiX className="w-3 h-3" />,
        label: 'Non-refundable'
      },
      PARTIALLY_REFUNDABLE: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <FiShield className="w-3 h-3" />,
        label: 'Partially Refundable'
      }
    };

    const badge = badges[policy.type];
    if (!badge) return null;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const PhotoCarousel = ({ photos, roomId }: { photos: { url: string; caption?: string }[]; roomId: string }) => {
    if (!photos || photos.length === 0) {
      return (
        <div className="h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <span className="text-gray-400">No images</span>
        </div>
      );
    }

    const currentIndex = getPhotoIndex(roomId);

    return (
      <div className="relative h-full group">
        {photos.map((photo, index) => (
          <img
            key={index}
            src={photo.url}
            alt={photo.caption || `Photo ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        {photos.length > 1 && (
          <>
            <button
              onClick={() => updatePhotoIndex(roomId, (currentIndex - 1 + photos.length) % photos.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => updatePhotoIndex(roomId, (currentIndex + 1) % photos.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => updatePhotoIndex(roomId, idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
              {currentIndex + 1} / {photos.length}
            </div>
          </>
        )}
      </div>
    );
  };

  const RoomPhotoCarousel = ({ 
    photos: rawPhotos, 
    roomId, 
    fallbackPhotos = [] 
  }: { 
    photos: any; 
    roomId: string;
    fallbackPhotos?: Array<{ url: string; caption?: string }>;
  }) => {
    console.log('RoomPhotoCarousel - rawPhotos:', rawPhotos, 'fallbackPhotos:', fallbackPhotos); // Debug log
    
    // Normalize photos to handle different formats
    const photos = React.useMemo(() => {
      if (rawPhotos && Array.isArray(rawPhotos) && rawPhotos.length > 0) {
        return rawPhotos
          .map(photo => ({
            url: typeof photo === 'string' ? photo : photo?.url || photo?.original || ''
          }))
          .filter(photo => photo.url && photo.url.trim() !== '');
      }
      
      // If no room-specific photos, use fallback photos if available
      if (fallbackPhotos && fallbackPhotos.length > 0) {
        return fallbackPhotos
          .map(photo => ({
            url: photo.url || '',
            caption: photo.caption || ''
          }))
          .filter(photo => photo.url && photo.url.trim() !== '');
      }
      
      return [];
    }, [rawPhotos, fallbackPhotos]);

    // Handle case when there are no photos
    if (!photos.length) {
      return (
        <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <span className="text-gray-400 text-sm">No room images available</span>
        </div>
      );
    }

    const currentIndex = getPhotoIndex(roomId) % photos.length;
    const currentPhoto = photos[currentIndex];

    return (
      <div className="relative h-full group">
        <div className="absolute inset-0 bg-gray-100">
          <img
            src={currentPhoto?.url || ''}
            alt={`Room photo ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://via.placeholder.com/800x600?text=Room+Image+Not+Available';
            }}
          />
        </div>

        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updatePhotoIndex(roomId, (currentIndex - 1 + photos.length) % photos.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous photo"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updatePhotoIndex(roomId, (currentIndex + 1) % photos.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next photo"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    updatePhotoIndex(roomId, idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
                  }`}
                  aria-label={`Go to photo ${idx + 1}`}
                />
              ))}
            </div>
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
              {currentIndex + 1} / {photos.length}
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="animate-spin text-6xl text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (error || !hotelDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <FiAlertCircle className="text-5xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Hotel</h2>
          <p className="text-gray-600 mb-6">{error || 'Hotel details not found'}</p>
          <Link
            href="/hotel/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <FiArrowLeft /> Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/hotel/search" className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium">
              <FiArrowLeft /> Back to results
            </Link>
            {bookingQuote && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-xl font-bold text-orange-600">
                    {formatPrice(bookingQuote.amount, bookingQuote.currency)}
                  </div>
                </div>
                <Link
                  href={`/hotel/book?rateId=${bookingQuote.rateId}`}
                  className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  Book Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {/* Hotel Photos */}
          {hotelDetails.accommodation?.photos && hotelDetails.accommodation.photos.length > 0 && (
            <div className="h-96">
              <PhotoCarousel photos={hotelDetails.accommodation.photos} roomId="main" />
            </div>
          )}
          
          <div className="p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{hotelDetails.accommodation.name}</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <FiMapPin className="text-orange-500" />
                  <span>{hotelDetails.accommodation.location.address.line_one}, {hotelDetails.accommodation.location.address.city_name}</span>
                </div>
              </div>
              {hotelDetails.accommodation.rating && (
                <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg">
                  <FiStar className="fill-current" />
                  <span className="font-bold text-lg">{hotelDetails.accommodation.rating}</span>
                </div>
              )}
            </div>

            {/* Stay Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 bg-orange-50 p-4 rounded-lg">
                <FiCalendar className="text-orange-600 text-xl" />
                <div>
                  <div className="text-sm text-gray-600">Check-in</div>
                  <div className="font-semibold">{formatDisplayDate(checkIn)}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(checkIn).toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg">
                <FiCalendar className="text-blue-600 text-xl" />
                <div>
                  <div className="text-sm text-gray-600">Check-out</div>
                  <div className="font-semibold">{formatDisplayDate(checkOut)}</div>
                  <div className="text-xs text-gray-500">
                    {Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))} nights
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-lg">
                <FiUsers className="text-purple-600 text-xl" />
                <div>
                  <div className="text-sm text-gray-600">Guests & Rooms</div>
                  <div className="font-semibold">
                    {guests} Guest{guests > 1 ? 's' : ''} • {rooms} Room{rooms > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed mb-6">{hotelDetails.accommodation.description}</p>

            {/* Amenities */}
            {hotelDetails.accommodation.amenities?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Hotel Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {hotelDetails.accommodation.amenities.slice(0, 8).map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <FiCheck className="text-green-600" />
                      <span className="capitalize">{amenity.type.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rooms Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Rooms</h2>
          <div className="space-y-6">
            {hotelDetails.rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="grid md:grid-cols-[350px,1fr] gap-6">
                  {/* Room Image */}
                  <div className="h-64 md:h-auto">
                    <RoomPhotoCarousel 
                      photos={room.photos} 
                      roomId={room.id} 
                      fallbackPhotos={hotelDetails?.accommodation?.photos || []} 
                    />
                  </div>

                  {/* Room Details */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{room.name}</h3>
                    {room.description && <p className="text-gray-600 mb-4">{room.description}</p>}

                    {/* Room Features */}
                    <div className="flex flex-wrap gap-4 mb-6">
                      {room.beds?.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FiLayers className="text-gray-400" />
                          <span>{room.beds.map(b => `${b.count} ${b.type}`).join(' + ')}</span>
                        </div>
                      )}
                      {room.max_occupancy && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FiUsers className="text-gray-400" />
                          <span>Up to {room.max_occupancy} guests</span>
                        </div>
                      )}
                      {room.room_size && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FiMaximize2 className="text-gray-400" />
                          <span>{room.room_size.square_meters}m² ({room.room_size.square_feet}ft²)</span>
                        </div>
                      )}
                    </div>

                    {/* Room Amenities */}
                    {room.amenities?.length > 0 && (
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-2">
                          {room.amenities.slice(0, 6).map((amenity, idx) => (
                            <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 6 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{room.amenities.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rate Plans */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 mb-3">Available Rates</h4>
                      {room.rates.map((rate) => (
                        <div
                          key={rate.id}
                          className={`border-2 rounded-lg p-4 transition-all ${
                            selectedRoom === rate.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-semibold text-gray-900">{getBoardTypeLabel(rate.board_type)}</h5>
                                <CancellationBadge policy={rate.cancellation_policy} />
                              </div>
                              
                              {rate.available_rooms !== undefined && (
                                <p className="text-sm text-orange-600 font-medium">
                                  Only {rate.available_rooms} room{rate.available_rooms !== 1 ? 's' : ''} left!
                                </p>
                              )}
                            </div>

                            <div className="text-right ml-4">
                              <div className="text-2xl font-bold text-gray-900">
                                {formatPrice(rate.total_amount, rate.total_currency)}
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                for {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                              </div>
                              <button
                                onClick={() => handleRoomSelect(rate.id, rate)}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                  selectedRoom === rate.id
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-white text-orange-600 border-2 border-orange-600 hover:bg-orange-50'
                                }`}
                              >
                                {selectedRoom === rate.id ? 'Selected' : 'Select'}
                              </button>
                            </div>
                          </div>

                          {/* Rate Details */}
                          {((rate.conditions?.length ?? 0) > 0 || (rate.cancellation_timeline?.length ?? 0) > 0) && (
                            <>
                              <button
                                onClick={() => toggleRateDetails(rate.id)}
                                className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                              >
                                <FiInfo className="w-4 h-4" />
                                {expandedRates[rate.id] ? 'Hide details' : 'Show details'}
                              </button>

                              {expandedRates[rate.id] && (
                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                  {/* Rate Details */}
                                  <div className="space-y-3">
                                    {/* Deal Types */}
                                    {rate.deal_types && rate.deal_types.length > 0 && (
                                      <div>
                                        <h6 className="font-medium text-sm text-gray-900 mb-1">Deal Type</h6>
                                        <div className="flex flex-wrap gap-2">
                                          {rate.deal_types.map((type, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full capitalize">
                                              {type.replace(/_/g, ' ')}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Rate Code */}
                                    {rate.code && (
                                      <div>
                                        <h6 className="font-medium text-sm text-gray-900 mb-1">Rate Code</h6>
                                        <span className="text-sm text-gray-600">{rate.code || 'N/A'}</span>
                                      </div>
                                    )}

                                    {/* Payment Information */}
                                    <div>
                                      <h6 className="font-medium text-sm text-gray-900 mb-1">Payment Information</h6>
                                      <div className="space-y-1 text-sm text-gray-600">
                                        <div className="flex justify-between">
                                          <span>Base Rate:</span>
                                          <span>{formatPrice(rate.base_amount || '0', rate.base_currency || rate.total_currency)}</span>
                                        </div>
                                        {rate.tax_amount && rate.tax_amount !== '0.00' && (
                                          <div className="flex justify-between">
                                            <span>Taxes:</span>
                                            <span>{formatPrice(rate.tax_amount || '0', rate.tax_currency || rate.base_currency || rate.total_currency)}</span>
                                          </div>
                                        )}
                                        {rate.fee_amount && rate.fee_amount !== '0.00' && (
                                          <div className="flex justify-between">
                                            <span>Fees:</span>
                                            <span>{formatPrice(rate.fee_amount || '0', rate.fee_currency || rate.base_currency || rate.total_currency)}</span>
                                          </div>
                                        )}
                                        {rate.public_amount && rate.public_amount !== rate.total_amount && (
                                          <div className="flex justify-between">
                                            <span>Public Rate:</span>
                                            <span className="line-through text-gray-400">
                                            {formatPrice(rate.public_amount || '0', rate.public_currency || rate.total_currency || 'USD')}
                                          </span>
                                          </div>
                                        )}
                                        <div className="flex justify-between font-medium text-gray-900 pt-1 border-t border-gray-100">
                                          <span>Total:</span>
                                          <span>{formatPrice(rate.total_amount, rate.total_currency)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Payment Methods */}
                                    {rate.available_payment_methods && rate.available_payment_methods.length > 0 && (
                                      <div>
                                        <h6 className="font-medium text-sm text-gray-900 mb-1">Payment Methods</h6>
                                        <div className="flex flex-wrap gap-2">
                                          {rate.available_payment_methods?.flat().filter(Boolean).map((method, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full capitalize">
                                              {method.replace(/_/g, ' ')}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Loyalty Program */}
                                    {rate.supported_loyalty_programme && (
                                      <div>
                                        <h6 className="font-medium text-sm text-gray-900 mb-1">Loyalty Program</h6>
                                        <div className="flex items-center gap-2">
                                          <FiAward className="text-yellow-500" />
                                          <span className="text-sm text-gray-600">
                                            {rate.loyalty_programme_required ? 'Requires ' : 'Eligible for '}
                                            {rate.supported_loyalty_programme.replace(/_/g, ' ')}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Conditions */}
                                    {rate.conditions && rate.conditions.length > 0 && (
                                      <div>
                                        <h6 className="font-medium text-sm text-gray-900 mb-1">Conditions</h6>
                                        <div className="space-y-1">
                                          {rate.conditions.map((condition, idx) => (
                                            <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                              <FiAlertCircle className="flex-shrink-0 mt-0.5 text-orange-500" />
                                              <div>
                                                <span className="font-medium">{condition.title}:</span> {condition.description}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {rate.cancellation_timeline && rate.cancellation_timeline.length > 0 && (
                                    <div>
                                      <h6 className="font-medium text-sm text-gray-900 mb-2">Cancellation Policy</h6>
                                      {rate.cancellation_timeline.map((timeline, idx) => (
                                        <div key={idx} className="flex justify-between text-sm text-gray-600">
                                          <span>Cancel before {new Date(timeline.before).toLocaleDateString()}</span>
                                          <span className="font-medium">
                                            {parseFloat(timeline.refund_amount) > 0
                                              ? formatPrice(timeline.refund_amount, timeline.currency)
                                              : 'Non-refundable'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
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
      </div>

      {/* Floating Action Bar */}
      {selectedRoom && bookingQuote && hotelDetails && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-orange-500 shadow-2xl p-4 z-50">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl">
            <div className="text-center md:text-left">
              <p className="font-bold text-lg text-gray-900">Room Selected</p>
              <p className="text-sm text-gray-600">
                {formatPrice(bookingQuote.amount, bookingQuote.currency)} for {calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'}
              </p>
              {hotelDetails.rooms.flatMap(room => room.rates).find(rate => rate.id === selectedRoom)?.cancellation_policy?.type === 'FREE_CANCELLATION' && (
                <p className="text-xs text-green-600 mt-1">
                  Free cancellation available
                </p>
              )}
            </div>
            
            <Link
              href={{
                pathname: '/book/hotel',
                query: {
                  rateId: selectedRoom,
                  checkIn,
                  checkOut,
                  guests,
                  rooms,
                  hotelId: hotelDetails.accommodation.id,
                  hotelName: encodeURIComponent(hotelDetails.accommodation.name),
                  rateName: encodeURIComponent(
                    hotelDetails.rooms
                      .flatMap(room => room.rates)
                      .find(rate => rate.id === selectedRoom)?.name || ''
                  )
                }
              }}
              className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              Continue to Booking
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetailsPage;