'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import TripCard from '../components/TripCard';
import { AirportAutocomplete, AirportOption } from '../components/AirportAutocomplete';
import Image from 'next/image';
import airportsJson from 'airports-json';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiArrowLeft, FiCalendar, FiUsers, FiMapPin, FiDollarSign, FiGlobe } from 'react-icons/fi';
import { useTripCart } from '../components/TripCartContext';
import { useRouter } from 'next/navigation';

const Loading = dynamic(() => import('../components/loading'), { ssr: false });

type ViewState = 'initial' | 'dates' | 'details' | 'searching' | 'results' | 'error';
type TripType = 'roundtrip' | 'oneway';

interface SearchParams {
  budget: number;
  currency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  tripType: TripType;
  travelers: number;
  nights: number;
  includeHotels: boolean;
  useDuffel: boolean; // Duffel toggle
}

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

interface FlightOffer {
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

function HomePage() {
  // Get the trip cart context at component level
  const { setTrip: setTripInCart } = useTripCart();
  const router = useRouter();
  
  const [viewState, setViewState] = useState<ViewState>('initial');
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    budget: 750,
    currency: 'USD',
    origin: 'MAD',
    destination: 'PAR',
    departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
    returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    tripType: 'roundtrip' as const,
    travelers: 1,
    nights: 7,
    includeHotels: true,
    useDuffel: true
  });
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOffer | null>(null);
  // No longer need selectedReturn state for roundtrip flights
  const [tripData, setTripData] = useState<FlightOffer[]>([]);
  // No longer need showReturnFlights state for roundtrip flights
  const [filters, setFilters] = useState({
    maxStops: 2, // 0 for direct, 1 for max 1 stop, 2 for all
    sortBy: 'price', // 'price' or 'duration'
    sortOrder: 'asc' // 'asc' or 'desc'
  });

  // Helper function to parse ISO 8601 duration to minutes
  const parseDuration = (duration: string): number => {
    if (!duration) return 0;
    
    // Handle different duration formats
    const match = duration.match(/PT(?:([0-9]+)H)?(?:([0-9]+)M)?/);
    if (!match) {
      console.warn(`Invalid duration format: ${duration}`);
      return 0;
    }
    
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    
    // Ensure we have valid numbers
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn(`Invalid duration values in: ${duration}`);
      return 0;
    }
    
    return hours * 60 + minutes;
  };

  // Filter and sort flights
  const filteredAndSortedFlights = React.useMemo(() => {
    // Start with all outbound legs
    let result = tripData.map(trip => ({
      ...trip,
      itineraries: [trip.itineraries[0]] // Only show outbound leg initially
    }));

    // Apply filters
    result = result.filter(trip => {
      // Filter by number of stops
      const stops = trip.itineraries[0]?.segments?.length - 1 || 0;
      if (filters.maxStops === 0 && stops !== 0) return false;
      if (filters.maxStops === 1 && stops > 1) return false;
      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'price') {
        const priceA = parseFloat(a.price.total);
        const priceB = parseFloat(b.price.total);
        return filters.sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      } else {
        // Sort by duration
        const durationA = parseDuration(a.itineraries[0]?.duration || 'PT0H0M');
        const durationB = parseDuration(b.itineraries[0]?.duration || 'PT0H0M');
        return filters.sortOrder === 'asc' ? durationA - durationB : durationB - durationA;
      }
    });

    return result;
  }, [tripData, filters]);

  const [error, setError] = useState<string | null>(null);
  const quickSelect = [250, 500, 750, 1000, 1500];
  const popularDestinations = [
    { code: 'PAR', name: 'Paris' },
    { code: 'LON', name: 'London' },
    { code: 'NYC', name: 'New York' },
    { code: 'ROM', name: 'Rome' },
    { code: 'BCN', name: 'Barcelona' },
  ];


  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Handler functions are defined later in the file

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTripData([]);
    // Reset all selections when performing a new search
    setSelectedOutbound(null);
    // No longer need to reset selectedReturn for roundtrip
    setViewState('searching');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Prepare query parameters
      const queryParams = new URLSearchParams({
        origin: searchParams.origin,
        destination: searchParams.destination,
        departureDate: searchParams.departureDate,
        returnDate: searchParams.returnDate || '',
        tripType: searchParams.tripType,
        nights: searchParams.nights.toString(),
        travelers: searchParams.travelers.toString(),
        currency: searchParams.currency,
        budget: searchParams.budget.toString(),
        includeHotels: searchParams.includeHotels ? 'true' : 'false',
        useDuffel: searchParams.useDuffel ? 'true' : 'false',
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

      // Log the first trip to check its structure
      if (data.data[0]) {
        console.log('First trip data:', data.data[0]);
      }

      // Set the trip data and switch to results view
      setTripData(data.data);
      setViewState('results');

      // CACHE the flight offers in localStorage
      const cacheKey = `flight_search_${searchParams.origin}_${searchParams.destination}_${searchParams.departureDate}_${searchParams.returnDate || ''}_${searchParams.tripType}_${searchParams.nights}_${searchParams.travelers}_${searchParams.currency}_${searchParams.budget}_${searchParams.includeHotels}_${searchParams.useDuffel}`;
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

  const handleBackToSearch = () => {
    setViewState('initial');
  };

  if (isLoading) return( <div className="flex justify-center items-center h-screen">
    <Loading lottieUrl="https://lottie.host/7c52d644-a961-4de0-9957-d4cfb75f1241/1b5IX1mZ0f.json" alt="Loading" />
  </div>
  );

  const handleInputChange = (field: keyof SearchParams, value: unknown) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (viewState === 'initial') {
      setViewState('dates');
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
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                    <div className="flex-1">
                      <AirportAutocomplete
                        label="Origin"
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
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Destination
                    </label>
                    <div className="flex-1">
                      <AirportAutocomplete
                        label="Destination"
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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


  // Helper: Get flights for display
  const getFlightsForDisplay = () => {
    return tripData.map(trip => {
      // For roundtrip searches, keep all itineraries (both outbound and inbound)
      // For one-way searches, only keep the outbound itinerary
      return {
        ...trip,
        itineraries: searchParams.tripType === 'roundtrip' ? trip.itineraries : [trip.itineraries[0]]
      };
    });
  };
  
  const flightsForDisplay = getFlightsForDisplay();

  // Handle flight selection
  const handleSelectOutbound = async (trip: FlightOffer) => {
    // For roundtrip, proceed directly to booking with both outbound and inbound flights
    if (searchParams.tripType === 'roundtrip') {
      handleContinueToBooking(trip);
      return;
    }
    
    // For one-way trips, continue with the existing flow
    // No longer need to reset selectedReturn for roundtrip
    setSelectedOutbound(trip);
    
    // For one-way trips, go directly to booking
    const tripToBook = {
      id: trip.id || `trip-${Date.now()}`,
      trip: {
        ...trip,
        price: trip.price,
        itineraries: [...trip.itineraries]
      },
      searchParams: {
        ...searchParams,
        tripType: 'oneway' as const,
        returnDate: '' // Ensure return date is cleared for one-way trips
      }
    };
    
    // First update the cart state
    setTripInCart(tripToBook);
    
    // Then navigate to the booking page
    router.push('/trip-summary');
  };

  // No longer need handleSelectReturn for roundtrip as we're handling both flights together

  const handleReset = () => {
    setSelectedOutbound(null);
    // No longer need to reset selectedReturn for roundtrip
    handleBackToSearch();
  };

  // Handle continue to booking (single-offer logic for roundtrip)
const handleContinueToBooking = async (trip?: FlightOffer) => {
  const flightToBook = trip || selectedOutbound;
  if (!flightToBook) return;

  try {
    // For roundtrip bookings, ensure only a single combined offer (with both slices) is used
    // The flightToBook for roundtrip must ALREADY be the combined offer from Duffel with both slices and correct total price
    // For one-way, flightToBook is the single offer as usual
    const tripToBook = {
      id: flightToBook.id || `trip-${Date.now()}`,
      trip: {
        ...flightToBook,
        // The price object must already be the correct total for both slices (Duffel combined offer)
        price: {
          ...flightToBook.price,
          breakdown: {
            outbound: flightToBook.price.breakdown?.outbound || flightToBook.price.total,
            return: flightToBook.price.breakdown?.return || (searchParams.tripType === 'roundtrip' ? flightToBook.price.total : '0')
          }
        },
        itineraries: [...flightToBook.itineraries]
      },
      searchParams: {
        ...searchParams,
        tripType: searchParams.tripType as 'oneway' | 'roundtrip',
        ...(searchParams.tripType === 'oneway' && { returnDate: '' })
      },
      totalPrice: flightToBook.price.total
    };

    // Save to localStorage for booking
    localStorage.setItem('current_booking_offer', JSON.stringify(tripToBook));

    // Update the cart state
    await setTripInCart(tripToBook);

    // Navigate to booking page
    router.push('/trip-summary');

    // Clear selections after navigation
    setSelectedOutbound(null);
    // No longer need to reset selectedReturn for roundtrip
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

  // Search results component
  function renderSearchResults() {
    return (
    <div className="min-h-screen bg-gray-50 py-12">
      <header className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <motion.button
            onClick={handleReset}
            className="text-gray-600 hover:text-[#FFA500] focus:outline-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiArrowLeft className="inline-block mr-2" /> New Search
          </motion.button>
          <h1 className="text-xl font-semibold text-gray-800">Search Results</h1>
          <div></div>
        </div>
      </header>
      <div className="container mx-auto px-4 mt-8">
        <AnimatePresence>
          {/* Flight Selection */}
          {!selectedOutbound ? (
            <div>
              {/* Filter and Sort Controls */}
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Stops Filter */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stops</label>
                    <div className="flex space-x-2">
                      {[
                        { value: 0, label: 'Direct' },
                        { value: 1, label: 'Max 1 Stop' },
                        { value: 2, label: 'All Flights' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setFilters(prev => ({ ...prev, maxStops: option.value as 0 | 1 | 2 }))}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            filters.maxStops === option.value
                              ? 'bg-[#FFA500] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>


                  {/* Sort By */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <div className="flex space-x-2">
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as 'price' | 'duration' }))}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
                      >
                        <option value="price">Price</option>
                        <option value="duration">Duration</option>
                      </select>
                      <button
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                        }))}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        title={filters.sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
                      >
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Select your flight</h2>
              {flightsForDisplay.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-lg">No flights found matching your filters.</p>
                  <button 
                    onClick={() => setFilters({ maxStops: 2, sortBy: 'price', sortOrder: 'asc' })}
                    className="mt-4 text-blue-600 hover:underline mr-4"
                  >
                    Reset filters
                  </button>
                  <button 
                    onClick={handleBackToSearch}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    ← Back to search
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {flightsForDisplay.map((trip) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TripCard
                        trip={{
                          ...trip,
                          // For roundtrip, include both outbound and inbound flights in the same card
                          // For one-way, just use the trip as is
                          itineraries: searchParams.tripType === 'roundtrip' && trip.itineraries.length > 1 ?
                            [trip.itineraries[0], trip.itineraries[1]] : trip.itineraries
                        }}
                        budget={searchParams.budget}
                        currency={searchParams.currency}
                        flightType={searchParams.tripType === 'oneway' ? 'oneway' : 'outbound'}
                        tripTypeParam={searchParams.tripType}
                        onSelect={() => searchParams.tripType === 'roundtrip' ? handleContinueToBooking(trip) : handleSelectOutbound(trip)}
                        selected={false}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : null
        }
        </AnimatePresence>
      
      </div>
    </div>
  );
}

  if (viewState === 'results') {
    return renderSearchResults();
  }

  if (viewState === 'error') {
    return renderError();
  }

  return renderSearchForm();
}

export default HomePage;