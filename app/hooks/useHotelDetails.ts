import { useState, useEffect, useCallback } from 'react';
import { HotelDetails, Room, RoomRate } from '@/types/hotel.types';
import { normalizePhotos } from '@/app/utils/hotel.utils';

interface UseHotelDetailsProps {
  hotelId: string;
  searchParams: {
    searchResultId: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    guests: number;
  };
}

export const useHotelDetails = ({ hotelId, searchParams }: UseHotelDetailsProps) => {
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [bookingQuote, setBookingQuote] = useState<{rateId: string; amount: string; currency: string} | null>(null);
  const [expandedRates, setExpandedRates] = useState<Record<string, boolean>>({});
  const [activePhotoIndices, setActivePhotoIndices] = useState<Record<string, number>>({});

  const fetchHotelDetails = useCallback(async () => {
    if (!hotelId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        searchId: searchParams.searchResultId,
        hotelId,
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        rooms: searchParams.rooms.toString(),
        guests: searchParams.guests.toString(),
      });

      const response = await fetch(
        `/api/hotel-details/${encodeURIComponent(hotelId)}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch hotel details');
      }

      const { data } = await response.json();

      if (!data?.accommodation) {
        throw new Error('No accommodation data found');
      }

      const roomsData = data.rooms || data.accommodation.rooms || [];
      
      if (!Array.isArray(roomsData) || roomsData.length === 0) {
        throw new Error('No rooms available for the selected dates');
      }

      const transformedRooms = roomsData
        .map((room: any, index: number) => ({
          id: room.id || `room-${index}`,
          name: room.name || `Room ${index + 1}`,
          description: room.description || '',
          photos: normalizePhotos(room.photos || room.images || []),
          beds: Array.isArray(room.beds) ? room.beds : [],
          rates: (room.rates || []).map((rate: any) => ({
            id: rate.id || `rate-${Math.random().toString(36).substr(2, 9)}`,
            name: rate.name || rate.board_type?.replace(/_/g, ' ') || 'Standard Rate',
            total_amount: String(rate.total_amount || '0'),
            total_currency: rate.total_currency || 'USD',
            board_type: rate.board_type || 'room_only',
            payment_type: rate.payment_type || 'pay_now',
            cancellation_policy: rate.cancellation_policy,
            conditions: Array.isArray(rate.conditions) ? rate.conditions : [],
            cancellation_timeline: Array.isArray(rate.cancellation_timeline) 
              ? rate.cancellation_timeline 
              : [],
            available_rooms: rate.available_rooms || rate.quantity_available,
            rate_plan_code: rate.rate_plan_code || rate.code || '',
            description: rate.description || ''
          })),
          max_occupancy: room.max_occupancy || 2,
          room_size: room.room_size || { square_meters: 0, square_feet: 0 },
          amenities: Array.isArray(room.amenities) ? room.amenities : []
        }))
        .filter((room: Room) => room.rates.length > 0);

      if (transformedRooms.length === 0) {
        throw new Error('No rooms with available rates found');
      }

      setHotelDetails({
        accommodation: {
          ...data.accommodation,
          photos: normalizePhotos(data.accommodation?.photos || [])
        },
        rooms: transformedRooms,
        check_in_date: searchParams.checkIn,
        check_out_date: searchParams.checkOut
      });

      // Set initial photo indices
      const initialPhotoIndices: Record<string, number> = {};
      transformedRooms.forEach((room: Room) => {
        initialPhotoIndices[room.id] = 0;
      });
      setActivePhotoIndices(initialPhotoIndices);

    } catch (err) {
      console.error('Error fetching hotel details:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [hotelId, searchParams]);

  useEffect(() => {
    fetchHotelDetails();
  }, [fetchHotelDetails]);

  const updatePhotoIndex = (roomId: string, newIndex: number, roomPhotos: { url: string }[]) => {
    setActivePhotoIndices(prev => ({
      ...prev,
      [roomId]: (newIndex + roomPhotos.length) % roomPhotos.length
    }));
  };

  const toggleRateDetails = (rateId: string) => {
    setExpandedRates(prev => ({
      ...prev,
      [rateId]: !prev[rateId]
    }));
  };

  const handleRoomSelect = (rate: RoomRate) => {
    setSelectedRoom(rate.id);
    setBookingQuote({
      rateId: rate.id,
      amount: rate.total_amount,
      currency: rate.total_currency,
    });
  };

  return {
    hotelDetails,
    loading,
    error,
    selectedRoom,
    bookingQuote,
    expandedRates,
    activePhotoIndices,
    updatePhotoIndex,
    toggleRateDetails,
    handleRoomSelect,
    retry: fetchHotelDetails
  };
};
