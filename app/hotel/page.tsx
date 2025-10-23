"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiMapPin, FiCalendar, FiUsers, FiStar, FiLoader, FiSearch } from 'react-icons/fi';

interface HotelResult {
  id: string;
  name: string;
  description?: string;
  photos: { url: string }[];
  amenities?: string[];
  location: {
    address: {
      city_name: string;
      country_code: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      region?: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  rating?: number;
  review_score?: number;
  review_count?: number;
  star_rating?: number;
  price_range?: {
    min_amount: string;
    max_amount?: string;
    min_currency: string;
    is_mobile_exclusive?: boolean;
    is_member_deal?: boolean;
    is_free_cancellation?: boolean;
  };
  room_types?: Array<{
    name: string;
    max_occupancy: number;
    bed_configuration: string;
    amenities: string[];
  }>;
  distance_from_center?: {
    value: number;
    unit: string;
  };
  check_in?: {
    from: string;
    to: string;
  };
  check_out?: {
    from: string;
    to: string;
  };
  policies?: {
    check_in_instructions?: string;
    check_out_instructions?: string;
    cancellation_policy?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

const HotelPage: React.FC = () => {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [hotels, setHotels] = useState<HotelResult[]>([]);
    
    const destination = searchParams?.get('destination') || '';
    const checkIn = searchParams?.get('checkIn') || '';
    const checkOut = searchParams?.get('checkOut') || '';
    const rooms = searchParams?.get('rooms') || '1';
    const guests = searchParams?.get('guests') || '1';
    const type = searchParams?.get('type') || 'any';

    useEffect(() => {
        const fetchHotels = async () => {
            try {
                setLoading(true);
                
                // Default to London coordinates if no destination is provided
                const defaultLocation = '51.5071,-0.1416'; // London coordinates
                const locationParam = destination === 'null' || !destination ? defaultLocation : destination;
                
                // Ensure we have valid dates
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                
                const checkInParam = checkIn || today.toISOString().split('T')[0];
                const checkOutParam = checkOut || nextWeek.toISOString().split('T')[0];
                
                console.log('Search params:', {
                    location: locationParam,
                    checkInDate: checkInParam,
                    checkOutDate: checkOutParam,
                    rooms: parseInt(rooms, 10),
                    guests: parseInt(guests, 10)
                });
                
                const response = await fetch('/api/hotel-search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        location: locationParam,
                        checkInDate: checkInParam,
                        checkOutDate: checkOutParam,
                        rooms: parseInt(rooms, 10),
                        guests: parseInt(guests, 10)
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch hotels');
                }

                const data = await response.json();
                
                if (data.success && data.results) {
                    setHotels(data.results);
                } else {
                    setError('No hotels found');
                }
            } catch (err: any) {
                setError(err.message || 'An error occurred while searching for hotels');
                console.error('Error fetching hotels:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHotels();
    }, [destination, checkIn, checkOut, rooms, guests, type]);

    // Format price for display
    const formatPrice = (amount: string, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 0
        }).format(parseFloat(amount));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm py-4">
                <div className="container mx-auto px-4">
                    <Link 
                        href="/"
                        className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                    >
                        <FiArrowLeft /> Back to home
                    </Link>
                </div>
            </div>

            {/* Search Results */}
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Hotel Search Results</h1>
                
                {/* Search Summary */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-1">
                        <FiMapPin className="text-orange-500" />
                        <span className="font-medium">{destination || 'Any Location'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <FiCalendar className="text-orange-500" />
                        <span>{checkIn || 'Any Date'} - {checkOut || 'Any Date'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <FiUsers className="text-orange-500" />
                        <span>{guests} Guest{parseInt(guests, 10) !== 1 ? 's' : ''}, {rooms} Room{parseInt(rooms, 10) !== 1 ? 's' : ''}</span>
                    </div>
                    <Link 
                        href="/"
                        className="ml-auto flex items-center gap-1 text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-full transition-colors"
                    >
                        <FiSearch className="text-sm" /> Modify Search
                    </Link>
                </div>
                
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <FiLoader className="animate-spin text-4xl text-orange-500 mb-4" />
                        <p className="text-gray-600">Searching for hotels...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <p className="text-red-600">{error}</p>
                        <Link 
                            href="/"
                            className="mt-4 inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                        >
                            Try Another Search
                        </Link>
                    </div>
                ) : hotels.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {hotels.map((hotel) => {
                            // Construct proper URL with all required parameters
                            // Format: searchResultId:accommodationId:checkIn:checkOut:rooms:guests
                            const searchResultId = hotel.id || 'none';
                            const detailsUrl = `/hotel/${searchResultId}:${searchResultId}:${checkIn}:${checkOut}:${rooms}:${guests}`;
                            
                            return (
                            <Link 
                                key={hotel.id} 
                                href={detailsUrl}
                                className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-orange-100"
                            >
                                {/* Hotel Image */}
                                <div className="relative h-56 overflow-hidden">
                                    {hotel.photos && hotel.photos.length > 0 ? (
                                        <img 
                                            src={hotel.photos[0].url} 
                                            alt={hotel.name}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/hotel-placeholder.jpg';
                                                (e.target as HTMLImageElement).classList.add('object-contain', 'p-4');
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                            <span className="text-gray-400">No image available</span>
                                        </div>
                                    )}
                                    
                                    {/* Rating Badge */}
                                    {hotel.rating && (
                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-orange-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm border border-gray-100">
                                            <FiStar className="fill-yellow-400 text-yellow-400" />
                                            <span className="font-semibold">{hotel.rating.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Hotel Info */}
                                <div className="p-5">
                                    <h2 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1 group-hover:text-orange-600 transition-colors">
                                        {hotel.name || 'Unnamed Property'}
                                    </h2>
                                    
                                    {/* Location */}
                                    <div className="flex items-center text-gray-500 text-sm mb-3">
                                        <FiMapPin className="mr-1.5 flex-shrink-0" />
                                        <span className="truncate">
                                            {typeof hotel.location === 'object' && hotel.location !== null
                                                ? (
                                                    hotel.location.address?.city_name || 
                                                    hotel.location.address?.line1 || 
                                                    hotel.location.address?.region || 
                                                    'Location not specified'
                                                )
                                                : (hotel.location || 'Location not specified')}
                                            {typeof hotel.location === 'object' && 
                                             hotel.location?.address?.country_code && 
                                             `, ${hotel.location.address.country_code}`}
                                        </span>
                                    </div>
                                    
                                    {/* Hotel Details */}
                                    <div className="space-y-3 text-sm text-gray-600 mb-4">
                                        {/* Star Rating */}
                                        {hotel.star_rating && (
                                            <div className="flex items-center">
                                                <svg 
                                                    xmlns="http://www.w3.org/2000/svg" 
                                                    className="h-4 w-4 text-yellow-400 fill-current mr-1" 
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="font-medium">{hotel.star_rating} Star Hotel</span>
                                            </div>
                                        )}

                                        {/* Distance from center */}
                                        {hotel.distance_from_center && (
                                            <div className="flex items-center">
                                                <FiMapPin className="mr-1.5 flex-shrink-0" />
                                                <span>{hotel.distance_from_center.value} {hotel.distance_from_center.unit} from city center</span>
                                            </div>
                                        )}

                                        {/* Review Score */}
                                        {hotel.review_score && (
                                            <div className="flex items-center">
                                                <div className="flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                                    <span className="font-medium">{hotel.review_score}/10</span>
                                                    {hotel.review_count && (
                                                        <span className="ml-1 text-xs">({hotel.review_count} reviews)</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Top Amenities */}
                                        {hotel.amenities && Array.isArray(hotel.amenities) && hotel.amenities.length > 0 && (
                                            <div className="pt-2 border-t border-gray-100">
                                                <div className="flex flex-wrap gap-2">
                                                    {hotel.amenities.slice(0, 3).map((amenity, index) => {
                                                        // Handle case where amenity might be an object with a 'description' property
                                                        const amenityText = typeof amenity === 'object' && amenity !== null && 'description' in amenity 
                                                            ? (amenity as {description: string}).description 
                                                            : String(amenity);
                                                        
                                                        return (
                                                            <span key={index} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">
                                                                {amenityText}
                                                            </span>
                                                        );
                                                    })}
                                                    {hotel.amenities.length > 3 && (
                                                        <span className="text-xs text-gray-500">+{hotel.amenities.length - 3} more</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Price and Action */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                        {hotel.price_range ? (
                                            <div className="space-y-1">
                                                <div className="text-xs text-gray-500">Starting from</div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-bold text-orange-600">
                                                        {formatPrice(hotel.price_range.min_amount, hotel.price_range.min_currency)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">/night</span>
                                                </div>
                                                {hotel.price_range.is_free_cancellation && (
                                                    <div className="text-xs text-green-600 font-medium">
                                                        Free cancellation
                                                    </div>
                                                )}
                                                {hotel.price_range.is_member_deal && (
                                                    <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full inline-flex items-center">
                                                        <FiStar className="mr-1" size={10} /> Member Deal
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500">Price on request</div>
                                        )}
                                        
                                        <button 
                                            className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg font-medium hover:bg-orange-100 transition-colors text-sm"
                                            onClick={(e) => e.preventDefault()}
                                        >
                                            View Deal
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        )})}
                    </div>
                ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                        <p className="text-yellow-700">No hotels found matching your criteria.</p>
                        <Link 
                            href="/"
                            className="mt-4 inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                        >
                            Try Another Search
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HotelPage;