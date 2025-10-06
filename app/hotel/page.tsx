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
  location: {
    address: {
      city_name: string;
      country_code: string;
    }
  };
  rating?: number;
  price_range?: {
    min_amount: string;
    min_currency: string;
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
                        {hotels.map((hotel) => (
                            <Link 
                                key={hotel.id} 
                                href={`/hotel/${hotel.id}`}
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {/* Hotel Image */}
                                <div className="relative h-48 overflow-hidden">
                                    {hotel.photos && hotel.photos.length > 0 ? (
                                        <img 
                                            src={hotel.photos[0].url} 
                                            alt={hotel.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-gray-400">No image available</span>
                                        </div>
                                    )}
                                    
                                    {/* Rating Badge */}
                                    {hotel.rating && (
                                        <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-md flex items-center gap-1">
                                            <FiStar className="text-yellow-300" />
                                            <span>{hotel.rating}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Hotel Info */}
                                <div className="p-4">
                                    <h2 className="font-bold text-lg mb-1">{hotel.name}</h2>
                                    
                                    
                                    {/* Price */}
                                    {hotel.price_range && (
                                        <div className="mt-2 flex justify-between items-center">
                                            <span className="text-gray-600">From</span>
                                            <span className="font-bold text-lg text-orange-600">
                                                {formatPrice(hotel.price_range.min_amount, hotel.price_range.min_currency)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
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