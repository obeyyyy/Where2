// hooks/useTripSearch.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  SearchParams,
  FlightOffer,
  FilterState,
  ViewState,
  TripBooking
} from '../types/trip-search.types';
import {
  DEFAULT_SEARCH_PARAMS,
  DEFAULT_FILTERS
} from '../app/constants/trip-search.constants';
import {
  parseUrlSearchParams,
  buildSearchQueryString,
  validateSearchParams,
  cacheFlightResults,
  filterAndSortFlights,
  calculateNights
} from '../app/utils/trip-search.utils';

export function useTripSearch() {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>('initial');
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH_PARAMS);
  const [tripData, setTripData] = useState<FlightOffer[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOffer | null>(null);

  // Initialize from URL parameters
  useEffect(() => {
    const initializeFromURL = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const parsedParams = parseUrlSearchParams(urlParams);

        // If we have required search parameters, perform search
        if (parsedParams.origin && parsedParams.destination && parsedParams.departureDate) {
          const mergedParams = {
            ...DEFAULT_SEARCH_PARAMS,
            ...parsedParams
          };

          // CRITICAL FIX: Ensure travelers is preserved from URL
          console.log('Parsed travelers from URL:', parsedParams.travelers);
          console.log('Merged search params:', mergedParams);

          // Calculate nights if we have both dates
          if (mergedParams.tripType === 'roundtrip' && mergedParams.departureDate && mergedParams.returnDate) {
            mergedParams.nights = calculateNights(mergedParams.departureDate, mergedParams.returnDate);
          }

          setSearchParams(mergedParams);
          setViewState('searching');

          // Perform search
          await performSearch(mergedParams);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize search');
        setViewState('error');
        setIsLoading(false);
      }
    };

    initializeFromURL();
  }, []);

  // Update nights when dates change
  useEffect(() => {
    if (searchParams.tripType === 'roundtrip' && searchParams.departureDate && searchParams.returnDate) {
      const calculatedNights = calculateNights(searchParams.departureDate, searchParams.returnDate);
      if (calculatedNights !== searchParams.nights) {
        setSearchParams(prev => ({
          ...prev,
          nights: calculatedNights
        }));
      }
    }
  }, [searchParams.departureDate, searchParams.returnDate, searchParams.tripType]);

  const handleInputChange = useCallback((field: keyof SearchParams, value: any) => {
    setSearchParams(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Special handling for trip type changes
      if (field === 'tripType') {
        if (value === 'oneway') {
          updated.returnDate = '';
          updated.nights = 0;
        } else if (value === 'roundtrip' && !updated.returnDate) {
          // Auto-set return date to 7 days after departure
          const returnDate = new Date(updated.departureDate);
          returnDate.setDate(returnDate.getDate() + 7);
          updated.returnDate = returnDate.toISOString().split('T')[0];
          updated.nights = 7;
        }
      }

      // Log when travelers change
      if (field === 'travelers') {
        console.log('Travelers updated to:', value);
      }

      return updated;
    });
  }, []);

  const performSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setTripData([]);
    setSelectedOutbound(null);

    try {
      // Validate search parameters
      const validation = validateSearchParams(params);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Build query string
      const queryString = buildSearchQueryString(params);
      console.log('Search query string:', queryString);
      console.log('Search params being sent:', params);

      // Make API call
      const response = await fetch(`/api/trips?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch trip data');
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (!data || !data.data || data.data.length === 0) {
        throw new Error('No trips found for the selected criteria. Try adjusting your search.');
      }

      // Cache results
      cacheFlightResults(params, data.data);

      // Update state
      setTripData(data.data);
      setViewState('results');
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setViewState('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await performSearch(searchParams);
  }, [searchParams]);

  const handleBackToSearch = useCallback(() => {
    setViewState('initial');
    setSelectedOutbound(null);
    setTripData([]);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setSearchParams(DEFAULT_SEARCH_PARAMS);
    setFilters(DEFAULT_FILTERS);
    setSelectedOutbound(null);
    setTripData([]);
    setError(null);
    setViewState('initial');
  }, []);

  // Get filtered and sorted flights
  const getFilteredFlights = useCallback(() => {
    return filterAndSortFlights(tripData, filters);
  }, [tripData, filters]);

  return {
    viewState,
    setViewState,
    isLoading,
    searchParams,
    handleInputChange,
    tripData,
    filters,
    setFilters,
    error,
    selectedOutbound,
    setSelectedOutbound,
    handleSearch,
    handleBackToSearch,
    handleReset,
    getFilteredFlights,
  };
}