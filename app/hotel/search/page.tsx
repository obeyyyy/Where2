"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiMapPin, FiCalendar, FiUsers, FiStar, FiArrowRight, FiLoader } from 'react-icons/fi';

interface HotelSearchResult {
  id: string;
  accommodation: {
    id: string;
    name: string;
    description: string;
    photos: { url: string }[];
    rating?: number;
    review_score?: number;
    location: {
      address: {
        city_name: string;
        country_code: string;
        line_one: string;
      }
    };
    amenities: { type: string; description: string }[];
  };
  cheapest_rate_total_amount: string;
  cheapest_rate_currency: string;
  check_in_date: string;
  check_out_date: string;
  rooms: number;
  guests: { type: string; age?: number }[];
}

const HotelSearchPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<HotelSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Extract search parameters
  const destination = searchParams?.get('destination') || '';
  const checkIn = searchParams?.get('checkIn') || '';
  const checkOut = searchParams?.get('checkOut') || '';
  const rooms = searchParams?.get('rooms') || '1';
  const guests = searchParams?.get('guests') || '1';
  const roomType = searchParams?.get('type') || 'any';

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
          setSearchResults(data.results);
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

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search summary bar */}
      <div className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FiMapPin className="text-orange-500" />
              <span className="font-medium">{destination}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiCalendar className="text-orange-500" />
              <span>{formatDate(checkIn)} - {formatDate(checkOut)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiUsers className="text-orange-500" />
              <span>{guests} Guest{parseInt(guests) > 1 ? 's' : ''}, {rooms} Room{parseInt(rooms) > 1 ? 's' : ''}</span>
            </div>
            <Link 
              href="/"
              className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              Modify Search
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Hotels in {destination}</h1>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FiLoader className="animate-spin text-4xl text-orange-500 mb-4" />
            <p className="text-gray-600">Searching for the best hotels...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Link 
              href="/"
              className="mt-4 inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Return to Search
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((hotel) => (
              <div 
                key={hotel.id} 
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition"
              >
                {/* Hotel image */}
                <div className="relative h-48 overflow-hidden">
                  {hotel.accommodation.photos && hotel.accommodation.photos.length > 0 ? (
                    <img 
                      src={hotel.accommodation.photos[0].url} 
                      alt={hotel.accommodation.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No image available</span>
                    </div>
                  )}
                  {hotel.accommodation.rating && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-sm font-medium">
                      {hotel.accommodation.rating} <FiStar className="inline" />
                    </div>
                  )}
                </div>
                
                {/* Hotel details */}
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2 line-clamp-2">{hotel.accommodation.name}</h2>
                  <p className="text-gray-600 mb-2 flex items-center gap-1">
                    <FiMapPin className="text-orange-500" />
                    {hotel.accommodation.location.address.city_name}, {hotel.accommodation.location.address.country_code}
                  </p>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{hotel.accommodation.description}</p>
                  
                  {/* Amenities */}
                  {hotel.accommodation.amenities && hotel.accommodation.amenities.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Amenities:</p>
                      <div className="flex flex-wrap gap-1">
                        {hotel.accommodation.amenities.slice(0, 3).map((amenity, index) => (
                          <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {amenity.description}
                          </span>
                        ))}
                        {hotel.accommodation.amenities.length > 3 && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            +{hotel.accommodation.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Price and CTA */}
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="text-2xl font-bold text-orange-600">
                        {hotel.cheapest_rate_currency} {hotel.cheapest_rate_total_amount}
                      </p>
                      <p className="text-xs text-gray-500">Total for stay</p>
                    </div>
                    <Link 
                      href={`/hotel/${hotel.id}`}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-1"
                    >
                      View Rooms <FiArrowRight />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* No results message */}
        {!loading && !error && searchResults.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">No hotels found matching your criteria. Please try a different search.</p>
            <Link 
              href="/"
              className="mt-4 inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
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
