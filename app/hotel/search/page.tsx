"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiMapPin, FiCalendar, FiUsers, FiStar, FiArrowRight, FiLoader, FiFilter, FiGrid, FiList, FiChevronDown } from 'react-icons/fi';

interface HotelDetails {
  amenities: Array<{ type: string; description: string }>;
  rooms: Array<{
    id: string;
    name: string;
    description?: string;
    photos: Array<{ url?: string; original?: string }>;
    beds: Array<{ type: string; count: number }>;
  }>;
}

interface HotelSearchResult {
  id: string;
  name?: string;
  photos?: Array<{ url?: string; original?: string }>;
  rating?: number;
  location?: {
    address?: {
      city?: string;
      city_name?: string;
      country_code?: string;
      line_one?: string;
      postal_code?: string;
      region?: string;
    };
  };
  accommodation?: {
    id: string;
    name?: string;
    photos?: Array<{ url?: string; original?: string }>;
    rating?: number;
    location?: {
      address?: {
        city?: string;
        city_name?: string;
        country_code?: string;
        line_one?: string;
        postal_code?: string;
        region?: string;
      };
    };
    cheapest_rate_total_amount?: string;
    cheapest_rate_public_amount?: string;
    cheapest_rate_currency?: string;
  };
  cheapest_rate_total_amount?: string;
  cheapest_rate_public_amount?: string;
  cheapest_rate_currency?: string;
  check_in_date?: string;
  check_out_date?: string;
  rooms?: number;
  guests?: Array<{ type: string; age?: number }>;
  loading?: boolean;
  details?: HotelDetails;
  error?: string;
  expanded?: boolean;
  rateInfo?: any;
  search_result_id: string;
  accommodation_id: string;
}

const HotelSearchPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<HotelSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const destination = searchParams?.get('destination') || '';
  const checkIn = searchParams?.get('checkIn') || '';
  const checkOut = searchParams?.get('checkOut') || '';
  const rooms = searchParams?.get('rooms') || '1';
  const guests = searchParams?.get('guests') || '1';
  const roomType = searchParams?.get('type') || 'any';

  const fetchHotelDetails = async (hotelId: string, accommodationId: string) => {
    try {
      setSearchResults(prev => prev.map(h => 
        h.id === hotelId ? { ...h, loading: true, error: undefined } : h
      ));

      const response = await fetch(`/api/hotel-details/${accommodationId}`);
      if (!response.ok) throw new Error('Failed to fetch hotel details');
      
      const data = await response.json();
      if (data.success && data.rates) {
        setSearchResults(prev => prev.map(hotel => 
          hotel.id === hotelId
            ? {
                ...hotel,
                loading: false,
                details: {
                  amenities: data.rates.accommodation?.amenities || [],
                  rooms: data.rates.rooms || []
                },
                cheapest_rate_total_amount: data.rates.cheapest_rate_total_amount,
                cheapest_rate_public_amount: data.rates.cheapest_rate_public_amount,
                cheapest_rate_currency: data.rates.cheapest_rate_currency || 'USD'
              }
            : hotel
        ));
      }
    } catch (err) {
      console.error('Error fetching hotel details:', err);
      setSearchResults(prev => prev.map(hotel => 
        hotel.id === hotelId
          ? { ...hotel, loading: false, error: 'Failed to load details' }
          : hotel
      ));
    }
  };

  const fetchAllHotelDetails = async (hotels: HotelSearchResult[]) => {
    await Promise.all(
      hotels.map(hotel => 
        fetchHotelDetails(hotel.id, hotel.accommodation_id)
      )
    );
  };

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/hotel-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location: destination,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            rooms: parseInt(rooms, 10),
            guests: parseInt(guests, 10)
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch hotels');
        }

        const data = await response.json();
        
        if (data.success && data.results) {
          const hotelsWithLoading = data.results.map((result: any) => {
            const accommodation = result.accommodation || {};
            const location = accommodation.location || result.location || {};
            const address = location.address || {};
            
            return {
              id: result.id,
              name: result.name || accommodation.name,
              photos: result.photos || accommodation.photos || [],
              rating: result.rating || accommodation.rating,
              location: result.location || accommodation.location,
              ...result,
              search_result_id: result.id,
              accommodation_id: accommodation.id || '',
              accommodation: {
                id: accommodation.id,
                name: accommodation.name || 'Unnamed Hotel',
                description: accommodation.description,
                photos: accommodation.photos || [],
                rating: accommodation.rating,
                review_score: accommodation.review_score,
                amenities: accommodation.amenities || [],
                location: {
                  ...location,
                  address: {
                    city: address.city || '',
                    city_name: address.city_name || '',
                    country_code: address.country_code || '',
                    line_one: address.line_one || '',
                    postal_code: address.postal_code || '',
                    region: address.region || ''
                  }
                }
              },
              cheapest_rate_total_amount: result.cheapest_rate_total_amount || '0',
              cheapest_rate_public_amount: result.cheapest_rate_public_amount || '0',
              cheapest_rate_currency: result.cheapest_rate_currency || 'USD',
              check_in_date: result.check_in_date,
              check_out_date: result.check_out_date,
              rooms: result.rooms || 1,
              guests: result.guests || []
            };
          });
          
          setSearchResults(hotelsWithLoading);
          fetchAllHotelDetails(hotelsWithLoading);
          setLoading(false);
        } else {
          setError('No hotels found matching your criteria');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while searching for hotels');
        console.error('Error fetching hotels:', err);
      } finally {
        setLoading(false);
      }
    };

    if (destination && checkIn && checkOut) {
      fetchHotels();
    } else {
      setError('Missing required search parameters');
      setLoading(false);
    }
  }, [destination, checkIn, checkOut, rooms, guests]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} night${diffDays !== 1 ? 's' : ''}`;
    } catch (e) {
      return 'N/A';
    }
  };

  const loadMoreHotels = async () => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      const nextPage = page + 1;
      const response = await fetch('/api/hotel-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: destination,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          rooms: parseInt(rooms, 10),
          guests: parseInt(guests, 10),
          page: nextPage
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch more hotels');
      
      const data = await response.json();
      if (data.success && data.results?.length > 0) {
        setSearchResults(prev => [...prev, ...data.results]);
        setPage(nextPage);
        setHasMore(data.results.length >= 10);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleHotelDetails = (hotelId: string) => {
    setSearchResults(prev => prev.map(hotel => ({
      ...hotel,
      expanded: hotel.id === hotelId ? !hotel.expanded : false
    })));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Sticky Search Summary Bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
                <FiMapPin className="text-orange-600 text-lg" />
                <span className="font-semibold text-gray-900">{destination}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FiCalendar className="text-orange-500" />
                <span className="text-sm">{formatDate(checkIn)} - {formatDate(checkOut)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FiUsers className="text-orange-500" />
                <span className="text-sm">{guests} Guest{parseInt(guests) > 1 ? 's' : ''}, {rooms} Room{parseInt(rooms) > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-gray-700"
              >
                <FiFilter /> Filters
              </button>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600'}`}
                >
                  <FiGrid />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600'}`}
                >
                  <FiList />
                </button>
              </div>
              <Link 
                href="/"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                Modify Search
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">
            Hotels in <span className="text-orange-600">{destination}</span>
          </h1>
          <p className="text-gray-600 text-lg">
            {searchResults.length} {searchResults.length === 1 ? 'property' : 'properties'} found
          </p>
        </div>
        
        {loading && searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <FiLoader className="animate-spin text-6xl text-orange-500" />
              <div className="absolute inset-0 blur-2xl bg-orange-300/30 animate-pulse"></div>
            </div>
            <p className="text-gray-600 text-xl font-medium">Searching for the best hotels...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
          </div>
        ) : error ? (
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-2xl p-8 text-center shadow-lg">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <p className="text-red-700 text-lg font-medium mb-4">{error}</p>
            <Link 
              href="/"
              className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Return to Search
            </Link>
          </div>
        ) : (
          <>
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {searchResults.map((hotel) => (
                <div 
                  key={hotel.id} 
                  className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
                    hotel.expanded ? 'ring-2 ring-orange-500 shadow-orange-200' : ''
                  } ${viewMode === 'list' ? 'flex flex-row' : ''}`}
                  onClick={() => toggleHotelDetails(hotel.id)}
                >
                  {/* Hotel Image */}
                  <div className={`relative overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 group ${
                    viewMode === 'list' ? 'w-80 flex-shrink-0' : 'h-56'
                  }`}>
                    {hotel.accommodation?.photos?.[0]?.url || hotel.accommodation?.photos?.[0]?.original ? (
                      <img 
                        src={hotel.accommodation.photos[0]?.url || hotel.accommodation.photos[0]?.original} 
                        alt={hotel.accommodation?.name || 'Hotel'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://placehold.co/600x400/e5e7eb/9ca3af?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-lg">No image available</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    {(hotel.rating || hotel.accommodation?.rating) && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                        <FiStar className="fill-current" />
                        {hotel.rating || hotel.accommodation?.rating}
                      </div>
                    )}
                  </div>
                  
                  {/* Hotel Details */}
                  <div className="p-5 flex-1">
                    <h2 className="text-xl font-bold mb-2 text-gray-900 line-clamp-2 hover:text-orange-600 transition-colors">
                      {hotel.name || hotel.accommodation?.name || 'Unnamed Hotel'}
                    </h2>
                    
                    <div className="flex items-start gap-2 text-gray-600 mb-4">
                      <FiMapPin className="text-orange-500 flex-shrink-0 mt-1" />
                      <p className="text-sm line-clamp-2">
                        {hotel.location?.address?.line_one || hotel.accommodation?.location?.address?.line_one || ''}
                        {(hotel.location?.address?.line_one || hotel.accommodation?.location?.address?.line_one) && ', '}
                        {hotel.location?.address?.city_name || 
                         hotel.location?.address?.city ||
                         hotel.accommodation?.location?.address?.city_name || 
                         hotel.accommodation?.location?.address?.city || 
                         'Unknown City'}
                        {hotel.location?.address?.country_code || hotel.accommodation?.location?.address?.country_code 
                          ? `, ${hotel.location?.address?.country_code || hotel.accommodation?.location?.address?.country_code}` 
                          : ''}
                      </p>
                    </div>
                    
                    {/* Price Section */}
                    {(() => {
                      const amount = hotel.cheapest_rate_total_amount || 
                                   hotel.cheapest_rate_public_amount || 
                                   hotel.accommodation?.cheapest_rate_total_amount || 
                                   hotel.accommodation?.cheapest_rate_public_amount;
                      
                      if (!amount) return null;
                      
                      const currency = hotel.cheapest_rate_currency || 
                                     hotel.accommodation?.cheapest_rate_currency || 
                                     'USD';
                      
                      return (
                        <div className="mt-auto pt-4 border-t border-gray-100">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Starting from</p>
                              <div className="text-2xl font-bold text-orange-600">
                                {currency} {amount}
                              </div>
                              {hotel.check_in_date && hotel.check_out_date && (
                                <p className="text-xs text-gray-500 mt-1">
                                  for {calculateNights(hotel.check_in_date, hotel.check_out_date)}
                                </p>
                              )}
                            </div>
                            {hotel.expanded && (
                              <FiChevronDown className="text-orange-600 text-xl transform rotate-180 transition-transform" />
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Loading Details */}
                    {hotel.loading && hotel.expanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center py-3 text-orange-600">
                          <FiLoader className="animate-spin mr-2" />
                          <span className="text-sm">Loading details...</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Error State */}
                    {!hotel.loading && hotel.error && (
                      <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                        {hotel.error}
                      </div>
                    )}
                    
                    {/* Expanded Details */}
                    {hotel.expanded && hotel.details && !hotel.loading && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {hotel.details?.amenities?.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2 text-gray-900">Popular Amenities:</p>
                            <div className="flex flex-wrap gap-2">
                              {hotel.details.amenities.slice(0, 6).map((amenity: { type: string; description: string }, index: number) => (
                                <span key={index} className="text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 font-medium">
                                  {amenity.description || amenity.type}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <Link 
                          href={`/hotel/${hotel.search_result_id}:${hotel.accommodation_id}:${hotel.check_in_date}:${hotel.check_out_date}:${hotel.rooms}:${hotel.guests?.length || 1}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block w-full text-center px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                          View Details & Book <FiArrowRight className="inline ml-1" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={loadMoreHotels}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin text-xl" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      Load More Hotels
                      <FiChevronDown />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
        
        {/* No Results */}
        {!loading && !error && searchResults.length === 0 && (
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-2xl p-8 text-center shadow-lg">
            <div className="text-yellow-500 text-6xl mb-4">🏨</div>
            <p className="text-yellow-800 text-xl font-medium mb-2">No hotels found</p>
            <p className="text-yellow-700 mb-6">Try adjusting your search criteria or dates</p>
            <Link 
              href="/"
              className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Return to Search
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelSearchPage;