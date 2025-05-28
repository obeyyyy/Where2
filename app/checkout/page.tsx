'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTripCart } from '@/app/components/TripCartContext';
import { FiCreditCard, FiLock, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Main checkout component
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trip } = useTripCart();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'apple_pay'>('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  useEffect(() => {
    // Check if we have trip data
    if (!trip) {
      // If no trip data in context, check URL params
      const tripData = searchParams.get('trip');
      if (!tripData) {
        setError('No trip selected. Please select a flight first.');
        setLoading(false);
        return;
      }
      
      try {
        // Try to parse trip data from URL params
        const parsedTrip = JSON.parse(decodeURIComponent(tripData));
        // Here you might want to validate the parsed trip data
      } catch (err) {
        console.error('Error parsing trip data:', err);
        setError('Invalid trip data. Please select a flight again.');
      }
    }
    
    setLoading(false);
  }, [trip, searchParams]);

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateCard = () => {
    // Simple validation - in a real app, use a library like credit-card-validator
    if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length < 15) {
      return 'Please enter a valid card number';
    }
    if (!cardDetails.expiry || !/\d{2}\/\d{2}/.test(cardDetails.expiry)) {
      return 'Please enter a valid expiry date (MM/YY)';
    }
    if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
      return 'Please enter a valid CVC';
    }
    if (!cardDetails.name) {
      return 'Please enter the name on card';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      // Validate card details
      const validationError = validateCard();
      if (validationError) {
        throw new Error(validationError);
      }

      // Get passenger data from localStorage or context
      const passengerData = JSON.parse(localStorage.getItem('passengerData') || '[]');
      if (!passengerData || passengerData.length === 0) {
        throw new Error('No passenger information found. Please complete the passenger details first.');
      }

      // Format card expiry
      const [expiryMonth, expiryYear] = cardDetails.expiry.split('/').map(s => s.trim());

      // Call our API endpoint to process the booking
      const response = await fetch('/api/book-flight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offerId: trip?.trip.id,
          paymentMethod: 'arc_bsp_credit_card',
          amount: trip?.trip.price.total,
          currency: trip?.trip.price.currency,
          cardDetails: {
            number: cardDetails.number.replace(/\s/g, ''),
            expiry_month: expiryMonth,
            expiry_year: `20${expiryYear}`,
            cvc: cardDetails.cvc,
            name: cardDetails.name,
          },
          passengers: passengerData,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Payment processing failed');
      }
      
      // Handle successful booking
      setSuccess(true);
      
      // Store booking reference in localStorage for the confirmation page
      localStorage.setItem('lastBooking', JSON.stringify({
        id: result.bookingId,
        date: new Date().toISOString(),
        amount: trip?.trip.price.total,
        currency: trip?.trip.price.currency,
      }));
      
      // Clear the trip from cart
      localStorage.removeItem('current_booking_offer');
      
      // Redirect to confirmation page after a short delay
      setTimeout(() => {
        router.push(`/confirmation?bookingId=${result.bookingId}`);
      }, 2000);
      
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => router.push('/search')}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Complete Your Booking</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Trip Summary</h2>
        <div className="mb-6">
          <p className="text-gray-700">
            {trip?.trip.itineraries.length} flight(s) selected
          </p>
          <p className="text-xl font-bold text-orange-600 mt-2">
            {trip?.trip.price.total} {trip?.trip.price.currency}
          </p>
        </div>
      </div>

      {success ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
          <div className="flex items-center">
            <FiCheckCircle className="mr-2 text-2xl" />
            <span>Payment successful! Redirecting to confirmation page...</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Payment Information</h2>
          
          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`px-4 py-2 rounded-md ${paymentMethod === 'card' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700'}`}
              >
                Credit/Debit Card
              </button>
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`px-4 py-2 rounded-md ${paymentMethod === 'paypal' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700'}`}
              >
                PayPal
              </button>
              <button
                onClick={() => setPaymentMethod('apple_pay')}
                className={`px-4 py-2 rounded-md ${paymentMethod === 'apple_pay' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700'}`}
              >
                Apple Pay
              </button>
            </div>

            {paymentMethod === 'card' && (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cardNumber">
                    Card Number
                  </label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="number"
                    value={cardDetails.number}
                    onChange={handleCardInputChange}
                    placeholder="1234 5678 9012 3456"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    disabled={processing}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="expiry">
                      Expiry Date (MM/YY)
                    </label>
                    <input
                      type="text"
                      id="expiry"
                      name="expiry"
                      value={cardDetails.expiry}
                      onChange={handleCardInputChange}
                      placeholder="MM/YY"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      disabled={processing}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cvc">
                      CVC
                    </label>
                    <input
                      type="text"
                      id="cvc"
                      name="cvc"
                      value={cardDetails.cvc}
                      onChange={handleCardInputChange}
                      placeholder="123"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      disabled={processing}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={cardDetails.name}
                    onChange={handleCardInputChange}
                    placeholder="John Doe"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    disabled={processing}
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline disabled:opacity-50 flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiLock className="mr-2" />
                      Pay {trip?.trip.price.total} {trip?.trip.price.currency}
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-4 flex items-center text-red-600 text-sm">
                    <FiAlertCircle className="mr-2" />
                    {error}
                  </div>
                )}
              </form>
            )}

            {paymentMethod === 'paypal' && (
              <div className="text-center py-8">
                <p className="mb-4">You will be redirected to PayPal to complete your payment.</p>
                <button
                  onClick={() => setError('PayPal integration not implemented yet')}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:shadow-outline"
                >
                  Continue with PayPal
                </button>
              </div>
            )}

            {paymentMethod === 'apple_pay' && (
              <div className="text-center py-8">
                <p className="mb-4">Complete your purchase with Apple Pay.</p>
                <button
                  onClick={() => setError('Apple Pay integration not implemented yet')}
                  className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:shadow-outline"
                >
                  Pay with Apple Pay
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <FiLock className="mr-2" />
            <span>Your payment is secure and encrypted</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export for Next.js page
export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CheckoutContent />
    </Suspense>
  );
}
