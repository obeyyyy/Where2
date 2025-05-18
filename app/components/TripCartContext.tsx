"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Type for a trip (customize as needed)
export interface TripCartItem {
  id: string;
  trip: any; // You can use your FlightOffer type here
  searchParams?: any; // Search parameters including dates
}

interface TripCartContextType {
  trip: TripCartItem | null;
  setTrip: (trip: TripCartItem) => void;
  clearCart: () => void;
}

const TripCartContext = createContext<TripCartContextType | undefined>(undefined);

export const TripCartProvider = ({ children }: { children: ReactNode }) => {
  const [trip, setTripState] = useState<TripCartItem | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("tripCart");
    if (stored) {
      setTripState(JSON.parse(stored));
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (trip) {
      localStorage.setItem("tripCart", JSON.stringify(trip));
    } else {
      localStorage.removeItem("tripCart");
    }
  }, [trip]);

  const setTrip = (newTrip: TripCartItem) => {
    setTripState(newTrip);
  };

  const clearCart = () => setTripState(null);

  return (
    <TripCartContext.Provider value={{ trip, setTrip, clearCart }}>
      {children}
    </TripCartContext.Provider>
  );
};

export function useTripCart() {
  const ctx = useContext(TripCartContext);
  if (!ctx) throw new Error("useTripCart must be used within a TripCartProvider");
  return ctx;
}
