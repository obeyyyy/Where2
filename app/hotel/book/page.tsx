"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiCalendar, FiMapPin, FiUsers, FiCreditCard, FiLoader, FiCheck } from 'react-icons/fi';

interface GuestInfo {
  firstName: string;
  lastName: string;
  birthDate: string;
}

interface BookingFormData {
  email: string;
  phoneNumber: string;
  guests: GuestInfo[];
  specialRequests: string;
  termsAccepted: boolean;
}

interface QuoteData {
  id: string;
  accommodation: {
    name: string;
    photos?: any[];
    location: {
      address: {
        city_name: string;
        country_code: string;
      }
    };
  };
  check_in_date: string;
  check_out_date: string;
  total_amount: string;
  total_currency: string;
  rooms: number;
  guests: { type: string }[];
}

const HotelBookingPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteData>();
  
  const rateId = searchParams?.get('rateId') || '';
  const guestCount = parseInt(searchParams?.get('guests') || '1', 10);
  
  const [formData, setFormData] = useState<BookingFormData>({
    email: '',
    phoneNumber: '',
    guests: Array(guestCount).fill(null).map(() => ({
      firstName: '',
      lastName: '',
      birthDate: ''
    })),
    specialRequests: '',
    termsAccepted: false
  });

  // Fetch quote on page load
  useEffect(() => {
    const fetchQuote = async () => {
      if (!rateId) {
        setError('Missing rate ID. Please go back and select a room again.');
        setLoading(false);
        return;
      }

      try {
        setQuoteLoading(true);
        const response = await fetch(`/api/duffel/quotes?rateId=${rateId}`, {
          cache: 'no-store' // Ensure we don't get a cached response
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          if (errorData.code === 'RATE_EXPIRED') {
            // If the rate has expired, redirect back to the hotel page
            router.push(`/hotel/${searchParams?.get('hotelId') || ''}?error=rate_expired`);
            return;
          }
          
          throw new Error(errorData.error || 'Failed to fetch room details');
        }
        
        const data = await response.json();
        
        if (!data) {
          throw new Error('No room data received');
        }
        
        setQuote(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching quote');
        console.error('Error fetching quote:', err);
      } finally {
        setQuoteLoading(false);
        setLoading(false);
      }
    };

    fetchQuote();
  }, [rateId]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle guest info changes
  const handleGuestChange = (index: number, field: string, value: string) => {
    const updatedGuests = [...formData.guests];
    updatedGuests[index] = {
      ...updatedGuests[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      guests: updatedGuests
    }));
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
    if (!quote?.check_in_date || !quote?.check_out_date) return 0;
    
    const checkInDate = new Date(quote.check_in_date);
    const checkOutDate = new Date(quote.check_out_date);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Validate form
  const validateForm = () => {
    // Check email
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Check phone number
    if (!formData.phoneNumber || formData.phoneNumber.length < 6) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    // Check guest info
    for (let i = 0; i < formData.guests.length; i++) {
      const guest = formData.guests[i];
      if (!guest.firstName || !guest.lastName || !guest.birthDate) {
        setError(`Please complete all fields for Guest ${i + 1}`);
        return false;
      }
    }
    
    // Check terms
    if (!formData.termsAccepted) {
      setError('Please accept the terms and conditions');
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!quote?.id) {
      setError('Quote information is missing');
      return;
    }
    
    try {
      setBookingLoading(true);
      setError(null);
      
      const response = await fetch('/api/hotel-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: quote.id,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          guests: formData.guests,
          specialRequests: formData.specialRequests
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const data = await response.json();
      
      if (data.success && data.booking) {
        // Save booking data to session storage for confirmation page
        sessionStorage.setItem('hotelBooking', JSON.stringify(data.booking));
        
        // Redirect to confirmation page
        router.push(`/hotel/confirmation?bookingId=${data.booking.id}`);
      } else {
        setError('Could not create booking');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating booking');
      console.error('Error creating booking:', err);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <Link 
            href={`/hotel/${rateId.split('_')[0]}`}
            className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
          >
            <FiArrowLeft /> Back to hotel details
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Complete Your Booking</h1>
        
        {loading || quoteLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FiLoader className="animate-spin text-4xl text-orange-500 mb-4" />
            <p className="text-gray-600">Loading booking details...</p>
          </div>
        ) : error && !quote ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Link 
              href="/hotel/search"
              className="mt-4 inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Return to Search Results
            </Link>
          </div>
        ) : quote ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Booking form */}
            <div className="lg:w-2/3">
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {error}
                  </div>
                )}
                
                {/* Contact Information */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address*
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number*
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Guest Information */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Guest Information</h2>
                  {formData.guests.map((guest, index) => (
                    <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                      <h3 className="font-medium mb-3">Guest {index + 1}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name*
                          </label>
                          <input
                            type="text"
                            value={guest.firstName}
                            onChange={(e) => handleGuestChange(index, 'firstName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name*
                          </label>
                          <input
                            type="text"
                            value={guest.lastName}
                            onChange={(e) => handleGuestChange(index, 'lastName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth*
                          </label>
                          <input
                            type="date"
                            value={guest.birthDate}
                            onChange={(e) => handleGuestChange(index, 'birthDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Special Requests */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Special Requests</h2>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 h-32"
                    placeholder="Any special requests for your stay? (optional)"
                  />
                </div>
                
                {/* Terms and Conditions */}
                <div className="mb-8">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={formData.termsAccepted}
                      onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                      className="mt-1 mr-2"
                      required
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700">
                      I agree to the <a href="#" className="text-orange-600 hover:underline">Terms and Conditions</a> and <a href="#" className="text-orange-600 hover:underline">Privacy Policy</a>
                    </label>
                  </div>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                    bookingLoading ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'
                  } transition flex items-center justify-center gap-2`}
                >
                  {bookingLoading ? (
                    <>
                      <FiLoader className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Booking
                      <FiCreditCard />
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Booking Summary */}
            <div className="lg:w-1/3">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 className="text-xl font-bold mb-4">Booking Summary</h2>
                
                {/* Hotel Info */}
                <div className="mb-4">
                  {quote.accommodation.photos && quote.accommodation.photos.length > 0 && (
                    <img 
                      src={quote.accommodation.photos[0].url} 
                      alt={quote.accommodation.name}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="font-bold text-lg">{quote.accommodation.name}</h3>
                  <p className="text-gray-600 flex items-center gap-1 mb-2">
                    <FiMapPin className="text-orange-500" />
                    {quote.accommodation.location.address.city_name}, {quote.accommodation.location.address.country_code}
                  </p>
                </div>
                
                {/* Stay Details */}
                <div className="border-t border-b border-gray-200 py-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiCalendar className="text-orange-500" />
                    <div>
                      <p className="font-medium">Check-in</p>
                      <p>{formatDate(quote.check_in_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <FiCalendar className="text-orange-500" />
                    <div>
                      <p className="font-medium">Check-out</p>
                      <p>{formatDate(quote.check_out_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUsers className="text-orange-500" />
                    <div>
                      <p className="font-medium">Guests</p>
                      <p>{quote.guests.length} Guest{quote.guests.length > 1 ? 's' : ''}, {quote.rooms} Room{quote.rooms > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                
                {/* Price Summary */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p>Price for {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}</p>
                    <p>{quote.total_currency} {quote.total_amount}</p>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t border-gray-200">
                    <p>Total</p>
                    <p>{quote.total_currency} {quote.total_amount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HotelBookingPage;
