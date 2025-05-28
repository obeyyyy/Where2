'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTripCart } from '@/app/components/TripCartContext';
import Link from 'next/link';
import { 
  FiCheckCircle, 
  FiClock, 
  FiCalendar, 
  FiMapPin, 
  FiInfo, 
  FiAlertCircle, 
  FiDownload,
  FiUser,
  FiMail,
  FiPhone 
} from 'react-icons/fi';

interface BookingData {
  id: string;
  status: 'confirmed' | 'pending' | 'failed';
  createdAt: string;
  totalAmount: string;
  currency: string;
  passengers: Array<{
    id: string;
    type: 'adult' | 'child' | 'infant';
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }>;
  segments: Array<{
    id: string;
    origin: {
      iataCode: string;
      name: string;
      city: string;
      terminal?: string;
      at: string;
    };
    destination: {
      iataCode: string;
      name: string;
      city: string;
      terminal?: string;
      at: string;
    };
    carrierCode: string;
    number: string;
    duration: string;
    aircraft: {
      code: string;
      name?: string;
    };
    operating?: {
      carrierCode: string;
      number: string;
    };
  }>;
}

const formatDate = (dateString: string, includeTime = true) => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  
  const date = new Date(dateString);
  let formatted = date.toLocaleDateString('en-US', options);
  
  if (includeTime) {
    formatted += `, ${date.toLocaleTimeString('en-US', timeOptions)}`;
  }
  
  return formatted;
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trip } = useTripCart();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    const loadBooking = async () => {
      try {
        // Try to get from localStorage first
        const savedBooking = localStorage.getItem('lastBooking');
        
        if (savedBooking) {
          const parsedBooking = JSON.parse(savedBooking);
          setBooking(parsedBooking);
        } else if (trip) {
          // Fallback to trip data if no saved booking found
          const mockBooking: BookingData = {
            id: `W2-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            totalAmount: trip.trip.price.total,
            currency: trip.trip.price.currency,
            passengers: [
              {
                id: 'pax-1',
                type: 'adult',
                title: 'Mr',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890'
              }
            ],
            segments: trip.trip.itineraries.flatMap((itinerary: any, idx: number) => 
              itinerary.segments.map((segment: any) => ({
                id: segment.id,
                origin: {
                  iataCode: segment.departure.iataCode,
                  name: segment.departure.iataCode, // In a real app, this would be the airport name
                  city: segment.departure.iataCode, // In a real app, this would be the city name
                  terminal: segment.departure.terminal,
                  at: segment.departure.at
                },
                destination: {
                  iataCode: segment.arrival.iataCode,
                  name: segment.arrival.iataCode, // In a real app, this would be the airport name
                  city: segment.arrival.iataCode, // In a real app, this would be the city name
                  terminal: segment.arrival.terminal,
                  at: segment.arrival.at
                },
                carrierCode: segment.carrierCode,
                number: segment.number,
                duration: itinerary.duration,
                aircraft: {
                  code: segment.aircraft?.code || 'N/A',
                  name: segment.aircraft?.name
                },
                operating: segment.operating
              }))
            )
          };
          setBooking(mockBooking);
        } else {
          throw new Error('No booking found');
        }
      } catch (err) {
        console.error('Error loading booking:', err);
        setError(err instanceof Error ? err.message : 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
    
    // Clean up trip from cart
    localStorage.removeItem('current_booking_offer');
  }, [trip, bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 flex items-start">
          <FiAlertCircle className="w-6 h-6 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading booking</p>
            <p>{error || 'No booking found. Please check your booking reference or contact support.'}</p>
          </div>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/search"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
          >
            Search Flights
          </Link>
          <Link
            href="/contact"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition duration-200"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheckCircle className="w-14 h-14 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Booking Confirmed!</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Thank you for booking with us. Your flight has been successfully booked and a confirmation email has been sent to your registered email address.
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-100">Booking Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Booking Reference</h3>
            <p className="text-xl font-mono font-bold text-gray-900">{booking.id}</p>
            <p className="text-sm text-gray-500 mt-1">Booked on {formatDate(booking.createdAt)}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Total Amount</h3>
            <p className="text-2xl font-bold text-gray-900">
              {booking.currency} {booking.totalAmount}
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Status</h3>
            <div className="flex items-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                booking.status === 'confirmed' 
                  ? 'bg-green-100 text-green-800' 
                  : booking.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {booking.status === 'confirmed' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    Confirmed
                  </>
                ) : booking.status === 'pending' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                    Pending
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                    Failed
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Flight Itinerary */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Itinerary</h3>
          
          <div className="space-y-8">
            {booking.segments.map((segment, index) => (
              <div key={segment.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">
                      {index === 0 ? 'Outbound Flight' : 'Return Flight'}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {formatDate(segment.origin.at, false)}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-4">
                      <FiMapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">
                            {segment.origin.iataCode}
                          </p>
                          <p className="text-sm text-gray-500">
                            {segment.origin.city}
                            {segment.origin.terminal && ` • Terminal ${segment.origin.terminal}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatDate(segment.origin.at, true).split(', ')[1]}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(segment.origin.at, false).split(', ')[0]}
                          </p>
                        </div>
                      </div>
                      
                      <div className="my-4 flex items-center">
                        <div className="border-t border-gray-200 flex-1"></div>
                        <div className="mx-2 text-xs text-gray-500 flex items-center">
                          <FiClock className="w-3 h-3 mr-1" />
                          {segment.duration}
                        </div>
                        <div className="border-t border-gray-200 flex-1"></div>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">
                            {segment.destination.iataCode}
                          </p>
                          <p className="text-sm text-gray-500">
                            {segment.destination.city}
                            {segment.destination.terminal && ` • Terminal ${segment.destination.terminal}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatDate(segment.destination.at, true).split(', ')[1]}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(segment.destination.at, false).split(', ')[0]}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center text-sm text-gray-500">
                          <FiInfo className="w-4 h-4 mr-2 text-gray-400" />
                          <span>
                            {segment.operating 
                              ? `Operated by ${segment.operating.carrierCode} ${segment.operating.number}`
                              : `Flight ${segment.carrierCode} ${segment.number}`}
                            {segment.aircraft.name && ` • ${segment.aircraft.name} (${segment.aircraft.code})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Passenger Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-100">Passenger Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {booking.passengers.map((passenger) => (
            <div key={passenger.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="bg-blue-50 p-2 rounded-lg mr-4">
                  <FiUser className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {passenger.title} {passenger.firstName} {passenger.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {passenger.type.charAt(0).toUpperCase() + passenger.type.slice(1)} Passenger
                  </p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="flex items-center text-gray-600">
                      <FiMail className="w-4 h-4 mr-2 text-gray-400" />
                      {passenger.email}
                    </p>
                    <p className="flex items-center text-gray-600">
                      <FiPhone className="w-4 h-4 mr-2 text-gray-400" />
                      {passenger.phone}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <FiDownload className="w-5 h-5 mr-2" />
          Download E-Ticket
        </button>
        <Link
          href="/search"
          className="flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition-colors"
        >
          Book Another Flight
        </Link>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Need help?{' '}
          <a href="/contact" className="text-orange-500 hover:underline">
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  );
}

// Default export for Next.js page
export default function ConfirmationPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ConfirmationContent />
    </Suspense>
  );
}
