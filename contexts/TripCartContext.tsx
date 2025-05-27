'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface TripCartContextType {
  trip: any | null;
  setTrip: (trip: any) => void;
  clearTrip: () => void;
  isLoading: boolean;
  error: string | null;
}

const TripCartContext = createContext<TripCartContextType | undefined>(undefined);

export function TripCartProvider({ children }: { children: ReactNode }) {
  const [trip, setTripState] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load trip from localStorage on initial render
  useEffect(() => {
    try {
      const savedTrip = localStorage.getItem('currentTrip');
      if (savedTrip) {
        setTripState(JSON.parse(savedTrip));
      }
    } catch (err) {
      console.error('Failed to load trip from localStorage:', err);
      setError('Failed to load your trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save trip to localStorage whenever it changes
  useEffect(() => {
    if (trip) {
      try {
        localStorage.setItem('currentTrip', JSON.stringify(trip));
      } catch (err) {
        console.error('Failed to save trip to localStorage:', err);
      }
    } else {
      localStorage.removeItem('currentTrip');
    }
  }, [trip]);

  const setTrip = (newTrip: any) => {
    setTripState(newTrip);
    setError(null);
  };

  const clearTrip = () => {
    setTripState(null);
    setError(null);
  };

  return (
    <TripCartContext.Provider
      value={{
        trip,
        setTrip,
        clearTrip,
        isLoading,
        error,
      }}
    >
      {children}
    </TripCartContext.Provider>
  );
}

export function useTripCart() {
  const context = useContext(TripCartContext);
  if (context === undefined) {
    throw new Error('useTripCart must be used within a TripCartProvider');
  }
  return context;
}
