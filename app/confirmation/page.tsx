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
  FiCheck,
  FiSmartphone,
  FiPackage
} from 'react-icons/fi';

const AnimatedStepCharacter = dynamic(
  () => import('@/app/components/AnimatedStepCharacter'),
  { ssr: false }
);

const FlightItineraryCard = dynamic(
  () => import('@/app/components/FlightItineraryCard').then(mod => mod.FlightItineraryCard),
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
  payment?: {
    status: string;
    amount: any;
    currency: any;
    paymentMethod: any;
    lastFour?: string;
    paymentIntentId?: string;
    timestamp?: string;
  };
  passengers?: any[];
  segments?: any[];
  slices?: any[];
  order?: any;
  trip?: any;
  metadata?: Record<string, any>;
  // Ancillary related properties
  ancillarySelection?: Record<string, any>;
  ancillaryBreakdown?: string; // JSON string of ancillary items
  ancillaryAmount?: number; // Total amount for all ancillaries
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
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [fetchingReference, setFetchingReference] = useState(false);

  // Function to fetch booking reference using order ID
  const fetchBookingReference = async (orderId: string) => {
    if (!orderId || fetchingReference) return;
    
    try {
      setFetchingReference(true);
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.bookingReference) {
          setBookingReference(data.bookingReference);
          // Update the booking object with the reference
          setBooking(prevBooking => {
            if (!prevBooking) return null;
            return {
              ...prevBooking,
              bookingReference: data.bookingReference
            };
          });
        }
      }
    } catch (err) {
      console.error('Error fetching booking reference:', err);
    } finally {
      setFetchingReference(false);
    }
  };

  // Effect to fetch booking reference if needed
  useEffect(() => {
    if (booking?.id && !booking.bookingReference && !bookingReference) {
      fetchBookingReference(booking.id);
    }
  }, [booking]);

  useEffect(() => {
    const loadBookingData = async () => {
      try {
        const bookingId = searchParams.get('bookingId');
        const orderId = searchParams.get('orderId');
        const paymentIntentId = searchParams.get('payment_intent');
        const status = (searchParams.get('status') as BookingStatus) || 'pending';

        // First try to fetch from API if we have an orderId
        if (orderId) {
          try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (response.ok) {

              console.log('Order detailsfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
              const orderData = await response.json();
              await processBookingData(orderData, status);
              return;
            }
          } catch (err) {
            console.error('Error fetching order details:', err);
          }
        }
        
        // Fall back to payment intent ID if available
        if (paymentIntentId) {
          try {
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
        
        // Finally fall back to localStorage if API calls fail
        const storedBooking = localStorage.getItem('lastBooking');
        if (storedBooking) {
          try {
           
            const parsedData = JSON.parse(storedBooking);
            await processBookingData(parsedData, status);
            return;
          } catch (e) {
            console.error('Error parsing stored booking:', e);
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
        user_id: p.user_id
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
      
      // Try to get the payment data from localStorage first (this will have the correct total with fees)
      let storedPaymentData = null;
      try {
        const storedPayment = localStorage.getItem('lastPayment');
        if (storedPayment) {
          storedPaymentData = JSON.parse(storedPayment);
          console.log('Found stored payment data:', storedPaymentData);
        }
      } catch (e) {
        console.error('Error parsing stored payment data:', e);
      }
      
      // Try to get the booking data from localStorage (this will also have the correct total with fees)
      let storedBookingData = null;
      try {
        const storedBooking = localStorage.getItem('current_booking_data');
        if (storedBooking) {
          storedBookingData = JSON.parse(storedBooking);
          console.log('Found stored booking data:', storedBookingData);
        }
      } catch (e) {
        console.error('Error parsing stored booking data:', e);
      }
      
      // Format payment info - prioritize data from localStorage which has the correct total with fees
      const payment = {
        status: order.payment_status?.paid_at ? 'succeeded' : 'pending',
        // Use the amount from stored payment data if available (this includes fees)
        amount: storedPaymentData?.amount || order.total_amount,
        currency: storedPaymentData?.currency || order.total_currency,
        paymentMethod: storedPaymentData?.paymentMethod || 'card',
        lastFour: storedPaymentData?.lastFour,
        paymentIntentId: storedPaymentData?.paymentIntentId || order.metadata?.payment_intent_id,
        timestamp: storedPaymentData?.timestamp || order.payment_status?.paid_at || order.created_at
      };
      
      // Get the total amount with fees from various sources, prioritizing localStorage data
      const totalAmountWithFees = 
        storedPaymentData?.amount || // First try payment data from localStorage
        (storedBookingData?.trip?.price?.total) || // Then try booking data from localStorage
        (order.metadata?.total_with_fees) || // Then try metadata
        payment.amount; // Fallback to payment amount
      
      const bookingData = {
        id: order.id,
        bookingId: order.id,
        bookingReference: order.passengers[0].booking_reference,
        status: order.payment_status?.paid_at ? 'succeeded' : status,
        createdAt: order.created_at,
        // Use the total amount with fees for display
        totalAmount: totalAmountWithFees,
        // Keep the base amount for reference
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
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
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
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
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

  // Debug flight segments data
  console.log('Flight Segments:', flightSegments);
  if (flightSegments.length > 0) {
    console.log('Outbound Segment:', flightSegments[0]?.segments);
    if (flightSegments.length > 1) {
      console.log('Return Segment:', flightSegments[1]?.segments);
    }
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Animation */}
        <div className="text-center mb-8">
          <div className="mx-auto w-[250px] h-[250px] mb-4">
            {booking.status === 'succeeded' || booking.status === 'confirmed' ? (
              <div className="w-full h-full">
                <AnimatedStepCharacter 
                  lottieUrl="https://lottie.host/42f2651e-8c16-434e-b639-1cb75fcf19a3/r95IiVu0pY.json"
                  alt="Booking Confirmed"
                  className="w-full h-full"
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
                {/* Display booking reference prominently if available */}
                {booking.bookingReference && (
                  <p className="text-gray-600 text-base sm:text-lg mb-2">
                    <span className="font-semibold">Booking Reference:</span> <span className="font-mono font-bold text-gray-900 bg-yellow-100 px-2 py-1 rounded">{booking.bookingReference}</span>
                    <span className="ml-2 text-sm text-gray-500">(Use this to retrieve your booking)</span>
                  </p>
                )}
                <p className="text-gray-600 text-base sm:text-lg">
                  Order #: <span className="font-mono font-medium text-gray-700">{booking.bookingId || booking.id}</span>
                </p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Booking Summary</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Booking Reference</h3>
                <p className="font-mono text-gray-900">{booking.bookingReference || 'Your booking is confirmed. We are still waiting for the airline to issue your booking reference. We will email you as soon as it is available.'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
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
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Booking Date</h3>
                <p className="text-gray-900">
                  {booking.createdAt ? formatDateTime(booking.createdAt) : 'N/A'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Amount</h3>
                <p className="text-gray-900 font-medium text-lg">
                  {formatAmount(booking.totalAmount || booking.payment?.amount || booking.amount || 0, booking.currency)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Ancillary Details */}
          {booking.ancillarySelection && Object.keys(booking.ancillarySelection).length > 0 && (
            <div className="border-t border-gray-200 p-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">Selected Extras</h3>
              <div className="space-y-2">
                {booking.ancillaryBreakdown ? (
                  // If we have a detailed breakdown, show it
                  JSON.parse(booking.ancillaryBreakdown).map((item: any, index: number) => {
                    // Determine icon based on ancillary type
                    let icon = <span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span>;
                    if (item.type === 'bags' || item.type === 'bag') {
                      icon = <FiBriefcase className="text-orange-500 mr-2" />;
                    } else if (item.type === 'seats' || item.type === 'seat') {
                      icon = <FiMapPin className="text-orange-500 mr-2" />;
                    } else if (item.type === 'cancel_for_any_reason' || item.type === 'cancel') {
                      icon = <FiCheckCircle className="text-orange-500 mr-2" />;
                    }
                    
                    return (
                      <div key={`ancillary-${index}`} className="flex flex-col py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium flex items-center">
                            {icon}
                            {item.title || item.type?.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) || 'Extra'}
                          </span>
                          <span className="font-semibold text-gray-800">
                            {formatAmount(item.amount, booking.currency)}
                          </span>
                        </div>
                        {item.details && (
                          <div className="ml-6 text-sm text-gray-500 mt-1">
                            {item.details}
                            {item.passenger && (
                              <span className="ml-1">
                                • Passenger: {booking.passengers?.find((p: any) => p.id === item.passenger)?.given_name || 'N/A'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // If we don't have a detailed breakdown, show what we have
                  Object.entries(booking.ancillarySelection || {}).map(([key, value]: [string, any], index: number) => {
                    // Determine icon based on key name
                    let icon = <span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span>;
                    if (key.includes('bag')) {
                      icon = <FiBriefcase className="text-orange-500 mr-2" />;
                    } else if (key.includes('seat')) {
                      icon = <FiMapPin className="text-orange-500 mr-2" />;
                    } else if (key.includes('cancel')) {
                      icon = <FiX className="text-orange-500 mr-2" />;
                    }
                    
                    return (
                      <div key={`ancillary-${index}`} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                        <span className="text-gray-600 flex items-center">
                          {icon}
                          {key.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())}
                        </span>
                        <span className="font-semibold text-gray-800">
                          {typeof value === 'object' && value.amount ? formatAmount(value.amount, booking.currency) : 'Selected'}
                        </span>
                      </div>
                    );
                  })
                )}
                
                {booking.ancillaryAmount && (
                  <div className="flex justify-between items-center pt-2 font-medium">
                    <span>Total Extras</span>
                    <span>{formatAmount(booking.ancillaryAmount, booking.currency)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Payment Details */}
          {booking.payment && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
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

        {/* Flight Details */}
        {flightSegments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Flight Details</h2>
            </div>
            <div className="p-6">
              <FlightItineraryCard
                itinerary={{
                  segments: flightSegments[0]?.segments.map((seg: any) => {
                    return {
                      departure: { 
                        iataCode: seg.origin?.iata_code || seg.origin_iata_code || '', 
                        at: seg.departing_at || seg.departure_time || '' 
                      },
                      arrival: { 
                        iataCode: seg.destination?.iata_code || seg.destination_iata_code || '', 
                        at: seg.arriving_at || seg.arrival_time || '' 
                      },
                      carrierCode: seg.marketing_carrier?.iata_code || seg.carrier_code || '',
                      carrierName: seg.marketing_carrier?.name || seg.carrier_name || '',
                      number: seg.marketing_carrier_flight_number || seg.flight_number || '',
                      aircraft: { code: seg.aircraft?.code || seg.aircraft_code || '' }
                    };
                  }) || [],
                  duration: flightSegments[0]?.duration || ''
                }}
                date={flightSegments[0]?.segments[0]?.departing_at || ''}
                type="outbound"
                airports={[
                  { iata_code: flightSegments[0].origin.iata_code },
                  { iata_code: flightSegments[0].destination.iata_code }
                ]}
                className="w-full"
              />
              
              {flightSegments.length > 1 && (
                <div className="mt-6">
                  <FlightItineraryCard
                        itinerary={{
                          segments: flightSegments[1]?.segments.map((seg: any) => {
                            return {
                              departure: { 
                                iataCode: seg.origin?.iata_code || seg.origin_iata_code || '', 
                                at: seg.departing_at || seg.departure_time || '' 
                              },
                              arrival: { 
                                iataCode: seg.destination?.iata_code || seg.destination_iata_code || '', 
                                at: seg.arriving_at || seg.arrival_time || '' 
                              },
                              carrierCode: seg.marketing_carrier?.iata_code || seg.carrier_code || '',
                              carrierName: seg.marketing_carrier?.name || seg.carrier_name || '',
                              number: seg.marketing_carrier_flight_number || seg.flight_number || '',
                              aircraft: { code: seg.aircraft?.code || seg.aircraft_code || '' }
                            };
                          }) || [],
                          duration: flightSegments[1]?.duration || ''
                        }}
                    date={flightSegments[1]?.segments[0]?.departing_at || ''}
                    type="return"
                    airports={[
                      { iata_code: flightSegments[1].origin.iata_code },
                      { iata_code: flightSegments[1].destination.iata_code }
                    ]}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            
            {/* Show change/cancellation policy */}
            {/* Temporarily removed due to type errors - to be fixed with proper typing */}
            {/* {booking.conditions && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-sm text-gray-600">
                {booking.conditions.change_before_departure && (
                  <p className="mb-1 flex items-center text-gray-700">
                    <FiRepeat className="mr-2 text-blue-500" /> 
                    Flight changes {booking.conditions.change_before_departure.allowed ? 'allowed' : 'not allowed'} before departure.
                    {booking.conditions.change_before_departure.penalty_amount && (
                      <span className="ml-1">Fee: {formatAmount(booking.conditions.change_before_departure.penalty_amount, booking.conditions.change_before_departure.penalty_currency || booking.currency)}</span>
                    )}
                  </p>
                )}
                {booking.conditions.cancellation && (
                  <p className="flex items-center text-gray-700">
                    <FiX className="mr-2 text-red-500" /> 
                    Cancellation {booking.conditions.cancellation.allowed ? 'allowed' : 'not allowed'}.
                    {booking.conditions.cancellation.penalty_amount && (
                      <span className="ml-1">Fee: {formatAmount(booking.conditions.cancellation.penalty_amount, booking.conditions.cancellation.penalty_currency || booking.currency)}</span>
                    )}
                    {booking.conditions.cancellation.refundable && booking.conditions.cancellation.refundable_until && (
                      <span className="ml-1">Refundable until {new Date(booking.conditions.cancellation.refundable_until).toLocaleString()}.</span>
                    )}
                  </p>
                )}
              </div>
            )} */}
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
                          {passenger.given_name} {passenger.family_name}
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

        {/* Payment Details */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Payment Details</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Base Price */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Base Flight Price</span>
                <span className="text-gray-900">
                  {formatAmount(booking.amount || booking.trip?.price?.basePrice , booking.currency)}
                </span>
              </div>
              
              {/* Service Fee */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Service Fee ({booking.passengers?.length || 1} {(booking.passengers?.length || 1) > 1 ? 'passengers' : 'passenger'})</span>
                <span className="text-gray-900">
                  {formatAmount((booking.passengers?.length || 1) * 2, booking.currency)}
                </span>
              </div>
              
              {/* Markup Fee */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Booking Fee ({booking.passengers?.length || 1} {(booking.passengers?.length || 1) > 1 ? 'passengers' : 'passenger'})</span>
                <span className="text-gray-900">
                  {formatAmount((booking.passengers?.length || 1) * 1, booking.currency)}
                </span>
              </div>
              
              {/* Debug Ancillary Data */}
              <div className="hidden">
                {(() => {
                  console.log('Booking data for ancillaries:', {
                    hasAncillaryBreakdown: !!booking.ancillaryBreakdown,
                    ancillaryBreakdownType: typeof booking.ancillaryBreakdown,
                    hasAncillarySelection: !!booking.ancillarySelection,
                    ancillarySelectionType: typeof booking.ancillarySelection,
                    rawAncillaryBreakdown: booking.ancillaryBreakdown,
                    rawAncillarySelection: booking.ancillarySelection
                  });
                  return null;
                })()}
              </div>
              
              {/* Ancillary Services */}
              {(booking.ancillaryBreakdown || booking.ancillarySelection || booking.order?.ancillaries) ? (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  <div className="mb-2">
                    <span className="text-gray-600 font-medium">Selected Extras</span>
                  </div>
                  
                  {/* Parse and display ancillary breakdown */}
                  {(() => {
                    let ancillaryItems = [];
                    
                    // First try to parse ancillaryBreakdown if it exists
                    if (booking.ancillaryBreakdown) {
                      try {
                        // Handle both string and object formats
                        const breakdown = typeof booking.ancillaryBreakdown === 'string' 
                          ? JSON.parse(booking.ancillaryBreakdown)
                          : booking.ancillaryBreakdown;
                          
                        console.log('Parsed ancillary breakdown:', breakdown);
                        
                        if (Array.isArray(breakdown) && breakdown.length > 0) {
                          ancillaryItems = breakdown;
                        }
                      } catch (e) {
                        console.error('Error parsing ancillary breakdown:', e);
                      }
                    }
                    // Then try ancillarySelection if breakdown parsing failed
                    else if (booking.ancillarySelection) {
                      try {
                        // Handle both string and object formats
                        const selection = typeof booking.ancillarySelection === 'string'
                          ? JSON.parse(booking.ancillarySelection)
                          : booking.ancillarySelection;
                          
                        console.log('Using ancillary selection:', selection);
                        
                        if (selection.services && Array.isArray(selection.services)) {
                          ancillaryItems = selection.services.map((service: any) => ({
                            title: service.title || service.name || 'Extra Service',
                            type: service.type || 'ancillary',
                            amount: parseFloat(service.amount || service.total_amount || '0'),
                            passenger: service.passenger_id || service.passenger_ids?.[0],
                            details: service.description || ''
                          }));
                        }
                      } catch (e) {
                        console.error('Error parsing ancillary selection:', e);
                      }
                    }
                    // Finally try order.ancillaries if available
                    else if (booking.order?.ancillaries) {
                      try {
                        console.log('Using order.ancillaries:', booking.order.ancillaries);
                        
                        // Handle both array and object formats
                        const ancillaries = Array.isArray(booking.order.ancillaries)
                          ? booking.order.ancillaries
                          : [booking.order.ancillaries];
                          
                        ancillaryItems = ancillaries.map((item: any) => ({
                          title: item.title || item.name || item.type || 'Extra Service',
                          type: item.type || 'ancillary',
                          amount: parseFloat(item.amount || item.price || '0'),
                          passenger: item.passenger_id || item.passenger,
                          details: item.description || ''
                        }));
                      } catch (e) {
                        console.error('Error parsing order.ancillaries:', e);
                      }
                    }
                    
                    // If we have items to display, render them
                    if (ancillaryItems.length > 0) {
                      return ancillaryItems.map((item: any, index: number) => {
                        // Determine icon based on ancillary type
                        let IconComponent = FiPackage;
                        if (item.type === 'bags' || item.type === 'bag' || (item.title && item.title.toLowerCase().includes('bag'))) {
                          IconComponent = FiBriefcase;
                        } else if (item.type === 'seats' || item.type === 'seat' || (item.title && item.title.toLowerCase().includes('seat'))) {
                          IconComponent = FiMapPin;
                        } else if (item.type === 'cancel_for_any_reason' || item.type === 'cancel' || (item.title && item.title.toLowerCase().includes('cancel'))) {
                          IconComponent = FiCheckCircle;
                        }
                        
                        return (
                          <div key={`ancillary-${index}`} className="flex justify-between items-center py-2">
                            <span className="text-gray-600 flex items-center">
                              <IconComponent className="text-orange-500 mr-2" />
                              {item.title || item.type?.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) || 'Extra'}
                              {item.passenger && booking.passengers && (
                                <span className="ml-1 text-xs text-gray-500">
                                  • {booking.passengers.find((p: any) => p.id === item.passenger)?.given_name || 'Passenger'}
                                </span>
                              )}
                            </span>
                            <span className="font-semibold text-gray-800">
                              {formatAmount(item.amount, booking.currency || 'EUR')}
                            </span>
                          </div>
                        );
                      });
                    }
                    
                    // If no items found but we know there are ancillaries, show a generic message
                    return (
                      <div className="py-2 text-gray-600">
                        Selected extras included in total price
                      </div>
                    );
                  })()}
                </>
              ) : null}
              
              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>
              
              {/* Total Amount */}
              <div className="flex justify-between items-center font-medium text-lg">
                <span className="text-gray-900">Total Amount</span>
                <span className="text-blue-600">
                  {formatAmount(booking.payment?.amount || booking.totalAmount || '0', booking.currency)}
                </span>
              </div>
              
              {/* Payment Method */}
              {booking.payment && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Paid with</span>
                    <span className="text-gray-900">
                      {booking.payment.paymentMethod}
                      {booking.payment.lastFour && ` •••• ${booking.payment.lastFour}`}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {booking.payment.timestamp && `Processed on ${new Date(booking.payment.timestamp).toLocaleString()}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Retrieve Booking Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-orange-100">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Retrieve Your Booking</h3>
            <p className="text-gray-600 mb-4">
              Save your offer ID to access your booking later
            </p>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={booking?.id || ''}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
              <Link 
                href={`/retrieve-booking/${booking?.id || ''}`}
                className="px-6 py-2 bg-gradient-to-r from-[#FF8C00] to-[#FFA500] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center"
              >
                View Booking
              </Link>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="relative hidden lg:block">
            
            <div className="relative mx-auto w-64">
              {/* Phone frame */}
              
                <div className="rounded-xl overflow-hidden bg-white">
                  {/* Replace with your actual phone mockup image */}
                  <img 
                    src="/images/mock2-left.png" 
                    alt="Booking on mobile"
                    className="w-full h-auto"
                  />
                </div>
            </div>
          </div>
        </div>

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

import Link from 'next/link';
