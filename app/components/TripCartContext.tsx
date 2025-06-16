"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

// 24 hours in milliseconds
const TRIP_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Type for a trip
export interface TripCartItem {
  id: string;
  trip: any; // You can use your FlightOffer type here
  searchParams?: any; // Search parameters including dates
  timestamp: number; // When the trip was added to cart
  expiresAt: number; // When the trip offer expires
}

interface TripCartContextType {
  trip: TripCartItem | null;
  setTrip: (trip: Omit<TripCartItem, 'timestamp' | 'expiresAt'>) => void;
  clearCart: () => void;
  isValidTrip: (trip: TripCartItem | null) => boolean;
  isLoading: boolean;
}

const TripCartContext = createContext<TripCartContextType | undefined>(undefined);

export const TripCartProvider = ({ children }: { children: ReactNode }) => {
  const [trip, setTripState] = useState<TripCartItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if a trip is valid (not expired)
  const isValidTrip = useCallback((tripToCheck: TripCartItem | null): boolean => {
    if (!tripToCheck) return false;
    return Date.now() < tripToCheck.expiresAt;
  }, []);

  // Clean up expired trips from localStorage
  const cleanupExpiredTrips = useCallback(() => {
    const stored = localStorage.getItem("tripCart");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.expiresAt && parsed.expiresAt < Date.now()) {
        localStorage.removeItem("tripCart");
        setTripState(null);
      }
    } catch (error) {
      console.error("Error cleaning up expired trips:", error);
      localStorage.removeItem("tripCart");
      setTripState(null);
    }
  }, []);

  // Hydrate from localStorage on mount and validate
  useEffect(() => {
    const loadTrip = () => {
      try {
        const stored = localStorage.getItem("tripCart");
        if (!stored) {
          setIsLoading(false);
          return;
        }

        const parsed = JSON.parse(stored);
        
        // Validate the stored trip
        if (isValidTrip(parsed)) {
          setTripState(parsed);
        } else {
          // Clear invalid/expired trip
          localStorage.removeItem("tripCart");
          setTripState(null);
        }
      } catch (error) {
        console.error("Error loading trip from localStorage:", error);
        localStorage.removeItem("tripCart");
        setTripState(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrip();
  }, [isValidTrip]);

  // Set a new trip (replaces any existing trip)
  const setTrip = useCallback((newTrip: Omit<TripCartItem, 'timestamp' | 'expiresAt'>) => {
    const now = Date.now();
    const tripWithTimestamp = {
      ...newTrip,
      timestamp: now,
      expiresAt: now + TRIP_EXPIRY_MS, // 24 hours from now
    };
    
    localStorage.setItem("tripCart", JSON.stringify(tripWithTimestamp));
    setTripState(tripWithTimestamp);
  }, []);

  // Clear the current trip
  const clearCart = useCallback(() => {
    localStorage.removeItem("tripCart");
    setTripState(null);
  }, []);

  // Clean up expired trips on mount and set up periodic cleanup
  useEffect(() => {
    cleanupExpiredTrips();
    
    // Clean up expired trips every hour
    const interval = setInterval(cleanupExpiredTrips, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [cleanupExpiredTrips]);

  return (
    <TripCartContext.Provider value={{ 
      trip: isValidTrip(trip) ? trip : null, 
      setTrip, 
      clearCart, 
      isValidTrip,
      isLoading 
    }}>
      {children}
    </TripCartContext.Provider>
  );
};

export function useTripCart() {
  const ctx = useContext(TripCartContext);
  if (!ctx) throw new Error("useTripCart must be used within a TripCartProvider");
  return ctx;
}
