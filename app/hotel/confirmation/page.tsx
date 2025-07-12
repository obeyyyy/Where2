"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiCheck, FiCalendar, FiMapPin, FiUsers, FiMail, FiPhone, FiHome, FiArrowLeft } from 'react-icons/fi';

interface BookingData {
  id: string;
  booking_reference: string;
  status: string;
  accommodation: {
    name: string;
    photos: { url: string }[];
    location: {
      address: {
        city_name: string;
        country_code: string;
        line_one: string;
        postal_code?: string;
      }
    };
    key_collection?: {
      instructions: string;
    };
  };
  check_in_date: string;
  check_out_date: string;
  total_amount: string;
  total_currency: string;
  rooms: number;
  guests: {
    given_name: string;
    family_name: string;
    born_on: string;
  }[];
  email: string;
  phone_number: string;
  accommodation_special_requests?: string;
}

const HotelConfirmationPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = searchParams?.get('bookingId') || '';

  useEffect(() => {
    // Try to get booking data from session storage
    const storedBooking = sessionStorage.getItem('hotelBooking');
    
    if (storedBooking) {
      try {
        const parsedBooking = JSON.parse(storedBooking);
        setBooking(parsedBooking);
        setLoading(false);
      } catch (err) {
        console.error('Error parsing stored booking:', err);
        setError('Could not retrieve booking information');
        setLoading(false);
      }
    } else if (bookingId) {
      // If no stored booking but we have an ID, fetch from API
      fetchBooking(bookingId);
    } else {
      setError('No booking information available');
      setLoading(false);
    }
  }, [bookingId]);

  const fetchBooking = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hotel-booking/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }

      const data = await response.json();
      
      if (data.success && data.booking) {
        setBooking(data.booking);
      } else {
        setError('Could not retrieve booking information');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching booking');
      console.error('Error fetching booking:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate number of nights
  const calculateNights = () => {
    if (!booking?.check_in_date || !booking?.check_out_date) return 0;
    
    const checkInDate = new Date(booking.check_in_date);
    const checkOutDate = new Date(booking.check_out_date);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
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

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-600">Loading booking details...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Link 
              href="/"
              className="mt-4 inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Return to Home
            </Link>
          </div>
        ) : booking ? (
          <div className="max-w-4xl mx-auto">
            {/* Confirmation Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <FiCheck className="text-green-600 text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
                  <p className="text-gray-600">Your booking has been successfully confirmed.</p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Booking Reference</p>
                    <p className="font-bold">{booking.booking_reference}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-bold capitalize">{booking.status}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Booking Details */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              {/* Hotel Image */}
              {booking.accommodation.photos && booking.accommodation.photos.length > 0 && (
                <img 
                  src={booking.accommodation.photos[0].url} 
                  alt={booking.accommodation.name}
                  className="w-full h-64 object-cover"
                />
              )}
              
              {/* Hotel Info */}
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">{booking.accommodation.name}</h2>
                <p className="text-gray-600 flex items-center gap-1 mb-4">
                  <FiMapPin className="text-orange-500" />
                  {booking.accommodation.location.address.line_one}, {booking.accommodation.location.address.city_name}, {booking.accommodation.location.address.country_code}
                </p>
                
                {/* Stay Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="flex items-start gap-2">
                    <FiCalendar className="text-orange-500 mt-1" />
                    <div>
                      <p className="font-medium">Check-in</p>
                      <p>{formatDate(booking.check_in_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiCalendar className="text-orange-500 mt-1" />
                    <div>
                      <p className="font-medium">Check-out</p>
                      <p>{formatDate(booking.check_out_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiUsers className="text-orange-500 mt-1" />
                    <div>
                      <p className="font-medium">Guests</p>
                      <p>{booking.guests.length} Guest{booking.guests.length > 1 ? 's' : ''}, {booking.rooms} Room{booking.rooms > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                
                {/* Key Collection */}
                {booking.accommodation.key_collection && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <FiHome className="text-blue-600" />
                      Key Collection Instructions
                    </h3>
                    <p className="text-gray-700">{booking.accommodation.key_collection.instructions}</p>
                  </div>
                )}
                
                {/* Guest Information */}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-3">Guest Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <FiMail className="text-orange-500 mt-1" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p>{booking.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FiPhone className="text-orange-500 mt-1" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p>{booking.phone_number}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="font-medium mb-2">Guests</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {booking.guests.map((guest, index) => (
                        <div key={index} className="p-3 border border-gray-200 rounded-lg">
                          <p className="font-medium">Guest {index + 1}</p>
                          <p>{guest.given_name} {guest.family_name}</p>
                          <p className="text-sm text-gray-600">DOB: {formatDate(guest.born_on)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Special Requests */}
                {booking.accommodation_special_requests && (
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-2">Special Requests</h3>
                    <p className="text-gray-700">{booking.accommodation_special_requests}</p>
                  </div>
                )}
                
                {/* Price Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-bold text-lg mb-3">Price Summary</h3>
                  <div className="flex justify-between mb-2">
                    <p>Price for {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}</p>
                    <p>{booking.total_currency} {booking.total_amount}</p>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t border-gray-200">
                    <p>Total</p>
                    <p>{booking.total_currency} {booking.total_amount}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Link 
                href="/"
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              >
                Return to Home
              </Link>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Print Confirmation
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HotelConfirmationPage;
