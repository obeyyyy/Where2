'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loading from '../loading';
import dynamic from 'next/dynamic';
import { 
  FiCheckCircle, 
  FiClock, 
  FiAlertTriangle, 
  FiUser, 
  FiMail,
  FiPhone,
  FiMapPin,
  FiArrowRight,
  FiCalendar,
  FiGlobe,
  FiInfo,
  FiCreditCard,
  FiBriefcase,
  FiClock as FiClockIcon,
  FiCoffee,
  FiWifi,
  FiFilm,
  FiZap,
  FiDroplet,
  FiDollarSign,
  FiX,
  FiCheck
} from 'react-icons/fi';

const AnimatedStepCharacter = dynamic(
  () => import('@/app/components/AnimatedStepCharacter'),
  { ssr: false }
);

type BookingStatus = 'pending' | 'confirmed' | 'failed' | 'succeeded';

interface PassengerInfo {
  id: string;
  type?: 'adult' | 'child' | 'infant';
  title?: string;
  given_name: string;
  family_name: string;
  email?: string;
  phone_number?: string;
  born_on?: string;
  gender?: 'm' | 'f' | 'x' | 'u';
  identity_documents?: Array<{
    type: string;
    unique_identifier: string;
    expires_on: string;
    issuing_country_code: string;
    nationality: string;
  }>;
  loyalty_programme_accounts?: Array<{
    account_number: string;
    airline_iata_code: string;
  }>;
  infant_passenger_id?: string | null;
  user_id?: string | null;
}

interface Segment {
  id: string;
  origin: {
    iata_code: string;
    name: string;
    city_name?: string;
    terminal?: string;
    type?: string;
    time_zone?: string;
  };
  destination: {
    iata_code: string;
    name: string;
    city_name?: string;
    terminal?: string;
    type?: string;
    time_zone?: string;
  };
  segments: Array<{
    id: string;
    origin: {
      iata_code: string;
      name: string;
      city_name?: string;
      terminal?: string;
    };
    destination: {
      iata_code: string;
      name: string;
      city_name?: string;
      terminal?: string;
    };
    departing_at: string;
    arriving_at: string;
    duration: string;
    marketing_carrier: {
      iata_code: string;
      name: string;
    };
    operating_carrier?: {
      iata_code: string;
      name: string;
    };
    marketing_carrier_flight_number: string;
    operating_carrier_flight_number?: string;
    aircraft?: {
      name: string;
    };
    passengers: Array<{
      passenger_id: string;
      cabin_class: string;
      cabin_class_marketing_name?: string;
      baggages?: Array<{
        type: string;
        quantity: number;
      }>;
    }>;
  }>;
  duration: string;
  conditions?: {
    change_before_departure?: {
      allowed: boolean;
      penalty_amount?: string;
      penalty_currency?: string;
    };
    refund_before_departure?: {
      allowed: boolean;
    };
  };
}

interface PaymentInfo {
  status: string;
  amount: number | string;
  currency: string;
  paymentMethod: string;
  lastFour?: string;
  timestamp: string;
  paymentIntentId?: string;
}

interface BookingData {
  id?: string;
  bookingId?: string;
  bookingReference?: string;
  status: BookingStatus;
  createdAt?: string;
  totalAmount?: string | number;
  amount?: string | number;
  currency?: string;
  payment?: PaymentInfo;
  passengers?: PassengerInfo[];
  segments?: Segment[];
  order?: any;
  trip?: any;
  metadata?: Record<string, any>;
}

const formatCurrency = (amount?: number | string, currency: string = 'EUR') => {
  if (amount === undefined || amount === null) return 'N/A';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return 'Invalid date';
  }
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Wrapper component to handle Suspense for useSearchParams
export default function ConfirmationPageWrapper() {
  return (
    <Suspense fallback={<Loading />}>
      <ConfirmationPage />
    </Suspense>
  );
}

function ConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookingData = async () => {
      try {
        const bookingId = searchParams.get('bookingId');
        const orderId = searchParams.get('orderId');
        const paymentIntentId = searchParams.get('payment_intent');
        const status = (searchParams.get('status') as BookingStatus) || 'pending';
        
        // Try to load from localStorage first
        const storedBooking = localStorage.getItem('lastBooking');
        
        if (storedBooking) {
          try {
            const parsedData = JSON.parse(storedBooking);
            
            // If URL has an orderId, verify it matches the stored one
            if (!orderId || parsedData.order?.id === orderId || parsedData.id === orderId) {
              await processBookingData(parsedData, status);
              return;
            }
          } catch (e) {
            console.error('Error parsing stored booking:', e);
          }
        }


        // If we have an orderId in URL but no matching localStorage data
        if (orderId) {
          try {
            // Fetch order details from your API
            const response = await fetch(`/api/orders/${orderId}`);
            if (response.ok) {
              const orderData = await response.json();
              await processBookingData(orderData, status);
              return;
            }
          } catch (err) {
            console.error('Error fetching order details:', err);
          }
          setError('Could not load booking details. Please check your email for confirmation.');
        } else if (paymentIntentId) {
          try {
            // Try to find booking by payment intent ID
            const response = await fetch(`/api/payments/${paymentIntentId}/order`);
            if (response.ok) {
              const orderData = await response.json();
              await processBookingData(orderData, status);
              return;
            }
          } catch (err) {
            console.error('Error fetching order by payment intent:', err);
          }
        }
        
        setError('No booking information found. Please check your email for confirmation or contact support.');
        setLoading(false);
      } catch (err) {
        console.error('Error loading booking data:', err);
        setError('Failed to load booking information. Please try again later.');
        setLoading(false);
      }
    };

    const processBookingData = async (data: any, status: BookingStatus) => {
      const order = data.data || data.order || data;
      const slices = order.slices || [];
      
      // Format passengers
      const passengers = (order.passengers || []).map((p: any) => ({
        id: p.id,
        type: p.type || 'adult',
        title: p.title,
        given_name: p.given_name,
        family_name: p.family_name,
        email: p.email,
        phone_number: p.phone_number,
        born_on: p.born_on,
        gender: p.gender,
        identity_documents: p.identity_documents,
        infant_passenger_id: p.infant_passenger_id,
        loyalty_programme_accounts: p.loyalty_programme_accounts
      }));
      
      // Format segments
      const segments = slices.map((slice: any) => ({
        ...slice,
        segments: (slice.segments || []).map((s: any) => ({
          ...s,
          origin: {
            iata_code: s.origin.iata_code,
            name: s.origin.name,
            city_name: s.origin.city_name,
            terminal: s.origin.terminal,
            type: s.origin.type,
            time_zone: s.origin.time_zone
          },
          destination: {
            iata_code: s.destination.iata_code,
            name: s.destination.name,
            city_name: s.destination.city_name,
            terminal: s.destination.terminal,
            type: s.destination.type,
            time_zone: s.destination.time_zone
          },
          marketing_carrier: s.marketing_carrier && {
            iata_code: s.marketing_carrier.iata_code,
            name: s.marketing_carrier.name
          },
          operating_carrier: s.operating_carrier && {
            iata_code: s.operating_carrier.iata_code,
            name: s.operating_carrier.name
          }
        }))
      }));
      
      // Format payment info
      const payment = {
        status: order.payment_status?.paid_at ? 'succeeded' : 'pending',
        amount: order.total_amount,
        currency: order.total_currency,
        paymentMethod: 'card', // Default, can be overridden
        paymentIntentId: order.metadata?.payment_intent_id,
        timestamp: order.payment_status?.paid_at || order.created_at
      };
      
      const bookingData = {
        id: order.id,
        bookingId: order.id,
        bookingReference: order.booking_reference || order.id,
        status: order.payment_status?.paid_at ? 'succeeded' : status,
        createdAt: order.created_at,
        totalAmount: order.total_amount,
        amount: order.total_amount,
        currency: order.total_currency,
        payment,
        passengers,
        segments,
        order,
        metadata: order.metadata || {}
      };
      
      console.log('Processed booking data:', bookingData);
      setBooking(bookingData);
      setLoading(false);
    };

    loadBookingData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find any booking information. Please check your email for confirmation or contact support.</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Format payment amount with currency
  const formatAmount = (amount: string | number, currencyCode: string = 'EUR') => {
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountNum || 0);
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get flight segments from booking data
  const flightSegments = booking.segments || [];

  return (
    <div className="min-h-screen bg-[#FFFDF6] py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Animation */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="w-full max-w-xs mx-auto -mt-8 mb-2 sm:mb-4">
            {booking.status === 'succeeded' || booking.status === 'confirmed' ? (
              <div className="w-full h-auto">
                <AnimatedStepCharacter 
                  lottieUrl="https://lottie.host/42f2651e-8c16-434e-b639-1cb75fcf19a3/r95IiVu0pY.json"
                  alt="Booking Confirmed"
                  className="w-full h-auto max-h-64 sm:max-h-50"
                />
              </div>
            ) : booking.status === 'pending' ? (
              <div className="w-24 h-24 mx-auto text-yellow-500">
                <FiClock className="w-full h-full animate-pulse" />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto text-red-500">
                <FiAlertTriangle className="w-full h-full" />
              </div>
            )}
          </div>
          <div className="px-4 sm:px-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {booking.status === 'succeeded' || booking.status === 'confirmed' 
                ? 'Booking Confirmed! 🎉'
                : booking.status === 'pending'
                  ? 'Payment Processing'
                  : 'Booking Issue'}
            </h1>
            <div className="space-y-2">
              <div className="space-y-2">
                <p className="text-gray-600 text-base sm:text-lg">
                  Order #: <span className="font-mono font-bold text-gray-900">{booking.bookingId || booking.id}</span>
                </p>
                {booking.bookingReference && booking.bookingReference !== (booking.bookingId || booking.id) && (
                  <p className="text-sm text-gray-500">
                    Booking Ref: {booking.bookingReference}
                  </p>
                )}
                {booking.status === 'succeeded' && booking.payment?.paymentIntentId && (
                  <p className="text-xs text-gray-500 font-mono">
                    Payment ID: {booking.payment.paymentIntentId}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Booking Summary</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Booking Reference</h3>
                <p className="text-gray-900 font-mono">{booking.bookingReference}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  booking.status === 'confirmed' || booking.status === 'succeeded' 
                    ? 'bg-green-100 text-green-800' 
                    : booking.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Booking Date</h3>
                <p className="text-gray-900">
                  {booking.createdAt ? formatDateTime(booking.createdAt) : 'N/A'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Amount</h3>
                <p className="text-gray-900 font-medium text-lg">
                  {formatAmount(booking.totalAmount || booking.amount || 0, booking.currency)}
                </p>
              </div>
            </div>

            {/* Payment Details */}
            {booking.payment && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-md font-medium text-gray-900 mb-4">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <p className="font-medium">
                      {booking.payment.status === 'succeeded' ? 'Paid' : booking.payment.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">
                      {booking.payment.paymentMethod === 'card' ? 'Credit/Debit Card' : booking.payment.paymentMethod}
                      {booking.payment.lastFour && (
                        <span className="ml-2 text-gray-500">•••• {booking.payment.lastFour}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount Paid</p>
                    <p className="font-medium">
                      {formatAmount(booking.payment.amount || 0, booking.payment.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Paid On</p>
                    <p className="font-medium">
                      {booking.payment.timestamp ? formatDateTime(booking.payment.timestamp) : 'N/A'}
                    </p>
                  </div>
                  {booking.payment.paymentIntentId && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Payment ID</p>
                      <p className="font-mono text-sm text-gray-600 break-all">
                        {booking.payment.paymentIntentId}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Flight Details */}
        {flightSegments.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Flight Details</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {flightSegments.flatMap((slice: any, sliceIndex: number) => 
                (slice.segments || []).map((segment: any, segmentIndex: number) => (
                  <div key={`segment-${sliceIndex}-${segmentIndex}`} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-xl font-bold text-gray-900">
                            {segment.origin?.iata_code}
                          </div>
                          <FiArrowRight className="text-gray-400" />
                          <div className="text-xl font-bold text-gray-900">
                            {segment.destination?.iata_code}
                          </div>
                          <span className="ml-2 text-sm text-gray-500">
                            {segment.marketing_carrier?.iata_code}{segment.marketing_carrier_flight_number}
                          </span>
                        </div>
                        
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-500 mb-1">Departure</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatDateTime(segment.departing_at)}
                            </p>
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-900">
                                {segment.origin?.iata_code} • {segment.origin?.name}
                              </p>
                              {segment.origin?.terminal && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Terminal {segment.origin.terminal}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                {segment.origin?.city_name}
                              </p>
                            </div>
                          </div>
                      
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative w-full">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t-2 border-dashed border-gray-300"></div>
                              </div>
                              <div className="relative flex justify-center">
                                <span className="bg-white px-3 text-sm text-gray-500">
                                  {segment.duration || '--:--'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-center">
                              <p className="text-xs text-gray-500">
                                {segment.marketing_carrier?.iata_code}{segment.marketing_carrier_flight_number}
                              </p>
                              {segment.aircraft?.name && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {segment.aircraft.name}
                                </p>
                              )}
                            </div>
                          </div>
                      
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-500 mb-1">Arrival</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatDateTime(segment.arriving_at)}
                            </p>
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-900">
                                {segment.destination?.iata_code} • {segment.destination?.name}
                              </p>
                              {segment.destination?.terminal && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Terminal {segment.destination.terminal}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                {segment.destination?.city_name}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {segment.operating_carrier && 
                         segment.operating_carrier.iata_code !== segment.marketing_carrier?.iata_code && (
                          <div className="mt-2 text-xs text-gray-500">
                            Operated by {segment.operating_carrier.name} ({segment.operating_carrier.iata_code})
                          </div>
                        )}
                        
                        {/* Passenger and Amenities Section */}
                        <div className="col-span-full mt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Passenger Cabin Class */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                                <FiUser className="mr-2" /> Passenger Cabin Class
                              </h4>
                              <div className="space-y-3">
                                {segment.passengers?.map((p: any, i: number) => {
                                  const passenger = booking.passengers?.find((psg: any) => psg.id === p.passenger_id);
                                  const cabinClass = p.cabin_class_marketing_name || 
                                                    p.cabin_class?.split('_')
                                                      .map((word: string) => 
                                                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                                      ).join(' ') || 'Economy';
                                  
                                  return (
                                    <div key={`passenger-${i}`} className="text-sm">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="font-medium text-gray-900">
                                            {passenger?.given_name} {passenger?.family_name}
                                          </span>
                                          <span className="ml-2 px-2 py-0.5 bg-white text-xs text-blue-700 rounded-full">
                                            {cabinClass}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Baggage Information */}
                                      {p.baggages?.some((b: any) => b.quantity > 0) && (
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                          {p.baggages
                                            .filter((b: any) => b.quantity > 0)
                                            .map((b: any, idx: number) => {
                                              const baggageType = b.type
                                                .split('_')
                                                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                                .join(' ');
                                              
                                              return (
                                                <span 
                                                  key={`baggage-${idx}`}
                                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-blue-700 border border-blue-200"
                                                >
                                                  <FiBriefcase className="mr-1 h-3 w-3" />
                                                  {b.quantity}x {baggageType}
                                                </span>
                                              );
                                            })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Flight Amenities */}
                            <div className="bg-green-50 p-4 rounded-lg">
                              <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center">
                                <FiZap className="mr-2" /> Flight Amenities
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center">
                                  <div className="p-1.5 bg-green-100 rounded-full mr-2 text-green-600">
                                    <FiCoffee className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm text-gray-700">Meal Service</span>
                                </div>
                                <div className="flex items-center">
                                  <div className="p-1.5 bg-green-100 rounded-full mr-2 text-green-600">
                                    <FiWifi className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm text-gray-700">WiFi Available</span>
                                </div>
                                <div className="flex items-center">
                                  <div className="p-1.5 bg-green-100 rounded-full mr-2 text-green-600">
                                    <FiFilm className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm text-gray-700">Entertainment</span>
                                </div>
                                <div className="flex items-center">
                                  <div className="p-1.5 bg-green-100 rounded-full mr-2 text-green-600">
                                    <FiDroplet className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm text-gray-700">Beverages</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Show change/cancellation policy */}
            {flightSegments.some((s: any) => {
              const change = s.conditions?.change_before_departure;
              const refund = s.conditions?.refund_before_departure;
              return (change && change.allowed) || (refund && refund.allowed);
            }) && (
              <div className="bg-blue-50 px-6 py-4 border-t border-blue-100">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Change & Cancellation Policy</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  {(() => {
                    interface Policy {
                      allowed: boolean;
                      penalty_amount?: string;
                      penalty_currency?: string;
                    }
                    
                    const changePolicy = flightSegments.find((s: any) => 
                      s.conditions?.change_before_departure?.allowed
                    )?.conditions?.change_before_departure as Policy | undefined;
                    
                    if (changePolicy) {
                      const hasFee = changePolicy.penalty_amount && changePolicy.penalty_amount !== '0';
                      return (
                        <li key="change-policy" className="flex items-start">
                          <FiInfo className="h-4 w-4 text-blue-500 mr-1.5 mt-0.5 flex-shrink-0" />
                          <span>
                            Changes allowed{
                              hasFee
                                ? ` with a fee of ${changePolicy.penalty_amount} ${changePolicy.penalty_currency || ''}`
                                : ' free of charge'
                            }
                          </span>
                        </li>
                      );
                    }
                    return null;
                  })()}
                  
                  {(() => {
                    interface Policy {
                      allowed: boolean;
                      penalty_amount?: string;
                      penalty_currency?: string;
                    }
                    
                    const refundPolicy = flightSegments.find((s: any) => 
                      s.conditions?.refund_before_departure?.allowed
                    )?.conditions?.refund_before_departure as Policy | undefined;
                    
                    if (refundPolicy) {
                      const hasFee = refundPolicy.penalty_amount && refundPolicy.penalty_amount !== '0';
                      return (
                        <li key="refund-policy" className="flex items-start">
                          <FiInfo className="h-4 w-4 text-blue-500 mr-1.5 mt-0.5 flex-shrink-0" />
                          <span>
                            Refunds allowed{
                              hasFee
                                ? ` with a fee of ${refundPolicy.penalty_amount} ${refundPolicy.penalty_currency || ''}`
                                : ' free of charge'
                            }
                          </span>
                        </li>
                      );
                    }
                    return null;
                  })()}
                </ul>
              </div>
            )}
            
            {/* Total Price */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total Price</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatAmount(booking.totalAmount || 0, booking.currency || 'EUR')}
                </span>
              </div>
              {booking.payment?.status === 'succeeded' && booking.payment?.timestamp && (
                <div className="mt-1 text-right text-sm text-gray-500">
                  Paid on {formatDateTime(booking.payment.timestamp)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Passenger Information */}
        {booking.passengers && booking.passengers.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Passenger Information</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {booking.passengers.map((passenger: any, index: number) => (
                <div key={`passenger-${index}`} className="p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <FiUser className="h-5 w-5" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                          {passenger.firstName} {passenger.lastName}
                        </h3>
                        <span className="mt-1 sm:mt-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {passenger.type === 'adult' ? 'Adult' : passenger.type === 'child' ? 'Child' : 'Infant'}
                        </span>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {passenger.email && (
                          <div className="flex items-start">
                            <FiMail className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Email</p>
                              <p className="text-sm font-medium text-gray-900">{passenger.email}</p>
                            </div>
                          </div>
                        )}
                        
                        {passenger.phone && (
                          <div className="flex items-start">
                            <FiPhone className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Phone</p>
                              <p className="text-sm font-medium text-gray-900">{passenger.phone}</p>
                            </div>
                          </div>
                        )}
                        
                        {passenger.dateOfBirth && (
                          <div className="flex items-start">
                            <FiCalendar className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Date of Birth</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(passenger.dateOfBirth).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {passenger.documentNumber && (
                          <div className="flex items-start">
                            <FiCreditCard className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Passport</p>
                              <p className="text-sm font-medium text-gray-900">
                                {passenger.documentNumber}
                                {passenger.documentIssuingCountryCode && (
                                  <span className="ml-2 text-gray-500">
                                    ({passenger.documentIssuingCountryCode})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {passenger.documentNationality && (
                          <div className="flex items-start">
                            <FiGlobe className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Nationality</p>
                              <p className="text-sm font-medium text-gray-900">
                                {passenger.documentNationality}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {passenger.gender && (
                          <div className="flex items-start">
                            <FiUser className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Gender</p>
                              <p className="text-sm font-medium text-gray-900">
                                {passenger.gender === 'm' ? 'Male' : passenger.gender === 'f' ? 'Female' : 'Other'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Need to update any details? Please contact our support team for assistance.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Home
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Print Itinerary
          </button>
        </div>
      </div>
    </div>
  );
}
