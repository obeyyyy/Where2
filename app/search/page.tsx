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
  originType: 'Airport' | 'City' | 'Country';
  origin: string;
  destinationType: 'Airport' | 'City' | 'Country';
  destination: string;
  departureDate: string;
  returnDate: string;
  tripType: TripType;
  travelers: number;
  nights: number;
  includeHotels: boolean;
  useKiwi: boolean; // Kiwi/Amadeus toggle
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
    originType: 'Airport',
    origin: 'MAD',
    destinationType: 'Airport',
    destination: 'PAR',
    departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
    returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    tripType: 'roundtrip' as const,
    travelers: 1,
    nights: 7,
    includeHotels: true,
    useKiwi: true, // default to Kiwi
    useDuffel: false
  });
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOffer | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<FlightOffer | null>(null);
  const [tripData, setTripData] = useState<FlightOffer[]>([]);
  const [showReturnFlights, setShowReturnFlights] = useState(false);
  // Memoized function to get outbound flights (first segment of each trip)
  const memoizedOutboundFlights = React.useMemo(() => 
    tripData.map(trip => ({
      ...trip,
      itineraries: [trip.itineraries[0]] // Only show outbound leg initially
    })),
    [tripData]
  );
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
  const getOutboundFlights = () => {
    return tripData.map(trip => ({
      ...trip,
      itineraries: [trip.itineraries[0]] // Only show outbound leg initially
    }));
  };
  
  const outboundFlights = getOutboundFlights();

  // Handle flight selection
  const handleSelectOutbound = async (trip: FlightOffer) => {
    // Always reset return selection when selecting a new outbound flight
    setSelectedReturn(null);
    
    // Set the new outbound flight
    setSelectedOutbound(trip);
    
    if (searchParams.tripType === 'oneway') {
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
    } else {
      // For roundtrip, show return flight selection
      setViewState('results');
    }
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
    if (!selectedOutbound) return;
    
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
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Select your {searchParams.tripType === 'oneway' ? 'flight' : 'outbound flight'}</h2>
              {memoizedOutboundFlights.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-lg">No flights found.</p>
                  <button 
                    onClick={handleBackToSearch}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    ← Back to search
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {outboundFlights.map((trip) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TripCard
                        trip={trip}
                        budget={searchParams.budget}
                        searchParams={{
                          ...searchParams,
                          departureDate: searchParams.departureDate,
                          returnDate: searchParams.returnDate || ''
                        }}
                        flightType={searchParams.tripType === 'oneway' ? 'oneway' : 'outbound'}
                        onSelect={() => handleSelectOutbound(trip)}
                        selected={false}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : searchParams.tripType === 'roundtrip' ? (
            <div>
              <h2 className="text-xl font-bold mb-4">Review your trip</h2>
              <div className="space-y-8">
                {/* Outbound Flight */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Outbound Flight</h3>
                    <button 
                      onClick={() => setSelectedOutbound(null)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Change flight
                    </button>
                  </div>
                  <TripCard
                    trip={{
                      ...selectedOutbound,
                      itineraries: [selectedOutbound.itineraries[0]] // Only show outbound leg
                    }}
                    budget={searchParams.budget}
                    searchParams={{
                      ...searchParams,
                      departureDate: selectedOutbound.itineraries[0]?.segments[0]?.departure?.at
                        ? new Date(selectedOutbound.itineraries[0].segments[0].departure.at).toISOString().split('T')[0]
                        : searchParams.departureDate,
                      returnDate: searchParams.returnDate || ''
                    }}
                    selected={true}
                  />
                </div>

                {/* Return Flight */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Return Flight</h3>
                  {selectedReturn ? (
                    <TripCard
                      trip={{
                        ...selectedReturn,
                        // Ensure we're using the correct date from the return segments
                        itineraries: selectedReturn.itineraries.map((itinerary: any, idx: number) => ({
                          ...itinerary,
                          // Use the first segment's departure date for the return flight
                          departureDate: itinerary.segments?.[0]?.departure?.at || ''
                        }))
                      }}
                      budget={searchParams.budget}
                      searchParams={{
                        ...searchParams,
                        // Use the return date from the search params for display
                        departureDate: searchParams.returnDate || '',
                        returnDate: ''
                      }}
                      flightType="return"
                      selected={true}
                    />
                  ) : (
                    <div>
                      <p className="text-sm text-yellow-700 mb-2">Please select a return flight:</p>
                      <div className="space-y-4">
                        {/* Show all available return flight options */}
                        {(() => {
                          if (!selectedOutbound) return null;
                          
                          // Find all trips that have the same outbound segment as the selected outbound
                          const returnFlightOptions = tripData
                            .filter(trip => {
                              // Skip trips that don't have exactly 2 itineraries (outbound + return)
                              if (!trip.itineraries || trip.itineraries.length !== 2) return false;
                              
                              // Check if the outbound segments match the selected outbound
                              const outboundSegments = trip.itineraries[0].segments;
                              const selectedSegments = selectedOutbound.itineraries[0].segments;
                              
                              return JSON.stringify(outboundSegments) === JSON.stringify(selectedSegments);
                            })
                            // Map to a new trip object with just the return itinerary
                            .map(trip => {
                              // Get the return itinerary (second one in the array)
                              const returnItinerary = trip.itineraries[1];
                              
                              // Create a new trip object with just the return itinerary
                              return {
                                ...trip,
                                itineraries: [returnItinerary],
                                price: {
                                  ...trip.price,
                                  // Adjust the price to show only the return portion (half of total)
                                  total: (parseFloat(trip.price.total) / 2).toFixed(2)
                                }
                              };
                            })
                            .filter(trip => trip.itineraries[0]?.segments?.length > 0);
                          if (returnFlightOptions.length === 0) {
                            return (
                              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                <div className="flex">
                                  <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                      No return flight options available for this selection.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return returnFlightOptions.map((trip, idx) => (
                            <TripCard
                              key={trip.id + '-return-' + idx}
                              trip={trip}
                              budget={searchParams.budget}
                              searchParams={{
                                ...searchParams,
                                departureDate: searchParams.returnDate || '',
                                returnDate: ''
                              }}
                              flightType="return"
                              onSelect={() => setSelectedReturn(trip)}
                              selected={false}
                            />
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex items-center gap-4">
                {searchParams.tripType === 'roundtrip' && (
                  <button
                    className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-shadow duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!selectedReturn}
                    onClick={() => {
                      // Create a combined trip with both outbound and return flights
                      const combinedTrip = {
                        ...selectedOutbound,
                        // Preserve the original itineraries structure with proper dates
                        itineraries: [
                          // Keep the outbound itinerary as is
                          selectedOutbound.itineraries[0],
                          // Add the return itinerary if selected
                          ...(selectedReturn ? [selectedReturn.itineraries[0]] : [])
                        ],
                        // Combine prices for round trip
                        price: {
                          ...selectedOutbound.price,
                          // If we have a return flight, add the prices together
                          ...(selectedReturn && {
                            total: (parseFloat(selectedOutbound.price.total) + parseFloat(selectedReturn.price.total)).toFixed(2),
                            breakdown: {
                              outbound: selectedOutbound.price.total,
                              return: selectedReturn.price.total
                            }
                          })
                        } as const // Use const assertion to ensure type safety
                      };
                      
                      // Create a modified searchParams object with the correct dates
                      const updatedSearchParams = {
                        ...searchParams,
                        // Make sure the return date is correctly set from the return flight
                        returnDate: selectedReturn?.itineraries[0]?.segments?.[0]?.departure?.at
                          ? new Date(selectedReturn.itineraries[0].segments[0].departure.at).toISOString().split('T')[0]
                          : searchParams.returnDate
                      };
                      
                      // Format the trip data to match what the booking page expects
                      const formattedTrip = {
                        ...combinedTrip,
                        // Ensure we have the correct price structure
                        price: (() => {
                          const basePrice = {
                            total: combinedTrip.price?.total || '0',
                            currency: combinedTrip.price?.currency || 'USD'
                          };
                          
                          const isRoundTrip = (searchParams.tripType as string) === 'roundtrip';
                          if (isRoundTrip && selectedReturn) {
                            return {
                              ...basePrice,
                              breakdown: {
                                outbound: selectedOutbound.price?.total || '0',
                                return: selectedReturn?.price?.total || '0'
                              }
                            };
                          }
                          return basePrice;
                        })(),
                        // Ensure we have the correct itineraries structure
                        itineraries: (combinedTrip.itineraries || []).map((itinerary: any) => ({
                          ...itinerary,
                          // Ensure segments have the expected structure
                          segments: (itinerary.segments || []).map((segment: any) => ({
                            ...segment,
                            departure: {
                              ...segment.departure,
                              at: segment.departure?.at || segment.departure?.dateTime || ''
                            },
                            arrival: {
                              ...segment.arrival,
                              at: segment.arrival?.at || segment.arrival?.dateTime || ''
                            }
                          }))
                        }))
                      };

                      // Save to localStorage for booking
                      localStorage.setItem('current_booking_offer', JSON.stringify({
                        trip: formattedTrip,
                        searchParams: {
                          ...searchParams,
                          // Ensure we have the required fields for the booking page
                          from: searchParams.origin,
                          to: searchParams.destination,
                          travelers: searchParams.travelers || 1,
                          tripType: searchParams.tripType,
                          // Make sure the return date is cleared for one-way trips
                          returnDate: (searchParams.tripType as string) === 'oneway' ? '' : updatedSearchParams.returnDate,
                          departureDate: searchParams.departureDate
                        },
                        budget: searchParams.budget
                      }));
                      
                      // Navigate to booking page
                      window.location.href = '/book';
                    }}
                  >
                    {(searchParams.tripType as string) === 'oneway' 
                      ? 'Continue to Booking' 
                      : !selectedReturn 
                        ? 'Select Return Flight to Continue' 
                        : 'Book Package'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Select your return flight</h2>
              {outboundFlights.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-lg">No return flights found.</p>
                  <button 
                    onClick={handleBackToSearch}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    ← Back to search
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {outboundFlights.map((trip) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TripCard
                        trip={trip}
                        budget={searchParams.budget}
                        searchParams={{
                          ...searchParams,
                          departureDate: searchParams.departureDate,
                          returnDate: searchParams.returnDate || ''
                        }}
                        flightType="return"
                        onSelect={() => handleSelectReturn(trip)}
                        selected={false}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
      <h2 className="text-3xl font-bold text-red-500 mb-4">Oops! An Error Occurred</h2>
      <p className="text-gray-700 mb-4">{error}</p>
      <motion.button
        onClick={handleBackToSearch}
        className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:ring-opacity-50"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Back to Search
      </motion.button>
    </div>
  );

  const renderSearching = () => (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
      <h2 className="text-3xl font-semibold text-gray-800 mb-4">Searching for the best trips...</h2>
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#FFA500] mb-4"></div>
      <p className="text-gray-600">Please wait while we find amazing deals for you.</p>
    </div>
  );

  if (viewState === 'searching') {
    return renderSearching();
  }

  const renderSearchResults = () => (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {!showReturnFlights ? (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Select your outbound flight</h2>
              {outboundFlights.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-lg">No flights found. Please try different search criteria.</p>
                  <button 
                    onClick={handleBackToSearch}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    ← Back to search
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {outboundFlights.map((trip) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TripCard
                        trip={trip}
                        budget={searchParams.budget}
                        searchParams={{
                          ...searchParams,
                          departureDate: searchParams.departureDate,
                          returnDate: searchParams.returnDate || ''
                        }}
                        flightType="outbound"
                        onSelect={() => handleSelectOutbound(trip)}
                        selected={selectedOutbound?.id === trip.id}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
              
              <div className="mt-8 flex justify-between items-center">
                <button
                  className="text-gray-600 hover:text-gray-800 underline transition-colors duration-200"
                  onClick={handleBackToSearch}
                >
                  ← Back to search
                </button>
                
                <button
                  className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedOutbound}
                  onClick={() => {
                    if (!selectedOutbound) return;
                    
                    if (searchParams.tripType === 'oneway') {
                      // For one-way trips, proceed directly to booking
                      const tripToBook = {
                        ...selectedOutbound,
                        price: {
                          ...selectedOutbound.price,
                          breakdown: {
                            outbound: selectedOutbound.price.total,
                            return: '0'
                          }
                        }
                      };

                      // Save the full trip object (including searchParams) for booking
                      localStorage.setItem('current_booking_offer', JSON.stringify({
                        trip: tripToBook,
                        searchParams: {
                          ...searchParams,
                          from: searchParams.origin,
                          to: searchParams.destination,
                          travelers: searchParams.travelers || 1,
                          tripType: searchParams.tripType,
                          returnDate: '', // Clear return date for one-way trips
                          departureDate: searchParams.departureDate
                        },
                        budget: searchParams.budget
                      }));
                      
                      // Navigate to booking page
                      window.location.href = '/book';
                    } else {
                      // For round-trip, show return flights
                      setShowReturnFlights(true);
                    }
                  }}
                >
                  {(searchParams.tripType as string) === 'oneway' 
                    ? 'Continue to Booking' 
                    : !selectedReturn 
                      ? 'Select Return Flight to Continue' 
                      : 'Book Package'}
                </button>
                
                <button
                  className="text-gray-600 hover:text-gray-800 underline transition-colors duration-200"
                  onClick={handleReset}
                >
                  Start Over
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Select your return flight</h2>
              {outboundFlights.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-lg">No return flights found.</p>
                  <button 
                    onClick={handleBackToSearch}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    ← Back to search
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {outboundFlights.map((trip) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TripCard
                        trip={trip}
                        budget={searchParams.budget}
                        searchParams={{
                          ...searchParams,
                          departureDate: searchParams.departureDate,
                          returnDate: searchParams.returnDate || ''
                        }}
                        flightType="return"
                        onSelect={() => handleSelectReturn(trip)}
                        selected={false}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
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