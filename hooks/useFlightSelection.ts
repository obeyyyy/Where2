// hooks/useFlightSelection.ts
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FlightOffer, SearchParams, TripBooking } from '../types/trip-search.types';

interface UseFlightSelectionProps {
  searchParams: SearchParams;
  setTripInCart: (trip: TripBooking) => void;
}

export function useFlightSelection({ searchParams, setTripInCart }: UseFlightSelectionProps) {
  const router = useRouter();
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOffer | null>(null);

  const handleSelectFlight = useCallback(async (flight: FlightOffer) => {
    // For roundtrip, proceed directly to booking with both flights
    if (searchParams.tripType === 'roundtrip') {
      await handleContinueToBooking(flight);
      return;
    }

    // For one-way, save selection and continue
    setSelectedOutbound(flight);
    await handleContinueToBooking(flight);
  }, [searchParams.tripType]);

  const handleContinueToBooking = useCallback(async (flight: FlightOffer) => {
    try {
      const tripToBook: TripBooking = {
        id: flight.id || `trip-${Date.now()}`,
        trip: {
          ...flight,
          price: {
            ...flight.price,
            breakdown: {
              outbound: flight.price.breakdown?.outbound || flight.price.total,
              return: flight.price.breakdown?.return || 
                (searchParams.tripType === 'roundtrip' ? flight.price.total : '0')
            }
          },
          itineraries: [...flight.itineraries]
        },
        searchParams: {
          ...searchParams,
          tripType: searchParams.tripType,
          ...(searchParams.tripType === 'oneway' && { returnDate: '' })
        },
        totalPrice: flight.price.total
      };

      // Save to localStorage
      localStorage.setItem('current_booking_offer', JSON.stringify(tripToBook));

      // CRITICAL: Log to verify travelers are preserved
      console.log('Booking trip with travelers:', searchParams.travelers);
      console.log('Trip to book:', tripToBook);

      // Update cart
      await setTripInCart(tripToBook);

      // Navigate to booking
      router.push('/trip-summary');

      // Clear selection
      setSelectedOutbound(null);
    } catch (error) {
      console.error('Error saving trip to cart:', error);
      throw error;
    }
  }, [searchParams, setTripInCart, router]);

  const resetSelection = useCallback(() => {
    setSelectedOutbound(null);
  }, []);

  return {
    selectedOutbound,
    handleSelectFlight,
    handleContinueToBooking,
    resetSelection,
  };
}