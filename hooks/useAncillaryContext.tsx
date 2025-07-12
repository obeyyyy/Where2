'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AncillaryState } from '../types/Ancillary';

// Create context with default empty state
const AncillaryContext = createContext<{
  ancillaries: AncillaryState;
  setAncillaries: (state: AncillaryState) => void;
}>({
  ancillaries: { rows: [], total: 0, currency: 'EUR' },
  setAncillaries: () => {},
});

// Storage key for session persistence
const STORAGE_KEY = 'where2_ancillaries';

export const AncillaryProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state from session storage if available
  const [ancillaries, setAncillariesState] = useState<AncillaryState>(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.error('Error loading ancillaries from session storage:', error);
      }
    }
    return { rows: [], total: 0, currency: 'EUR' };
  });

  // Update state and persist to session storage
  const setAncillaries = (state: AncillaryState) => {
    setAncillariesState(state);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Error saving ancillaries to session storage:', error);
      }
    }
  };

  return (
    <AncillaryContext.Provider value={{ ancillaries, setAncillaries }}>
      {children}
    </AncillaryContext.Provider>
  );
};

// Hook to use the ancillary context
export const useAncillaries = () => {
  const context = useContext(AncillaryContext);
  if (!context) {
    throw new Error('useAncillaries must be used within an AncillaryProvider');
  }
  return context;
};
