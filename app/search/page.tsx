'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowRight,
  FiArrowLeft,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiGlobe,
  FiFilter,
  FiSearch,
  FiRefreshCw,
  FiClock
} from 'react-icons/fi';
import airportsJson from 'airports-json';

// Components
const Loading = dynamic(() => import('../components/loading'), { ssr: false });
import TripCard from '../components/TripCard';
import { AirportAutocomplete } from '../components/AirportAutocomplete';
import { useTripCart } from '../components/TripCartContext';

// Hooks
import { useTripSearch } from '../../hooks/useTripSearch';
import { useStepNavigation } from '../../hooks/useStepNavigation';
import { useFlightSelection } from '../../hooks/useFlightSelection';

// Constants
import {
  QUICK_SELECT_BUDGETS,
  POPULAR_DESTINATIONS,
  CURRENCY_OPTIONS,
  STOP_OPTIONS,
  FORM_STEPS
} from '../constants/trip-search.constants';

// Utilities
import { getMinDate, getMinReturnDate } from '../utils/trip-search.utils';

/**
 * Step Indicator Component
 */
interface StepIndicatorProps {
  currentStep: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = FORM_STEPS;
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

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

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white shadow-lg'
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
                    <span className="text-lg">
                      {step.icon === 'FiDollarSign' && <FiDollarSign />}
                      {step.icon === 'FiCalendar' && <FiCalendar />}
                      {step.icon === 'FiUsers' && <FiUsers />}
                    </span>
                  )}
                </motion.div>
                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-[#FF8C00]' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 bg-gray-100 mx-2 relative">
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FFA500] to-[#FF8C00] rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
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

/**
 * Filter Panel Component
 */
interface FilterPanelProps {
  filters: any;
  setFilters: (filters: any) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, setFilters }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 mx-auto w-full md:w-11/12 lg:w-10/12 border border-orange-100">
    <h3 className="font-extrabold text-xl mb-8 text-gray-800 flex items-center justify-center gap-2">
      <FiFilter className="text-orange-500" />
      <span className="bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
        Filter Options
      </span>
    </h3>
    
    <div className="flex flex-col md:flex-row gap-8 w-full">
      {/* Stops Filter */}
      <div className="w-full">
        <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider text-center">
          Flight Stops
        </label>
        <div className="flex flex-wrap justify-center gap-3">
          {STOP_OPTIONS.map(option => (
            <motion.button
              key={option.value}
              onClick={() => setFilters({ ...filters, maxStops: option.value })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filters.maxStops === option.value
                  ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFA500] text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Sorting */}
      <div className="w-full">
        <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider text-center">
          Sort By
        </label>
        <div className="flex flex-wrap justify-center gap-4">
          <motion.button
            onClick={() => setFilters({
              ...filters,
              sortBy: 'price',
              sortOrder: filters.sortBy === 'price' && filters.sortOrder === 'asc' ? 'desc' : 'asc'
            })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filters.sortBy === 'price'
                ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFA500] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiDollarSign />
            Price
            {filters.sortBy === 'price' && (
              <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </motion.button>
          
          <motion.button
            onClick={() => setFilters({
              ...filters,
              sortBy: 'duration',
              sortOrder: filters.sortBy === 'duration' && filters.sortOrder === 'asc' ? 'desc' : 'asc'
            })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filters.sortBy === 'duration'
                ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFA500] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiClock />
            Duration
            {filters.sortBy === 'duration' && (
              <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Main Search Page Component
 */
export default function SearchPage() {
  const { setTrip: setTripInCart } = useTripCart();
  
  const {
    viewState,
    setViewState,
    isLoading,
    searchParams,
    handleInputChange,
    tripData,
    filters,
    setFilters,
    error,
    handleSearch,
    handleBackToSearch,
    handleReset,
    getFilteredFlights,
  } = useTripSearch();

  const { handleNext, handleBack } = useStepNavigation(viewState);

  const { handleSelectFlight } = useFlightSelection({
    searchParams,
    setTripInCart,
  });

  const filteredFlights = getFilteredFlights();

  // Animation variants
  const formVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      x: -50,
      transition: { duration: 0.2 }
    }
  };

  // Loading state
  if (isLoading) {
    const loadingMessage = viewState === 'searching' 
      ? 'Searching for the best trips...' 
      : 'Loading your travel options...';
      
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading 
          lottieUrl="https://lottie.host/7c52d644-a961-4de0-9957-d4cfb75f1241/1b5IX1mZ0f.json" 
          alt="Loading" 
          message={loadingMessage} 
        />
      </div>
    );
  }

  // Error state
  if (viewState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error || 'An error occurred. Please try again.'}</p>
          <button
            onClick={handleBackToSearch}
            className="px-6 py-2 bg-[#FFA500] text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  // Results state
  if (viewState === 'results') {
    return (
      <div className="min-h-screen">
        <header className="bg-white py-4 shadow-sm">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <motion.button
              onClick={handleBackToSearch}
              className="text-gray-600 hover:text-[#FFA500] focus:outline-none flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiArrowLeft /> New Search
            </motion.button>
            
            <h2 className="text-3xl md:text-4xl font-extrabold text-center">
              <span className="bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
                Search Results
              </span>
            </h2>
            
            <div className="w-24" /> {/* Spacer for alignment */}
          </div>
        </header>

        <div className="container mx-auto px-4 mt-8">
          {/* Filter Panel */}
          <FilterPanel filters={filters} setFilters={setFilters} />

          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FiSearch className="text-orange-500" />
              {filteredFlights.length} {filteredFlights.length === 1 ? 'Flight' : 'Flights'} Found
            </h3>
            <button 
              onClick={handleReset}
              className="text-sm text-orange-500 hover:underline flex items-center gap-1"
            >
              <FiRefreshCw size={14} />
              Reset Filters
            </button>
          </div>

          {/* Flight Results */}
          {filteredFlights.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-lg mb-4">No flights found matching your filters.</p>
              <button 
                onClick={handleReset}
                className="text-blue-600 hover:underline"
              >
                Reset filters and try again
              </button>
            </div>
          ) : (
            <div className="space-y-4 pb-8">
              {filteredFlights.map((trip: any) => (
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
                      itineraries: searchParams.tripType === 'roundtrip' && trip.itineraries.length > 1
                        ? [trip.itineraries[0], trip.itineraries[1]]
                        : trip.itineraries
                    }}
                    budget={searchParams.budget}
                    currency={searchParams.currency}
                    flightType={searchParams.tripType === 'oneway' ? 'oneway' : 'outbound'}
                    tripTypeParam={searchParams.tripType}
                    onSelect={() => handleSelectFlight(trip)}
                    selected={false}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Form state (initial, dates, details)
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
      <StepIndicator currentStep={viewState} />

      <div className="px-4 sm:px-6 md:px-8 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {/* Budget Step */}
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
                  {QUICK_SELECT_BUDGETS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleInputChange('budget', amount)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        searchParams.budget === amount
                          ? 'bg-[#FFA500] text-white'
                          : 'bg-[#FFF1D6] text-[#FFA500] hover:bg-[#FFE8C0]'
                      }`}
                    >
                      {searchParams.currency} {amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={searchParams.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
                >
                  {CURRENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}

          {/* Dates Step */}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departure</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={searchParams.departureDate}
                      min={getMinDate()}
                      onChange={(e) => handleInputChange('departureDate', e.target.value)}
                      className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
                    />
                    <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                        min={getMinReturnDate(searchParams.departureDate)}
                        onChange={(e) => handleInputChange('returnDate', e.target.value)}
                        className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
                      />
                      <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value="One Way"
                      disabled
                      className="w-full p-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-500"
                    />
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleInputChange('tripType', 'roundtrip')}
                    className={`py-3 rounded-xl font-medium transition-all ${
                      searchParams.tripType === 'roundtrip'
                        ? 'bg-[#FFA500] text-white'
                        : 'bg-[#FFF1D6] text-[#FFA500] hover:bg-[#FFE8C0]'
                    }`}
                  >
                    Roundtrip
                  </button>
                  <button
                    onClick={() => handleInputChange('tripType', 'oneway')}
                    className={`py-3 rounded-xl font-medium transition-all ${
                      searchParams.tripType === 'oneway'
                        ? 'bg-[#FFA500] text-white'
                        : 'bg-[#FFF1D6] text-[#FFA500] hover:bg-[#FFE8C0]'
                    }`}
                  >
                    One Way
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Duration</label>
                <div className="relative">
                  <input
                    type="text"
                    value={`${searchParams.nights} ${searchParams.nights === 1 ? 'night' : 'nights'}`}
                    disabled
                    className="w-full p-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Automatically calculated from your selected dates
                </p>
              </div>
            </motion.div>
          )}

          {/* Details Step */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Travelers</label>
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                  <button
                    onClick={() => handleInputChange('travelers', Math.max(1, searchParams.travelers - 1))}
                    disabled={searchParams.travelers <= 1}
                    className="px-4 py-3 bg-gray-100 text-[#FFA500] text-xl font-bold disabled:opacity-50"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center py-3 font-medium">
                    {searchParams.travelers} {searchParams.travelers === 1 ? 'Traveler' : 'Travelers'}
                  </div>
                  <button
                    onClick={() => handleInputChange('travelers', Math.min(9, searchParams.travelers + 1))}
                    disabled={searchParams.travelers >= 9}
                    className="px-4 py-3 bg-gray-100 text-[#FFA500] text-xl font-bold disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {searchParams.travelers} traveler{searchParams.travelers !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                  <AirportAutocomplete
                    label="Origin"
                    value={(() => {
                      const airport = airportsJson.airports.find((ap: any) => ap.iata === searchParams.origin);
                      return airport ? {
                        iata: airport.iata,
                        name: airport.name,
                        city: airport.city,
                        country: airport.country,
                        label: `${airport.iata} - ${airport.name}, ${airport.city}`
                      } : null;
                    })()}
                    onChange={(val) => handleInputChange('origin', val?.iata || val)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <AirportAutocomplete
                    label="Destination"
                    value={(() => {
                      const airport = airportsJson.airports.find((ap: any) => ap.iata === searchParams.destination);
                      return airport ? {
                        iata: airport.iata,
                        name: airport.name,
                        city: airport.city,
                        country: airport.country,
                        label: `${airport.iata} - ${airport.name}, ${airport.city}`
                      } : null;
                    })()}
                    onChange={(val) => handleInputChange('destination', val?.iata || val)}
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Popular Destinations</label>
                <div className="grid grid-cols-2 gap-3">
                  {POPULAR_DESTINATIONS.map((dest) => (
                    <button
                      key={dest.code}
                      onClick={() => handleInputChange('destination', dest.code)}
                      className={`p-3 border rounded-xl text-left transition-all ${
                        searchParams.destination === dest.code
                          ? 'border-[#FFA500] bg-[#FFF9F0]'
                          : 'border-gray-300 hover:border-[#FFA500]'
                      }`}
                    >
                      <div className="font-medium">{dest.name}</div>
                      <div className="text-sm text-gray-500">{dest.code}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Include Hotels</label>
                  <button
                    onClick={() => handleInputChange('includeHotels', !searchParams.includeHotels)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      searchParams.includeHotels ? 'bg-[#FFA500]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`${
                        searchParams.includeHotels ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {searchParams.includeHotels
                    ? 'Hotels will be included in your search'
                    : 'Only flights will be included'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between px-4 max-w-md mx-auto mt-8">
        {viewState !== 'initial' && (
          <motion.button
            onClick={() => {
              if (viewState === 'details') setViewState('dates');
              else if (viewState === 'dates') setViewState('initial');
            }}
            className="bg-white text-gray-600 border border-gray-300 py-3 px-6 rounded-xl font-medium shadow-sm hover:bg-gray-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiArrowLeft className="inline-block mr-2" /> Back
          </motion.button>
        )}
        
        {viewState !== 'details' ? (
          <motion.button
            onClick={() => {
              if (viewState === 'initial') setViewState('dates');
              else if (viewState === 'dates') setViewState('details');
            }}
            className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg ml-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Next <FiArrowRight className="inline-block ml-2" />
          </motion.button>
        ) : (
          <motion.button
            onClick={handleSearch}
            className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg ml-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Find Trips <FiGlobe className="inline-block ml-2" />
          </motion.button>
        )}
      </div>
    </div>
  );
}