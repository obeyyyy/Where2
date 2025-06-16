'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiSearch } from 'react-icons/fi';
import TripCard from './TripCard';
import { FlightOffer } from '../types';

interface SearchResultsProps {
  flights: FlightOffer[];
  tripData: any[];
  searchParams: any;
  hasMoreResults: boolean;
  isLoadingMore: boolean;
  isLoading: boolean;
  onBackToSearch: () => void;
  onSelectOutbound: (flight: FlightOffer) => void;
  onLoadMore: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  flights,
  tripData,
  searchParams,
  hasMoreResults,
  isLoadingMore,
  isLoading,
  onBackToSearch,
  onSelectOutbound,
  onLoadMore,
}) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMoreResults || isLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            onLoadMore();
          }
        });
      },
      { rootMargin: '200px' } // Trigger before reaching bottom
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMoreResults, isLoadingMore, onLoadMore]);

  React.useEffect(() => {
    console.log('SearchResults - Rendering flights:', {
      totalFlights: flights.length,
      flightIds: flights.map(f => f.id),
      flightPrices: flights.map(f => `${f.price?.currency} ${f.price?.total}`),
      hasMoreResults,
      isLoading
    });

    // Debug log for load more controls
    console.log('Load more controls:', { hasMoreResults, isLoadingMore, flightsLength: flights.length });
  }, [flights, hasMoreResults, isLoading, isLoadingMore]);

  if (isLoading && flights.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <button
            onClick={onBackToSearch}
            className="flex items-center text-gray-600 hover:text-orange-500 mb-8"
          >
            <FiArrowLeft className="mr-2" /> Back to search
          </button>
          
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiSearch className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No flights found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              We couldn't find any flights matching your criteria. Try adjusting your search filters.
            </p>
            <button
              onClick={onBackToSearch}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              Modify Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBackToSearch}
            className="flex items-center text-gray-600 hover:text-orange-500"
          >
            <FiArrowLeft className="mr-2" /> New Search
          </button>
          <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            {flights.length} {flights.length === 1 ? 'flight' : 'flights'} found
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {searchParams.tripType === 'oneway' ? 'Available Flights' : 'Outbound Flights'}
          </h1>
          
          <div className="space-y-4">
            {flights.map((flight, index) => (
              <motion.div
                key={`${flight.id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <TripCard
                  trip={flight}
                  budget={searchParams.budget}
                  currency={searchParams.currency || 'EUR'}
                  flightType={searchParams.tripType === 'oneway' ? 'oneway' : 'outbound'}
                  onSelect={() => onSelectOutbound(flight)}
                  selected={false}
                />
              </motion.div>
            ))}
          </div>

          {/* Sentinel div for infinite scroll */}
          <div ref={loadMoreRef} />

          {/* Manual Load More button as fallback */}
          {hasMoreResults && !isLoadingMore && (
            <div className="mt-8 text-center">
              <button
                onClick={onLoadMore}
                className="px-6 py-3 rounded-full font-medium bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-0.5"
              >
                Load More Flights
              </button>
            </div>
          )}

          {isLoadingMore && (
            <div className="flex justify-center mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
