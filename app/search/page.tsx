'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AirportAutocomplete, AirportOption } from '../components/AirportAutocomplete';
import Image from 'next/image';
import airportsJson from 'airports-json';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiArrowRight,
  FiCalendar, 
  FiClock, 
  FiMapPin, 
  FiUsers, 
  FiDollarSign, 
  FiGlobe, 
  FiX, 
  FiFilter, 
  FiChevronDown, 
  FiChevronUp, 
  FiCheck, 
  FiLoader, 
  FiSearch 
} from 'react-icons/fi';
import { useTripCart } from '../components/TripCartContext';
import { useRouter, useSearchParams as useRouterSearchParams } from 'next/navigation';
import { SearchResults } from '../components/SearchResults';

// Define types locally since we can't import them
interface FlightSegment {
  departure: {
    iataCode: string;
    at: string;
    terminal?: string;
  };
  arrival: {
    iataCode: string;
    at: string;
    terminal?: string;
  };
  carrierCode: string;
  number: string;
  aircraft: {
    code: string;
  };
  operating?: {
    carrierCode: string;
  };
}

export interface FlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
    breakdown?: {
      outbound?: string;
      return?: string;
    };
  };
  itineraries: Array<{
    duration: string;
    segments: FlightSegment[];
  }>;
  destinationImage?: string;
}

export interface SearchParamsType {
  budget: number;
  currency: string;
  originType: 'Airport' | 'City' | 'Country';
  origin: string;
  destinationType: 'Airport' | 'City' | 'Country';
  destination: string;
  departureDate: string;
  returnDate: string;
  tripType: 'roundtrip' | 'oneway';
  travelers: number;
  nights: number;
  includeHotels: boolean;
  useKiwi: boolean;
  useDuffel: boolean;
}

const Loading = dynamic(() => import('../components/loading'), { ssr: false });

type ViewState = 'initial' | 'dates' | 'details' | 'searching' | 'results' | 'error';

function HomePage() {
  // Get the trip cart context at component level
  const { setTrip: setTripInCart } = useTripCart();
  const router = useRouter();
  
  // State for search parameters
  const [searchParams, setSearchParams] = useState<SearchParamsType>({
    budget: 1000,
    currency: 'USD',
    originType: 'City',
    origin: '',
    destinationType: 'Country',
    destination: '',
    departureDate: new Date().toISOString().split('T')[0],
    returnDate: '',
    tripType: 'roundtrip',
    travelers: 1,
    nights: 7,
    includeHotels: false,
    useKiwi: true,
    useDuffel: true,
  });

  const [viewState, setViewState] = useState<ViewState>('initial');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOffer | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<FlightOffer | null>(null);
  const [tripData, setTripData] = useState<FlightOffer[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [paginationCursor, setPaginationCursor] = useState<string | null>(null);
  const resultsPerPage = 10; // Number of results to load per page
  const [showReturnFlights, setShowReturnFlights] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Memoized function to get outbound flights (first segment of each trip)
  const memoizedOutboundFlights = React.useMemo(() => {
    console.log('Processing tripData, count:', tripData.length);

    // Debug: Log all trip IDs and itinerary counts
    const allTrips = tripData.map((t: any) => ({
      id: t.id,
      itinerariesLength: t.itineraries?.length || 0,
      price: t.price?.total,
      currency: t.price?.currency
    }));

    console.log('All trips from API:', JSON.stringify(allTrips, null, 2));

    // Process all trips without filtering out duplicates or limiting itineraries
    const validFlights: FlightOffer[] = tripData.filter((trip: FlightOffer) => {
      const isValid = trip.itineraries && trip.itineraries.length > 0;
      if (!isValid) {
        console.warn('Trip has no itineraries:', {
          id: trip.id,
          price: trip.price,
          hasItineraries: !!trip.itineraries,
          itinerariesLength: trip.itineraries?.length
        });
      }
      return isValid;
    });

    console.log('Processed flights summary:', {
      inputCount: tripData.length,
      validCount: validFlights.length,
      hasMore: hasMoreResults,
      cursor: paginationCursor,
      tripIds: validFlights.map(f => f.id),
      tripPrices: validFlights.map(f => f.price?.total)
    });

    // Log any duplicates
    const idMap = new Map<string, boolean>();
    const duplicates: string[] = [];
    validFlights.forEach(flight => {
      if (idMap.has(flight.id)) {
        duplicates.push(flight.id);
      } else {
        idMap.set(flight.id, true);
      }
    });

    if (duplicates.length > 0) {
      console.warn(`Found ${duplicates.length} duplicate flight IDs:`, duplicates);
    }

    return validFlights;
  }, [tripData, hasMoreResults, paginationCursor]);
  const [error, setError] = useState<string | null>(null);
  const quickSelect = [250, 500, 750, 1000, 1500];
  const popularDestinations = [
    { code: 'PAR', name: 'Paris' },
    { code: 'LON', name: 'London' },
    { code: 'NYC', name: 'New York' },
    { code: 'ROM', name: 'Rome' },
    { code: 'BCN', name: 'Barcelona' },
  ];

  // Effect for initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Effect for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 100 && 
        !isLoadingMore && 
        hasMoreResults &&
        !isInitialLoad
      ) {
        loadMoreResults();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMoreResults, isInitialLoad]);

  // Handle outbound flight selection is now defined with useCallback below

  // Function to load more results
  const loadMoreResults = async () => {
    if (isLoadingMore || !hasMoreResults) {
      console.log('Not loading more - loading:', isLoadingMore, 'hasMore:', hasMoreResults);
      return;
    }
    
    console.log('Loading more results, current cursor:', paginationCursor);
    setIsLoadingMore(true);
    
    try {
      // Prepare query parameters
      const queryParams = new URLSearchParams({
        origin: `${searchParams.originType}:${searchParams.origin}`,
        destination: `${searchParams.destinationType}:${searchParams.destination}`,
        departureDate: searchParams.departureDate,
        returnDate: searchParams.returnDate || '',
        tripType: searchParams.tripType,
        nights: searchParams.nights.toString(),
        travelers: searchParams.travelers.toString(),
        currency: searchParams.currency,
        budget: searchParams.budget.toString(),
        includeHotels: searchParams.includeHotels ? 'true' : 'false',
        useKiwi: searchParams.useKiwi ? 'true' : 'false',
        useDuffel: searchParams.useDuffel ? 'true' : 'false',
        limit: '50', // Increased limit to get more results
      });

      // Add pagination cursor if available
      if (paginationCursor) {
        queryParams.append('after', paginationCursor);
      }

      console.log('Fetching more results with params:', queryParams.toString());
      const apiUrl = `/api/trips?${queryParams.toString()}`;
      console.log('Fetching flights from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      const newData = result.data || [];
      
      console.log('Received new data:', {
        count: newData.length,
        hasMore: !!result.meta?.after,
        cursor: result.meta?.after
      });
      
      // Update pagination cursor if available
      if (result.meta?.after) {
        setPaginationCursor(result.meta.after);
        setHasMoreResults(true);
      } else {
        console.log('No more results available');
        setHasMoreResults(false);
      }
      
      // Append new data to existing data
      if (newData.length > 0) {
        console.log(`Appending ${newData.length} new flights to existing ${tripData.length}`);
        setTripData(prev => [...prev, ...newData]);
      }
    } catch (error) {
      console.error('Error loading more results:', error);
      setError('Failed to load more results. Please try again.');
    } finally {
      setIsLoadingMore(false);
      setIsInitialLoad(false);
    }
  };

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Reset data and cursor for new searches
    if (isInitialLoad) {
      console.log('Initial search, resetting data');
      setTripData([]);
      setPaginationCursor(null);
      setHasMoreResults(true);
      setIsInitialLoad(false);
    } else {
      console.log('Continuing search with cursor:', paginationCursor);
    }
    // Reset all selections when performing a new search
    setSelectedOutbound(null);
    setSelectedReturn(null);
    setViewState('searching');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Prepare query parameters
      const queryParams = new URLSearchParams({
        origin: `${searchParams.originType}:${searchParams.origin}`,
        destination: `${searchParams.destinationType}:${searchParams.destination}`,
        departureDate: searchParams.departureDate,
        returnDate: searchParams.returnDate || '',
        tripType: searchParams.tripType,
        nights: searchParams.nights.toString(),
        travelers: searchParams.travelers.toString(),
        currency: searchParams.currency,
        budget: searchParams.budget.toString(),
        includeHotels: searchParams.includeHotels ? 'true' : 'false',
        useKiwi: searchParams.useKiwi ? 'true' : 'false',
        useDuffel: searchParams.useDuffel ? 'true' : 'false',
        limit: resultsPerPage.toString(),
      });

      const response = await fetch(`/api/trips?${queryParams}`, {
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

      // Set the trip data and switch to results view
      setTripData(data.data);
      
      // Update pagination cursor if available
      if (data.meta?.after) {
        setPaginationCursor(data.meta.after);
        setHasMoreResults(true);
      } else {
        setHasMoreResults(false);
      }
      
      setViewState('results');
      setIsInitialLoad(false);

      // CACHE the flight offers in localStorage
      const cacheKey = `flight_search_${searchParams.origin}_${searchParams.destination}_${searchParams.departureDate}_${searchParams.returnDate || ''}_${searchParams.tripType}_${searchParams.nights}_${searchParams.travelers}_${searchParams.currency}_${searchParams.budget}_${searchParams.includeHotels}_${searchParams.useKiwi}_${searchParams.useDuffel}`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data.data));
        console.log('Cached offers under key:', cacheKey, data.data);
      } catch (e) {
        // Ignore quota errors
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setViewState('error');
    } finally {
      // Always set loading to false when the operation completes or fails
      setIsLoading(false);
    }
  };

  // Handle back to search - defined with useCallback below

  // Handle input changes for form fields
  const handleInputChange = useCallback((field: keyof SearchParamsType, value: unknown) => {
    setSearchParams((prev: SearchParamsType) => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleNext = () => {
    if (viewState === 'initial') {
      setViewState('dates');
    } else if (viewState === 'error') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">An error occurred while searching for flights.</p>
            <button
              onClick={() => setViewState('initial')}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Back to Search
            </button>
          </div>
        </div>
      );
    } else if (viewState === 'dates') {
      setViewState('details');
    }
  };

  const handleBack = () => {
    if (viewState === 'details') {
      setViewState('dates');
    } else if (viewState === 'dates') {
      setViewState('initial');
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'initial', label: 'Budget', icon: <FiDollarSign className="w-4 h-4" /> },
      { id: 'dates', label: 'Dates', icon: <FiCalendar className="w-4 h-4" /> },
      { id: 'details', label: 'Details', icon: <FiUsers className="w-4 h-4" /> }
    ];

    const currentStepIndex = steps.findIndex(step => step.id === viewState);

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-auto mb-8 px-4"
      >
        <div className="flex justify-between items-center w-full">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isUpcoming = index > currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center relative z-10">
                  <motion.div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white shadow-lg shadow-orange-100'
                        : isCompleted
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="flex items-center justify-center">
                        {step.icon}
                      </span>
                    )}
                  </motion.div>
                  <span className={`text-xs mt-2 font-medium transition-colors ${
                    isActive ? 'text-[#FF8C00]' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 bg-gray-100 mx-2 relative">
                    <motion.div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FFA500] to-[#FF8C00] rounded-full"
                      initial={{ width: isCompleted ? '100%' : '0%' }}
                      animate={{ width: index < currentStepIndex ? '100%' : '0%' }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // Animation variants for form steps
  const formVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      x: -50,
      transition: {
        duration: 0.2
      }
    }
  };

  // Render search form steps
  const renderSearchForm = () => {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {renderStepIndicator()}
        </motion.div>

        <div className="px-4 sm:px-6 md:px-8 max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {viewState === 'initial' && (
              <motion.div
                key="initial"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h2 className="text-3xl font-bold mb-6 text-center">What's your budget?</h2>
                <div className="text-center mb-8">
                  <h3 className="text-4xl font-extrabold text-[#FFA500] mb-1">
                    {searchParams.currency} {searchParams.budget}
                  </h3>
                  <p className="text-gray-500">Maximum travel budget</p>
                </div>
                <div className="mb-8">
                  <input
                    type="range"
                    min={100}
                    max={3000}
                    step={50}
                    value={searchParams.budget}
                    onChange={(e) => handleInputChange('budget', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FFA500]"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{searchParams.currency} 100</span>
                    <span>{searchParams.currency} 3000</span>
                  </div>
                </div>
                <div className="mb-8">
                  <p className="text-sm font-medium mb-3 text-center">Quick select</p>
                  <div className="grid grid-cols-3 gap-3">
                    {quickSelect.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleInputChange('budget', amount)}
                        className={`py-3 rounded-xl text-sm font-medium ${
                          searchParams.budget === amount
                            ? 'bg-[#FFA500] text-white'
                            : 'bg-[#FFF1D6] text-[#FFA500]'
                        }`}
                      >
                        {searchParams.currency} {amount}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={searchParams.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </motion.div>
            )}
            {viewState === 'dates' && (
              <motion.div
                key="dates"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h2 className="text-3xl font-bold mb-6 text-center">When do you want to go?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departure
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={searchParams.departureDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleInputChange('departureDate', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
                        style={{ paddingRight: '3rem' }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {searchParams.tripType === 'roundtrip' ? 'Return' : 'One Way'}
                    </label>
                    {searchParams.tripType === 'roundtrip' ? (
                      <div className="relative">
                        <input
                          type="date"
                          value={searchParams.returnDate}
                          min={searchParams.departureDate}
                          onChange={(e) => handleInputChange('returnDate', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
                          style={{ paddingRight: '3rem' }}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value="One Way"
                          disabled
                          className="w-full p-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        handleInputChange('tripType', 'roundtrip');
                        if (!searchParams.returnDate) {
                          const returnDate = new Date(searchParams.departureDate);
                          returnDate.setDate(returnDate.getDate() + 7);
                          const returnDateString = returnDate.toISOString().split('T')[0];
                          handleInputChange('returnDate', returnDateString);
                          console.log('Return Date:', returnDateString);
                          console.log('Departure Date:', searchParams.departureDate);
                        }
                      }}
                      className={`py-3 rounded-xl font-medium ${
                        searchParams.tripType === 'roundtrip'
                          ? 'bg-[#FFA500] text-white'
                          : 'bg-[#FFF1D6] text-[#FFA500]'
                      }`}
                    >
                      Roundtrip
                    </button>
                    <button
                      onClick={() => {
                        handleInputChange('tripType', 'oneway');
                        handleInputChange('returnDate', '');
                      }}
                      className={`py-3 rounded-xl font-medium ${
                        searchParams.tripType === 'oneway'
                          ? 'bg-[#FFA500] text-white'
                          : 'bg-[#FFF1D6] text-[#FFA500]'
                      }`}
                    >
                      One Way
                    </button>
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Duration
                  </label>
                  <div className="relative">
                    <select
                      value={searchParams.nights}
                      disabled
                      className="w-full p-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed appearance-none focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
                      title="Trip duration is automatically calculated from your selected dates."
                    >
                      {[...Array(30)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'night' : 'nights'}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Trip duration is automatically calculated from your selected dates and cannot be changed directly.
                  </p>
                </div>
              </motion.div>
            )}
            {viewState === 'details' && (
              <motion.div
                key="details"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h2 className="text-3xl font-bold mb-6 text-center">Tell us more</h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Travelers
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleInputChange('travelers', Math.max(1, searchParams.travelers - 1))}
                      className="px-4 py-3 bg-gray-100 text-[#FFA500] text-xl font-bold"
                      disabled={searchParams.travelers <= 1}
                    >
                      -
                    </button>
                    <div className="flex-1 text-center py-3">
                      {searchParams.travelers} {searchParams.travelers === 1 ? 'Traveler' : 'Travelers'}
                    </div>
                    <button
                      onClick={() => handleInputChange('travelers', searchParams.travelers + 1)}
                      className="px-4 py-3 bg-gray-100 text-[#FFA500] text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Origin
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={searchParams.originType}
                        onChange={e => handleInputChange('originType', e.target.value as 'Airport' | 'City' | 'Country')}
                        className="p-2 border border-gray-300 rounded-xl text-sm bg-white"
                      >
                        <option value="Airport">Airport</option>
                        <option value="City">City</option>
                        <option value="Country">Country</option>
                      </select>
                      <div className="flex-1">
                        <AirportAutocomplete
                          label="Origin Airport"
                          value={(function() {
                            const a = airportsJson.airports.find((ap: any) => ap.iata === searchParams.origin);
                            return a ? {
                              iata: a.iata,
                              name: a.name,
                              city: a.city,
                              country: a.country,
                              label: `${a.iata} - ${a.name}, ${a.city}, ${a.country}`
                            } : null;
                          })()}
                          onChange={val => handleInputChange('origin', val ? val.iata : '')}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Destination
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={searchParams.destinationType}
                        onChange={e => handleInputChange('destinationType', e.target.value as 'Airport' | 'City' | 'Country')}
                        className="p-2 border border-gray-300 rounded-xl text-sm bg-white"
                      >
                        <option value="Airport">Airport</option>
                        <option value="City">City</option>
                        <option value="Country">Country</option>
                      </select>
                      <div className="flex-1">
                        <AirportAutocomplete
                         label="Destination Airport"
                         value={(function() {
                          const a = airportsJson.airports.find((ap: any) => ap.iata === searchParams.destination);
                          return a ? {
                            iata: a.iata,
                            name: a.name,
                            city: a.city,
                            country: a.country,
                            label: `${a.iata} - ${a.name}, ${a.city}, ${a.country}`
                          } : null;
                        })()}
                         onChange={val => handleInputChange('destination', val ? val.iata : '')}
                         required
                       />
                       </div>
                    </div>
                  </div>
                </div>                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Popular Destinations
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {popularDestinations.map((dest) => (
                      <button
                        key={dest.code}
                        onClick={() => handleInputChange('destination', dest.code)}
                        className={`p-3 border rounded-xl text-left ${
                          searchParams.destination === dest.code
                            ? 'border-[#FFA500] bg-[#FFF9F0]'
                            : 'border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{dest.name}</div>
                        <div className="text-sm text-gray-500">{dest.code}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-8">
  <div className="flex items-center justify-between mb-2">
    <label className="block text-sm font-medium text-gray-700">
      Include Hotels
    </label>
    <button
      onClick={() => handleInputChange('includeHotels', !searchParams.includeHotels)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        searchParams.includeHotels ? 'bg-[#FFA500]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`${searchParams.includeHotels ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      />
    </button>
  </div>
  <p className="text-xs text-gray-500 mt-1">
    {searchParams.includeHotels
      ? 'Hotels will be included in your search'
      : 'Only flights will be included in your search'}
  </p>
  {/* Flight Search Source Selection */}
  <div className="flex items-center justify-between mt-4">
    <label className="block text-sm font-medium text-gray-700">
      Flight Search Source
    </label>
    <select
      value={searchParams.useDuffel ? 'duffel' : searchParams.useKiwi ? 'kiwi' : 'amadeus'}
      onChange={e => {
        if (e.target.value === 'duffel') {
          handleInputChange('useDuffel', true);
          handleInputChange('useKiwi', false);
        } else if (e.target.value === 'kiwi') {
          handleInputChange('useDuffel', false);
          handleInputChange('useKiwi', true);
        } else {
          handleInputChange('useDuffel', false);
          handleInputChange('useKiwi', false);
        }
      }}
      className="w-32 p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent text-sm bg-white"
    >
      <option value="kiwi">Kiwi.com not working</option>
      <option value="amadeus">Amadeus not working</option>
      <option value="duffel">Duffel</option>
    </select>
  </div>
  <p className="text-xs text-gray-500 mt-1">
    Choose which provider to use for flight search. Kiwi.com is recommended for best results.</p>
</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between px-4 max-w-md mx-auto mt-8">
          {viewState !== 'initial' && (
            <motion.button
              onClick={handleBack}
              className="bg-white text-gray-600 border border-gray-300 py-3 px-6 rounded-xl font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:ring-opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiArrowLeft className="inline-block mr-2" /> Back
            </motion.button>
          )}
          {viewState !== 'details' ? (
            <motion.button
              onClick={handleNext}
              className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:ring-opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Next <FiArrowRight className="inline-block ml-2" />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSearch}
              className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:ring-opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Find Trips <FiGlobe className="inline-block ml-2" />
            </motion.button>
          )}
        </div>
      </div>
    );
  };


  // Helper: Get outbound flights (first segment of each trip)
  const getOutboundFlights = (): FlightOffer[] => {
    return tripData.map(trip => ({
      ...trip,
      itineraries: [trip.itineraries[0]] // Only show outbound leg initially
    }));
  };
  



  // Handle return flight selection (only for roundtrip)
  const handleSelectReturn = (trip: FlightOffer) => {
    setSelectedReturn(trip);
  };

  const handleReset = () => {
    setSelectedOutbound(null);
    setSelectedReturn(null);
    handleBackToSearch();
  };

  // Handle continue to booking
  const handleContinueToBooking = async () => {
    if (!selectedOutbound) {
      console.error('No outbound flight selected');
      return;
    }
    
    try {
      // Create a clean trip object with proper price breakdown
      const tripToBook = {
        id: selectedOutbound.id || `trip-${Date.now()}`,
        trip: {
          ...selectedOutbound,
          price: {
            ...selectedOutbound.price,
            breakdown: {
              outbound: selectedOutbound.price.total,
              return: searchParams.tripType === 'roundtrip' ? (selectedReturn?.price?.total || '0') : '0'
            }
          },
          itineraries: [...selectedOutbound.itineraries]
        },
        searchParams: {
          ...searchParams,
          // Ensure we use the current trip type and clear return date for one-way
          tripType: searchParams.tripType as 'oneway' | 'roundtrip',
          ...(searchParams.tripType === 'oneway' && { returnDate: '' })
        },
        totalPrice: selectedOutbound.price.total
      };
      
      // If it's a roundtrip and we have a return flight, combine the trips
      if (searchParams.tripType === 'roundtrip' && selectedReturn) {
        // Combine outbound and return itineraries
        tripToBook.trip.itineraries = [
          ...selectedOutbound.itineraries,
          ...(selectedReturn.itineraries || [])
        ];
        
        // Calculate total price
        const totalPrice = (parseFloat(selectedOutbound.price.total) + 
                          parseFloat(selectedReturn.price?.total || '0')).toString();
        
        // Update the price with proper breakdown
        tripToBook.trip.price = {
          total: totalPrice,
          currency: selectedOutbound.price.currency,
          breakdown: {
            outbound: selectedOutbound.price.total,
            return: selectedReturn.price?.total || '0'
          }
        };
        
        // Update total price
        tripToBook.totalPrice = totalPrice;
      } else if (searchParams.tripType === 'oneway') {
        // For one-way trips, ensure we have the correct price breakdown
        tripToBook.trip.price = {
          ...selectedOutbound.price,
          breakdown: {
            outbound: selectedOutbound.price.total,
            return: '0'
          }
        };
        tripToBook.totalPrice = selectedOutbound.price.total;
      }
      
      // Save to localStorage for booking
      localStorage.setItem('current_booking_offer', JSON.stringify(tripToBook));
      
      // Update the cart state
      await setTripInCart(tripToBook);
      
      // Navigate to booking page
      router.push('/book');
      
      // Clear selections after navigation
      setSelectedOutbound(null);
      setSelectedReturn(null);
      
      // Reset the view state
      setViewState('results');
    } catch (error) {
      console.error('Error saving trip to cart:', error);
      // Handle error (e.g., show error message to user)
    }
  };



  // Error component
  function renderError() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">An error occurred while processing your request. Please try again.</p>
          <button
            onClick={() => setViewState('initial')}
            className="px-6 py-2 bg-[#FFA500] text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  // Handle back to search
  const handleBackToSearch = useCallback(() => {
    setViewState('initial');
  }, []);

  // Handle flight selection
  const handleSelectOutbound = useCallback((flight: FlightOffer) => {
    setSelectedOutbound(flight);
    if (searchParams.tripType === 'oneway') {
      // For one-way trips, go directly to booking
      router.push(`/booking?outboundId=${flight.id}`);
    } else {
      // For round trips, show return flights
      setViewState('results');
    }
  }, [searchParams.tripType, router]);

  // Fetch flights from the API
  const fetchFlights = useCallback(async (isInitialLoad = true) => {
    if (isInitialLoad) {
      setIsLoading(true);
      setTripData([]);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        origin: `${searchParams.originType}:${searchParams.origin}`,
        destination: `${searchParams.destinationType}:${searchParams.destination}`,
        departureDate: searchParams.departureDate,
        returnDate: searchParams.returnDate || '',
        tripType: searchParams.tripType,
        nights: searchParams.nights.toString(),
        travelers: searchParams.travelers.toString(),
        currency: searchParams.currency,
        budget: searchParams.budget.toString(),
        includeHotels: searchParams.includeHotels ? 'true' : 'false',
        useKiwi: searchParams.useKiwi ? 'true' : 'false',
        useDuffel: searchParams.useDuffel ? 'true' : 'false',
        limit: '50',
      });

      if (paginationCursor) {
        params.append('cursor', paginationCursor);
      }

      const response = await fetch(`/api/trips?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch flights');
      }

      const data = await response.json();
      console.log('API response data:', data);

      // Append or set trip data
      setTripData(prev => isInitialLoad ? data.trips : [...prev, ...data.trips]);

      // Update pagination cursor and hasMoreResults
      setPaginationCursor(data.meta?.after || null);
      setHasMoreResults(data.has_more ?? false);

      setError(null);
      setViewState('results');
    } catch (error) {
      console.error('Error fetching flights:', error);
      setError('Failed to fetch flights');
      setViewState('error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsInitialLoad(false);
    }
  }, [searchParams, paginationCursor]);

  // Handle loading more results
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreResults) return;
    
    try {
      setIsLoadingMore(true);
      await fetchFlights(false);
    } catch (error) {
      console.error('Error loading more flights:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreResults, isLoadingMore, fetchFlights]);

  // Render search results
  if (viewState === 'results') {
    return (
      <SearchResults
        flights={memoizedOutboundFlights || []}
        tripData={tripData}
        searchParams={searchParams}
        hasMoreResults={hasMoreResults}
        isLoadingMore={isLoadingMore}
        isLoading={isLoading}
        onBackToSearch={handleBackToSearch}
        onSelectOutbound={handleSelectOutbound}
        onLoadMore={handleLoadMore}
      />
    );
  }

  if (viewState === 'error') {
    return renderError();
  }

  return renderSearchForm();
}

export default HomePage;