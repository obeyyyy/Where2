'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTripCart } from '@/app/components/TripCartContext';
import { FiCreditCard, FiLock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6">Payment Information</h2>
        
        {success ? (
          <div className="text-center py-8">
            <FiCheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600">Your booking is being confirmed. Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Payment Method Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  className={`flex items-center justify-center p-4 border rounded-lg transition-colors ${
                    paymentMethod === 'card' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <FiCreditCard className="mr-2" />
                  Credit/Debit Card
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center p-4 border rounded-lg transition-colors ${
                    paymentMethod === 'paypal' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <span className="text-blue-600 font-bold mr-2">Pay</span>Pal
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center p-4 border rounded-lg transition-colors ${
                    paymentMethod === 'apple_pay' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setPaymentMethod('apple_pay')}
                >
                  <span className="text-black font-semibold"> Pay</span>
                </button>
              </div>
            </div>

            {/* Card Details Form */}
            {paymentMethod === 'card' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="card-number" className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    id="card-number"
                    name="number"
                    value={cardDetails.number}
                    onChange={handleCardInputChange}
                    placeholder="1234 5678 9012 3456"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      id="expiry"
                      name="expiry"
                      value={cardDetails.expiry}
                      onChange={handleCardInputChange}
                      placeholder="MM/YY"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">
                      CVC
                    </label>
                    <input
                      type="text"
                      id="cvc"
                      name="cvc"
                      value={cardDetails.cvc}
                      onChange={handleCardInputChange}
                      placeholder="123"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="card-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    id="card-name"
                    name="name"
                    value={cardDetails.name}
                    onChange={handleCardInputChange}
                    placeholder="John Doe"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Payment Button */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Pay ${trip?.trip.price.total} ${trip?.trip.price.currency}`
                )}
              </button>
              
              <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                <FiLock className="mr-2" />
                Secure payment powered by Duffel
              </div>
              
              {error && (
                <div className="mt-4 flex items-center text-red-600 text-sm">
                  <FiAlertCircle className="mr-2" />
                  {error}
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
