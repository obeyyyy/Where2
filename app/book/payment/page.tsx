'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { computePricing, PricingBreakdown } from '@/lib/pricing';
import Loading from '../../loading';
import { FiArrowLeft, FiCheckCircle, FiCreditCard, FiUser, FiCalendar, FiGlobe } from 'react-icons/fi';
import { FlightItineraryCard } from "@/app/components/FlightItineraryCard";
import PaymentForm from '@/app/components/PaymentForm';
import AnimatedStepCharacter from '@/app/components/AnimatedStepCharacter';

interface PassengerInfo {
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  documentNumber: string;
  documentIssuingCountryCode: string;
  documentExpiryDate: string;
  documentNationality: string;
  [key: string]: any;
}

interface BookingData {
  trip: any;
  searchParams: {
    tripType: string;
    departureDate: string;
    returnDate?: string;
    travelers: number;
    from: string;
    to: string;
  };
  passengers: PassengerInfo[];
  metadata?: {
    bookingReference?: string;
    source?: string;
    [key: string]: any;
  };
}

// Wrapper component to handle Suspense for useSearchParams
export default function PaymentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | undefined>(undefined);
  const [paymentIntentId, setPaymentIntentId] = useState<string | undefined>(undefined);
  const [baseAmount, setBaseAmount] = useState<string>('0');
  const [amount, setAmount] = useState<string>('0');
  const [currency, setCurrency] = useState<string>('EUR');
  const [priceInfo, setPriceInfo] = useState<PricingBreakdown | null>(null);

  // Fetch booking data and create payment intent on mount
  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        setLoading(true);
        // Try to get booking data from sessionStorage first, then fall back to localStorage
        let bookingDataString = sessionStorage.getItem('current_booking_data');
        
        if (!bookingDataString) {
          // Try localStorage as fallback
          bookingDataString = localStorage.getItem('current_booking_offer');
          if (!bookingDataString) {
            throw new Error('No booking data found. Please start a new search.');
          }
        }
        
        const data = JSON.parse(bookingDataString);
        console.log('Loaded booking data:', data);
        setBookingData(data);
        
        // Extract amount and currency with proper fallbacks
        const isRoundtrip = data.searchParams?.tripType === 'roundtrip';
        let localBaseAmount = '0';
        let localCurrency = 'EUR';
        
        if (isRoundtrip && data.trip?.price?.total) {
          // Use the total price directly from Duffel for roundtrip
          localBaseAmount = data.trip.price.total;
          localCurrency = data.trip.price.currency || 'EUR';
        } else if (isRoundtrip && data.trip?.price?.breakdown) {
          // If we have a breakdown but no total, use the outbound price as the total
          // since Duffel returns a single price for roundtrip
          localBaseAmount = data.trip.price.breakdown.outbound || '0';
          localCurrency = data.trip.price.breakdown.currency || 'EUR';
        } else {
          // For one-way, use the total amount
          localBaseAmount = data.trip?.price?.total || 
                     data.trip?.price?.breakdown?.basePrice || 
                     '0';
          localCurrency = data.trip?.price?.currency || 
                   data.trip?.price?.breakdown?.currency || 
                   'EUR';
        }
        
        // Compute pricing via shared utility
        const breakdown: PricingBreakdown = computePricing({
          baseAmount: parseFloat(localBaseAmount),
          passengers: data.passengers?.length || 1,
          currency: localCurrency,
        });
        const localAmount = breakdown.total.toString();

        // Save breakdown for display & downstream components
        setPriceInfo(breakdown);
        
        // Update state variables
        setBaseAmount(localBaseAmount);
        setCurrency(localCurrency);
        setAmount(localAmount);
        
        console.log('Creating payment intent with:', { 
          amount: localAmount, 
          currency: localCurrency,
          paymentIntentId: data.paymentIntentId || undefined
        });
        
        // Create payment intent
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: localAmount,
            currency: localCurrency,
            paymentIntentId: data.paymentIntentId || undefined
          }),
        });
        
        const result = await response.json();
        
        // Log the full response for debugging (but don't log sensitive data)
        const safeResult = {
          ...result,
          clientToken: result.clientToken ? '***REDACTED***' : undefined,
          client_token: result.client_token ? '***REDACTED***' : undefined,
          client_secret: result.client_secret ? '***REDACTED***' : undefined,
          data: result.data ? {
            ...result.data,
            clientToken: result.data.clientToken ? '***REDACTED***' : undefined,
            client_token: result.data.client_token ? '***REDACTED***' : undefined,
            client_secret: result.data.client_secret ? '***REDACTED***' : undefined,
          } : undefined
        };
        
        console.log('Payment intent response:', {
          status: response.status,
          ok: response.ok,
          result: safeResult,
          hasClientToken: !!(result.clientToken || result.client_token || result.data?.clientToken || result.data?.client_token)
        });
        
        if (!response.ok) {
          console.error('Error creating payment intent:', safeResult);
          let errorMessage = result.error?.message || 
                           result.message || 
                           result.error ||
                           `Failed to create payment intent (${response.status})`;
          
          // Add more context if available
          if (result.possibleCauses) {
            errorMessage = `${errorMessage}\n\nPossible causes:\n- ${result.possibleCauses.join('\n- ')}`;
          }
          
          throw new Error(errorMessage);
        }
        
        // Extract the client token or secret from the response
        // The token/secret can be in different places in the response depending on the API version
        const clientToken = result.clientToken || // Direct property
                          result.client_token || // Direct property (snake_case)
                          result.data?.client_token || // Nested in data
                          result.data?.clientToken || // Nested in data (camelCase)
                          result.client_secret || // Fallback to client_secret
                          result.data?.client_secret; // Fallback to nested client_secret
                          
        console.log('Extracted client token/secret:', clientToken ? '***REDACTED***' : 'Not found');
                          
        const paymentIntentId = result.data?.id || 
                             result.paymentIntentId || 
                             result.data?.paymentIntentId;
        
        if (clientToken) {
          console.log('Received client token/secret, length:', clientToken.length);
          console.log('Client token/secret prefix:', clientToken.substring(0, 10) + '...');
          console.log('Payment intent ID:', paymentIntentId);
          
          // Log the full response for debugging (without the token)
          console.log('Full response structure:', {
            ...result,
            client_token: result.client_token ? '***REDACTED***' : undefined,
            clientToken: result.clientToken ? '***REDACTED***' : undefined,
            client_secret: result.client_secret ? '***REDACTED***' : undefined,
            data: result.data ? {
              ...result.data,
              client_token: result.data.client_token ? '***REDACTED***' : undefined,
              clientToken: result.data.clientToken ? '***REDACTED***' : undefined,
              client_secret: result.data.client_secret ? '***REDACTED***' : undefined
            } : undefined
          });
          
          // Set the client token and payment intent ID
          setClientToken(clientToken);
          setPaymentIntentId(paymentIntentId);
          
          // Clear any previous errors
          setError(null);
          return;
        }
        
        // If we have a payment intent ID but no client token/secret, try to extract it
        if (paymentIntentId) {
          // Log the raw result for debugging
          console.log('Raw API response:', JSON.stringify(result, null, 2));
          
          // Try to find the client token in the response
          const findClientToken = (obj: any): string | undefined => {
            if (!obj) return undefined;
            
            // Check direct properties
            if (obj.client_token) return obj.client_token;
            if (obj.clientToken) return obj.clientToken;
            if (obj.client_secret) return obj.client_secret;
            
            // Check nested data property
            if (obj.data) {
              return findClientToken(obj.data);
            }
            
            // Check all string properties that might contain a token
            for (const key in obj) {
              const value = obj[key];
              if (typeof value === 'string' && value.length > 50 && value.includes('.')) {
                console.log(`Found potential token in property ${key}`);
                return value;
              }
            }
            
            return undefined;
          };
          
          const extractedToken = findClientToken(result);
          if (extractedToken) {
            console.log('Successfully extracted client token with length:', extractedToken.length);
            setClientToken(extractedToken);
            setPaymentIntentId(paymentIntentId);
            setError(null);
            return;
          }
          const errorDetails = result.data || result;
          console.error('Payment intent created but missing client token/secret. Response:', {
            ...errorDetails,
            clientToken: errorDetails.clientToken ? '***REDACTED***' : undefined,
            client_token: errorDetails.client_token ? '***REDACTED***' : undefined,
            client_secret: errorDetails.client_secret ? '***REDACTED***' : undefined
          });
          
          // Log all available keys for debugging
          console.log('Available response keys:', Object.keys(result));
          if (result.data) {
            console.log('Available data keys:', Object.keys(result.data));
          }
          
          // Check if we have a client token in the response
          const hasClientToken = !!(result.clientToken || result.client_token || 
                                 (result.data && (result.data.clientToken || result.data.client_token)));
          
          if (hasClientToken) {
            console.log('Client token found but not properly extracted. This might be a parsing issue.');
            // Try to extract the client token again with more verbose logging
            const extractedToken = result.client_token || result.clientToken || 
                                 (result.data && (result.data.client_token || result.data.clientToken));
            if (extractedToken) {
              console.log('Successfully extracted client token with length:', extractedToken.length);
              setClientToken(extractedToken);
              setPaymentIntentId(paymentIntentId);
              return;
            }
          }
          
          throw new Error(
            'Payment processing is not properly configured. ' +
            'Please ensure your Duffel account has payment processing enabled and is properly set up.\n\n' +
            'If you\'re in test mode, make sure your test account is properly configured with a valid payment method.'
          );
        }
        
        // Handle other error cases with more detailed error messages
        if (result.error) {
          throw new Error(`Payment error: ${result.error}`);
        }
        
        throw new Error('Unable to process payment. Please try again or contact support.');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load booking data';
        setError(errorMessage);
        console.error('Error loading booking data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookingData();
  }, []);
  
  interface PaymentMethod {
    type: string;
    id?: string;
    card?: {
      number: string;
      expiry_month: string;
      expiry_year: string;
      cvc: string;
      name: string;
    };
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle payment submission
  const handlePaymentSubmit = async (paymentData: {
    name: string;
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    token?: string;
  }) => {
    if (!bookingData) {
      setError('No booking data available');
      return;
    }
    
    if (!clientToken || !paymentIntentId) {
      setError('Payment session not initialized. Please refresh the page.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      // Validate booking data and amount
      if (!bookingData) {
        throw new Error('Booking data not found. Please try again.');
      }

      // Recompute pricing to ensure we charge the exact same total used for the intent
      const breakdown: PricingBreakdown = computePricing({
        baseAmount: parseFloat(bookingData.trip?.price?.total || bookingData.trip?.price?.breakdown?.basePrice || '0'),
        passengers: bookingData.passengers?.length || 1,
        currency: bookingData.trip?.price?.currency || bookingData.trip?.price?.breakdown?.currency || 'EUR',
      });
      const amount = breakdown.total.toFixed(2);
      const currency = breakdown.currency;
      
      console.log('Payment submission with amount:', amount, currency, breakdown);
      
      if (!amount || isNaN(parseFloat(amount))) {
        throw new Error('Invalid amount for payment');
      }
      
      // Generate a unique booking reference
      const bookingReference = `BOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Log the complete booking data for debugging
      console.log('=== COMPLETE BOOKING DATA ===');
      console.log(JSON.stringify(bookingData, null, 2));
      console.log('=== AMOUNT LOCATIONS ===');
      console.log('Trip object keys:', Object.keys(bookingData.trip || {}));
      console.log('Trip total_amount:', bookingData.trip?.total_amount);
      console.log('Trip amount:', bookingData.trip?.amount);
      console.log('Trip price object:', bookingData.trip?.price);
      if (bookingData.trip?.price) {
        console.log('Price object keys:', Object.keys(bookingData.trip.price));
        console.log('Price total:', bookingData.trip.price.total);
        if (bookingData.trip.price.breakdown) {
          console.log('Breakdown keys:', Object.keys(bookingData.trip.price.breakdown));
          console.log('Base price:', bookingData.trip.price.breakdown.basePrice);
          console.log('Total fees:', bookingData.trip.price.breakdown.totalFees);
        }
      }
      
      // Debug: Log the booking data structure
      console.log('=== BOOKING DATA DEBUG ===');
      console.log('Trip keys:', Object.keys(bookingData.trip || {}));
      console.log('Price object:', bookingData.trip?.price);
      console.log('Price breakdown:', bookingData.trip?.price?.breakdown);
      
      console.log('Total price:', bookingData.trip?.price?.total);
      console.log('Base price:', bookingData.trip?.price?.breakdown?.basePrice);
      console.log('==========================');

      // Prepare the request body
      const requestBody: any = {
        offerId: bookingData.trip.id || bookingData.trip.offer_id,
        passengers: bookingData.passengers.map((passenger) => ({
          title: passenger.title || 'mr',
          firstName: passenger.firstName || '',
          lastName: passenger.lastName || '',
          dateOfBirth: passenger.dateOfBirth,
          gender: (passenger.gender || 'm').toLowerCase(),
          email: passenger.email || '',
          phone: passenger.phone || '',
          documentNumber: passenger.documentNumber || 'N/A',
          documentExpiryDate: passenger.documentExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          documentIssuingCountryCode: passenger.documentIssuingCountryCode || 'US',
          documentNationality: passenger.documentNationality || 'US',
        })),
        // Get the total amount including markups and service fees
        amount: (() => {
          // Helper function to safely parse amount values
          const parseAmount = (value: any): number | null => {
            if (value === undefined || value === null) return null;
            
            // Handle string values (with currency symbols, spaces, etc.)
            if (typeof value === 'string') {
              // Remove any non-numeric characters except decimal point
              const numericValue = value.replace(/[^0-9.]/g, '');
              const parsed = parseFloat(numericValue);
              return isNaN(parsed) ? null : parsed;
            }
            
            // Handle number values
            if (typeof value === 'number') {
              return isFinite(value) ? value : null;
            }
            
            // Handle objects with amount/currency properties
            if (typeof value === 'object' && value !== null) {
              if (value.amount !== undefined) return parseAmount(value.amount);
              if (value.total !== undefined) return parseAmount(value.total);
              if (value.value !== undefined) return parseAmount(value.value);
            }
            
            return null;
          };
          
          // Debug: Log the trip object structure for inspection
          if (bookingData?.trip) {
            console.log('Trip object structure:', JSON.stringify(bookingData.trip, null, 2));
            
            // 1. Calculate total amount including markups and service fees
            try {
              let baseAmount = 0;
              let serviceFee = 0;
              let markup = 0;
              let totalAmount = 0;
              const passengerCount = bookingData.passengers?.length || 1;
              
              // Get base amount from trip.price or trip.total_amount
              if (bookingData.trip.price) {
                baseAmount = parseAmount(bookingData.trip.price) || 0;
              } else if (bookingData.trip.total_amount) {
                baseAmount = parseAmount(bookingData.trip.total_amount) || 0;
              } else if (Array.isArray(bookingData.trip.offers) && bookingData.trip.offers.length > 0) {
                const offer = bookingData.trip.offers[0];
                if (offer.price) {
                  baseAmount = parseAmount(offer.price) || 0;
                } else if (offer.total_amount) {
                  baseAmount = parseAmount(offer.total_amount) || 0;
                }
              }
              
              // Get service fee and markup from breakdown if available
              if (bookingData.trip.price?.breakdown) {
                const breakdown = bookingData.trip.price.breakdown;
                serviceFee = parseAmount(breakdown.serviceFee) || 0;
                markup = parseAmount(breakdown.markup) || 0;
              } else {
                // Default values if breakdown is not available
                serviceFee = 1.00; // Default service fee per passenger
                markup = 3.00; // Default markup per passenger
              }
              
              // Calculate total amount per passenger
              const amountPerPassenger = baseAmount + serviceFee + markup;
              
              // Calculate total for all passengers
              totalAmount = amountPerPassenger * passengerCount;
              
              console.log('Calculated total amount:', {
                baseAmount,
                serviceFee,
                markup,
                passengerCount,
                amountPerPassenger,
                totalAmount
              });
              
              if (totalAmount > 0) {
                return totalAmount.toFixed(2);
              }
            } catch (error) {
              console.error('Error calculating total amount:', error);
            }
            
            // 2. Fallback to direct amount if calculation fails
            const amountFields = [
              'total_amount', 'amount', 'total', 'total_price', 'price',
              'base_amount', 'tax_amount', 'fare_amount', 'fees_amount'
            ] as const;
            
            for (const field of amountFields) {
              const amount = parseAmount(bookingData.trip[field as keyof typeof bookingData.trip]);
              if (amount) {
                console.log(`Using amount from trip.${field}:`, amount);
                return amount.toFixed(2);
              }
            }
            
            // 3. If we still don't have an amount, log detailed error
            console.error('Could not determine booking amount from trip data', {
              tripKeys: Object.keys(bookingData.trip || {}),
              hasOffers: Array.isArray(bookingData.trip.offers),
              offerCount: bookingData.trip.offers?.length || 0,
              firstOfferKeys: bookingData.trip.offers?.[0] ? Object.keys(bookingData.trip.offers[0]) : 'No offers',
              priceObject: bookingData.trip.price || 'No price object'
            });
          } else {
            console.error('No trip data available in bookingData:', bookingData);
          }
          
          // As a last resort, use the amount from URL params if available
          const urlParams = new URLSearchParams(window.location.search);
          const amountFromUrl = urlParams.get('amount');
          if (amountFromUrl && !isNaN(parseFloat(amountFromUrl))) {
            console.log('Using amount from URL params as fallback:', amountFromUrl);
            return parseFloat(amountFromUrl).toFixed(2);
          }
          
          // If we still don't have an amount, log an error and use a default
          console.error('No valid amount found in booking data, using default amount of 100.00');
          return '100.00';
        })(),
      };
      
      // Add payment method to request
      if (paymentData.token) {
        console.log('Using payment method token:', paymentData.token.substring(0, 12) + '...');
        // Format as a payment method object with token
        requestBody.paymentMethod = {
          type: 'card',
          id: paymentData.token
        };
      } else if (paymentData.cardNumber && paymentData.expiry && paymentData.cvv) {
        // We already validated these exist in the cardDetails creation
        const [expiryMonth, expiryYear] = paymentData.expiry.split('/').map((s: string) => s.trim());
        const fullExpiryYear = expiryYear.length === 2 ? `20${expiryYear}` : expiryYear;
        
        // Format as a payment method object with card details
        requestBody.paymentMethod = {
          type: 'card',
          card: {
            number: paymentData.cardNumber.replace(/\s+/g, ''),
            expiry_month: expiryMonth.padStart(2, '0'),
            expiry_year: fullExpiryYear,
            cvc: paymentData.cvv,
            name: paymentData.name,
          }
        };
        
        console.log('Formatted payment method with card details');
      } else {
        throw new Error('No valid payment method provided');
      }
      
      // Log the complete booking data for debugging
      console.log('Complete booking data structure:', JSON.stringify(bookingData, null, 2));
      
      // Log the amount and its source
      const amountSource = bookingData.trip.offers?.[0]?.total_amount ? 'offers[0].total_amount' :
                         bookingData.trip.total_amount ? 'trip.total_amount' :
                         bookingData.trip.amount ? 'trip.amount' :
                         'not found';
      
      console.log('Amount source:', amountSource);
      console.log('Amount value:', bookingData.trip.offers?.[0]?.total_amount || 
                                 bookingData.trip.total_amount || 
                                 bookingData.trip.amount || '0');
      
      // First, create a payment intent with the correct amount and currency
      const paymentAmount = bookingData.trip?.price?.total || 
                          bookingData.trip?.price?.breakdown?.total || 
                          '0';
      const paymentCurrency = bookingData.trip?.price?.currency || 
                            bookingData.trip?.price?.breakdown?.currency || 
                            'EUR';
      
      console.log('Creating payment intent with:', { 
        amount: paymentAmount, 
        currency: paymentCurrency,
        priceObject: bookingData.trip?.price
      });
      const paymentIntentResponse = await fetch('/api/book-flight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const paymentIntentResult = await paymentIntentResponse.json();
      console.log('Payment intent created:', paymentIntentResult);

      if (!paymentIntentResponse.ok) {
        throw new Error(paymentIntentResult.error || 'Failed to create payment intent');
      }
      
      // Store the client secret for Duffel Elements if provided
      const clientSecret = paymentIntentResult.clientSecret || paymentIntentResult.data?.clientSecret;
      
      if (clientSecret) {
        console.log('Received client secret for Duffel Elements');
        console.log('Client secret length:', clientSecret.length);
        console.log('Client secret prefix:', clientSecret.substring(0, 10) + '...');
        
        // Set the client token (which is actually the client secret)
        setClientToken(clientSecret);
      } else {
        console.error('No client secret received in payment intent result');
        console.error('Payment intent result:', paymentIntentResult);
        throw new Error('Payment processing failed - no client secret received');
      }

      // Define payment method type
      type PaymentMethod = {
        type: string;
        id?: string;
        card?: {
          number: string;
          expiry_month: string;
          expiry_year: string;
          cvc: string;
          name: string;
        };
      };

      // Initialize payment method variable
      let paymentMethod: PaymentMethod;

      // If we have a payment method token from Duffel Elements
      if (paymentData.token) {
        console.log('Using payment method token from Duffel Elements');
        paymentMethod = {
          id: paymentData.token,
          type: 'card'
        };
      } else if (paymentData.cardNumber && paymentData.expiry && paymentData.cvv) {
        // Fallback to direct card details if available
        const [expiryMonth, expiryYear] = paymentData.expiry.split('/').map((s: string) => s.trim());
        const fullExpiryYear = expiryYear.length === 2 ? `20${expiryYear}` : expiryYear;
        
        paymentMethod = {
          type: 'card',
          card: {
            number: paymentData.cardNumber.replace(/\s+/g, ''),
            expiry_month: expiryMonth.padStart(2, '0'),
            expiry_year: fullExpiryYear,
            cvc: paymentData.cvv,
            name: paymentData.name,
          }
        };
      } else {
        throw new Error('No valid payment method provided');
      }

      // Initialize confirmResult with paymentIntentResult as the base
      let confirmResult = { ...paymentIntentResult };
      
      // Check if we need to collect payment method
      if (paymentIntentResult.status === 'requires_payment_method') {
        // Wait a short moment to ensure the payment intent is ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Then confirm the payment with the payment method
        console.log('Confirming payment with payment method:', paymentMethod);
        const confirmResponse = await fetch('/api/book-flight', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            offerId: bookingData.trip.id || bookingData.trip.offer_id,
            paymentIntentId: paymentIntentResult.paymentIntentId || paymentIntentResult.id,
            paymentMethod: paymentMethod,
            // Get the amount from the first offer in the trip's offer array, or from the trip itself
            amount: bookingData.trip.offers?.[0]?.total_amount || 
                   bookingData.trip.price?.total || 
                   bookingData.trip.total_amount || 
                   bookingData.trip.amount || 
                   0,
            currency: bookingData.trip.price?.currency || bookingData.trip.total_currency || 'EUR',
            passengers: bookingData.passengers,
            metadata: {
              ...(bookingData.metadata || {}),
              source: 'web-booking',
              tripType: bookingData.searchParams.tripType,
            },
            isConfirming: true,
          }),
        });

        const responseData = await confirmResponse.json();
        console.log('Payment confirmation response:', responseData);

        if (!confirmResponse.ok || !responseData.success) {
          const errorMessage = responseData.error || 
                            responseData.errors?.[0]?.message || 
                            'Payment confirmation failed';
          console.error('Payment confirmation error:', errorMessage, responseData);
          throw new Error(errorMessage);
        }
        
        // Update confirmResult with the latest response
        confirmResult = { ...confirmResult, ...responseData };
        
        if (responseData.requiresAction) {
          console.log('Additional action required for payment');
          // Handle 3D Secure or other required actions
          throw new Error('This payment requires additional verification. Please try a different payment method.');
        }
      } else if (paymentIntentResult.requiresAction) {
        // Handle case where payment intent requires action immediately
        console.log('Payment requires additional action:', paymentIntentResult);
        throw new Error('This payment requires additional verification. Please try a different payment method.');
      }

      // Prepare complete booking data for confirmation page
      const completeBookingData = {
        ...bookingData,
        payment: {
          status: confirmResult.status || 'succeeded',
          amount: confirmResult.amount || bookingData.trip.price?.total || 0,
          currency: confirmResult.currency || bookingData.trip.price?.currency || 'EUR',
          paymentMethod: paymentData.token ? 'token' : 'card',
          lastFour: paymentData.cardNumber ? paymentData.cardNumber.replace(/\s+/g, '').slice(-4) : '••••',
          timestamp: new Date().toISOString(),
          paymentIntentId: paymentIntentResult.paymentIntentId,
        },
        order: confirmResult.order || {},
        bookingReference: confirmResult.bookingReference || bookingReference,
        bookingId: confirmResult.bookingId || `booking-${Date.now()}`,
        paymentIntent: confirmResult.paymentIntent,
      };

      console.log('Complete booking data:', completeBookingData);
      
      // Store complete booking data in localStorage for the confirmation page
      localStorage.setItem('lastBooking', JSON.stringify(completeBookingData));
      
      // Clear booking data from session storage
      sessionStorage.removeItem('current_booking_data');
      
      // Redirect to confirmation page with all necessary data
      const searchParams = new URLSearchParams({
        bookingId: completeBookingData.bookingId,
        ref: completeBookingData.bookingReference,
        status: 'succeeded',
        paymentStatus: completeBookingData.payment.status,
        amount: completeBookingData.payment.amount.toString(),
        currency: completeBookingData.payment.currency,
      }).toString();
      
      router.push(`/confirmation?${searchParams}`);
      
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load booking data from session storage or redirect
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('current_booking_data');
      if (!storedData) {
        router.push('/book');
        return;
      }
      
      const parsedData = JSON.parse(storedData);
      
      // Log the complete parsed data for debugging
      console.log('=== COMPLETE BOOKING DATA ===');
      console.log(JSON.stringify(parsedData, null, 2));
      
      // Log specific paths where amount might be
      console.log('=== AMOUNT LOCATIONS ===');
      
      // Check trip object
      if (parsedData.trip) {
        console.log('Trip object keys:', Object.keys(parsedData.trip));
        console.log('Trip total_amount:', parsedData.trip.total_amount);
        console.log('Trip amount:', parsedData.trip.amount);
        
        // Check offers if they exist
        if (Array.isArray(parsedData.trip.offers) && parsedData.trip.offers.length > 0) {
          console.log('First offer keys:', Object.keys(parsedData.trip.offers[0]));
          console.log('First offer total_amount:', parsedData.trip.offers[0].total_amount);
          console.log('First offer amount:', parsedData.trip.offers[0].amount);
          
          // Check for nested price objects
          if (parsedData.trip.offers[0].price) {
            console.log('First offer price object:', parsedData.trip.offers[0].price);
          }
          
          if (parsedData.trip.offers[0].total_price) {
            console.log('First offer total_price object:', parsedData.trip.offers[0].total_price);
          }
        }
      }
      
      setBookingData(parsedData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading booking data:', err);
      setError('Failed to load booking data');
      setLoading(false);
    }
  }, [router]);
    // Fallback for amount and currency if not provided
    const displayAmount = priceInfo?.total || parseFloat(amount || bookingData?.trip?.price?.total || '0').toFixed(2);
    const displayCurrency = currency || bookingData?.trip?.price?.currency || '€';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl lg:max-w-7xl">
          <div className="text-center">
            
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Loading your booking details...</h2>
            <p className="text-gray-500">Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl lg:max-w-7xl">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-red-200">
            <div className="text-red-500 text-6xl mb-4 animate-bounce">
              <FiCheckCircle className="rotate-45 mx-auto text-red-500" style={{ transform: 'rotate(45deg)' }} /> {/* Using a rotated check for 'x' */}
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-3">Oops! Something went wrong.</h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {error || 'We were unable to load your booking details. This might be a temporary issue. Please try again.'}
            </p>
            <button
              onClick={() => router.push('/book')}
              className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition-all duration-300 transform hover:scale-105"
            >
              Back to Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl lg:max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 text-sm sm:text-base"
          >
            <FiArrowLeft className="mr-2" /> Back
          </button>
          <h1 className="text-xl font-bold text-gray-900 mt-4 sm:text-2xl sm:mt-6">Complete Payment</h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">Review and confirm your payment details</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-5">
          {/* Left side - Booking Summary */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-[#5D4037] mb-7">Your Booking Summary</h2>

              {/* Passenger Details */}
              <div className="border-t border-orange-200 pt-7 mt-7">
                <h3 className="text-xl font-semibold text-[#5D4037] mb-5">Passenger Details</h3>
                <div className="space-y-5">
                  {bookingData.passengers.map((passenger, index) => (
                    <div key={index} className="bg-amber-50 p-5 rounded-xl shadow-sm border border-amber-200">
                      <div className="font-bold text-gray-900 text-lg mb-2">
                        {passenger.title} {passenger.firstName} {passenger.lastName}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FiUser className="mr-3 text-gray-400 text-lg" />
                          {passenger.gender === 'm' ? 'Male' : passenger.gender === 'f' ? 'Female' : 'Other'}
                        </div>
                        <div className="flex items-center">
                          <FiCalendar className="mr-3 text-gray-400 text-lg" />
                          {new Date(passenger.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="flex items-center">
                          <FiGlobe className="mr-3 text-gray-400 text-lg" />
                          Nationality: {passenger.documentNationality}
                        </div>
                        <div className="flex items-center">
                          <FiCreditCard className="mr-3 text-gray-400 text-lg" />
                          Document: {passenger.documentNumber}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flight Itinerary */}
              <div className="border-t border-orange-200 pt-7 mt-7">
                <h3 className="text-xl font-semibold text-[#5D4037] mb-5">Flight Details</h3>
                {bookingData.trip?.itineraries?.[0] && (
                  <div className="mb-7">
                    <div className="flex items-center mb-3 text-lg">
                      <span className="font-bold text-[#5D4037]">Outbound Flight</span>
                      <span className="mx-3 text-gray-400">•</span>
                      <span className="text-base text-gray-600">
                        {formatDate(bookingData.searchParams.departureDate)}
                      </span>
                    </div>
                    <div className="pl-2 border-l-4 border-orange-200">
                      {/* Placeholder for FlightItineraryCard */}
                       <FlightItineraryCard
                        itinerary={bookingData.trip.itineraries[0]}
                        type="outbound"
                        date={bookingData.searchParams.departureDate}
                        airports={[
                          { iata_code: bookingData.trip.itineraries[0].segments[0].departure.iataCode },
                          { iata_code: bookingData.trip.itineraries[0].segments[0].arrival.iataCode }
                        ]}
                      /> 
                    </div>
                  </div>
                )}

                {bookingData.searchParams.tripType === 'roundtrip' && bookingData.trip?.itineraries?.[1] && (
                  <div>
                    <div className="flex items-center mb-3 text-lg">
                      <span className="font-bold text-[#5D4037]">Return Flight</span>
                      <span className="mx-3 text-gray-400">•</span>
                      <span className="text-base text-gray-600">
                        {formatDate(bookingData.searchParams.returnDate || '')}
                      </span>
                    </div>
                    <div className="pl-2 border-l-4 border-orange-200">
                      {/* Placeholder for FlightItineraryCard */}
                      <FlightItineraryCard
                        itinerary={bookingData.trip.itineraries[1]}
                        type="return"
                        date={bookingData.searchParams.returnDate || ''}
                        airports={[
                          { iata_code: bookingData.trip.itineraries[1].segments[0].departure.iataCode },
                          { iata_code: bookingData.trip.itineraries[1].segments[0].arrival.iataCode }
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Price Summary Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-bold  mb-6 text-[#5D4037]">Price Details</h2>
                <div className="w-full space-y-4 text-lg">
                    {/* Flight Price */}
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-600">Flight Price</span>
                        <span className="font-semibold text-gray-800">
                            {bookingData?.trip?.price?.currency || '€'}
                            {parseFloat(bookingData?.trip?.price?.total || '0').toFixed(2)}
                        </span>
                    </div>

                    {/* Hotel Price if available */}
                    {parseFloat(bookingData?.trip?.price?.breakdown?.hotel || '0') > 0 && (
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <span className="text-gray-600">Hotel Price</span>
                            <span className="font-semibold text-gray-800">
                                {bookingData?.trip?.price?.breakdown?.currency || '€'}
                                {parseFloat(bookingData?.trip?.price?.breakdown?.hotel).toFixed(2)}
                            </span>
                        </div>
                    )}

                    {/* Markup Fee */}
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-600">
                            Markup Fee ({bookingData?.trip?.price?.breakdown?.totalPassengers} × {displayCurrency}
                            {parseFloat(bookingData?.trip?.price?.breakdown?.markup || '1.00').toFixed(2)})
                        </span>
                        <span className="font-semibold text-gray-800">
                            {displayCurrency}
                            {((bookingData?.trip?.price?.breakdown?.markup || 1) * bookingData?.trip?.price?.breakdown?.totalPassengers).toFixed(2)}
                        </span>
                    </div>

                    {/* Service Fee */}
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-600">
                            Service Fee ({bookingData?.trip?.price?.breakdown?.totalPassengers} × {displayCurrency}
                            {parseFloat(bookingData?.trip?.price?.breakdown?.serviceFee || '2.00').toFixed(2)})
                        </span>
                        <span className="font-semibold text-gray-800">
                            {displayCurrency}
                            {(parseFloat(bookingData?.trip?.price?.breakdown?.serviceFee || '2.00') * bookingData?.trip?.price?.breakdown?.totalPassengers).toFixed(2)}
                        </span>
                    </div>

                    {/* Total Summary */}
                    <div className="pt-4 flex justify-between font-bold text-xl">
                        <span>Total Amount</span>
                        <span className="text-[#FFB800]">{displayCurrency} {displayAmount}</span>
                    </div>
                </div>

                <div className="text-sm text-gray-500 mt-4 text-right">
                    Includes all taxes and fees
                </div>
            </div>
          </div>

          {/* Right side - Payment Form */}
          <div className="lg:w-120 lg:sticky lg:top-4">
            <div className="rounded-2xl shadow-xl bg-white border border-amber-100 p-8">
              <h2 className="text-2xl font-bold text-[#5D4037]">Payment Information</h2>
             
                <AnimatedStepCharacter 
                lottieUrl="https://lottie.host/95c3d083-31e6-486d-bebd-375c3b7e8b13/UOk0JnYYHG.json"
                alt="Booking Confirmed"
                className="w-60 h-60 mx-auto mb-0"
              />
              
              {loading ? (
                <div className="text-center bg-gray-50 rounded-xl">
                  {/* Lottie Animation for payment form loading */}
                  <div className="w-32 h-32 mx-auto p-0">
                    {/* <Lottie options={{ ...defaultOptions, animationData: animationData }} height={128} width={128} /> */}
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mx-auto"></div>
                  </div>
                  <p className="mt-4 text-gray-600 text-lg">Initializing secure payment form...</p>
                  <p className="text-sm text-gray-500">This might take a moment.</p>
                </div>
              ) : error ? (
                <div className="p-6 bg-red-100 text-red-800 rounded-xl border border-red-300">
                  <p className="font-bold text-lg mb-2">Error loading payment form</p>
                  <p className="text-base mt-1">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 text-base text-red-600 hover:text-red-700 font-medium underline"
                  >
                    Click here to try again
                  </button>
                </div>
              ) : clientToken ? (
                <div className=" w-full">
                <PaymentForm 
                onSubmit={handlePaymentSubmit} 
                loading={false}
                clientToken={clientToken}
                error={null}
                amount={priceInfo?.total || parseFloat(amount || bookingData?.trip?.price?.total || '0')}
                currency={bookingData.trip.price?.currency || 'EUR'}
                onPaymentSuccess={async (paymentIntentId, paymentResult) => {
                  console.log('Payment successful, paymentIntentId:', paymentIntentId);
                  console.log('Payment result:', paymentResult);
                  
                  try {
                    // First, confirm the payment with the backend to get the booking reference
                    setLoading(true);
                    
                    // Log the offer ID for debugging
                    console.log('Using offer ID for booking:', bookingData.trip.id);
                    console.log('Trip data:', {
                      id: bookingData.trip.id,
                      price: bookingData.trip.price,
                      slice: bookingData.trip.slices?.[0]
                    });
                    
                    const confirmResponse = await fetch('/api/book-flight/confirm-payment', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        paymentIntentId,
                        paymentMethod: 'card',
                        amount: bookingData.trip.price?.total || 0,
                        currency: bookingData.trip.price?.currency || 'EUR',
                        offerId: bookingData.trip.id,
                        // Include all offer IDs for roundtrip bookings
                        offerIds: bookingData.trip.returnOfferId 
                          ? [bookingData.trip.id, bookingData.trip.returnOfferId]
                          : [bookingData.trip.id],
                        passengers: bookingData.passengers,
                        metadata: {
                          ...(bookingData.metadata || {}),
                          source: 'web-booking',
                          tripType: bookingData.searchParams.tripType,
                        },
                        isConfirming: true,
                      }),
                    });

                    const result = await confirmResponse.json();
                    
                    if (!result.success) {
                      setLoading(false);
                      
                      // Only redirect for specific offer-related errors
                      const isOfferError = result.status === 'offer_invalid' || 
                       result.status === 'offer_expired' ||
                       (result.error && 
                        (result.error.includes('offer') || 
                        result.error.includes('expired') ||
                        result.error.includes('no longer available')));
                      
                      if (isOfferError) {
                        // Clear any stored booking data
                        sessionStorage.removeItem('current_booking_data');
                        localStorage.removeItem('current_booking_data');
                        
                        // Show error message to user
                        setError('The selected flight is no longer available. Please search for a new flight.');
                        
                        // Redirect to search page after a delay
                        setTimeout(() => {
                          const searchParams = new URLSearchParams({
                            error: 'offer_expired',
                            message: 'The selected flight is no longer available. Please search for flights again.'
                          });
                          window.location.href = `/search?${searchParams.toString()}`;
                        }, 3000); // Give user time to read the message
                        return;
                      }
                      
                      // For other errors, show the error message
                      const errorMessage = result.error || 'Failed to process your booking. Please try again.';
                      setError(errorMessage);
                      return;
                    }

                    // Prepare complete booking data for confirmation page
                    const bookingReference = result.bookingReference || result.order?.booking_reference || `BOOK-${Date.now()}`;
                    const completeBookingData = {
                      ...bookingData,
                      payment: {
                        status: 'succeeded',
                        amount: result.order?.total_amount || bookingData.trip.price?.total || 0,
                        currency: result.order?.total_currency || bookingData.trip.price?.currency || 'EUR',
                        paymentMethod: paymentResult?.paymentMethod || 'card',
                        lastFour: paymentResult?.lastFour || '••••',
                        brand: paymentResult?.brand || 'card',
                        timestamp: new Date().toISOString(),
                        paymentIntentId: paymentIntentId,
                      },
                      bookingId: result.order?.id || `booking-${Date.now()}`,
                      bookingReference: bookingReference,
                      status: result.order?.status || 'confirmed',
                      createdAt: new Date().toISOString(),
                      order: {
                        ...(result.order || {}),
                        booking_reference: bookingReference,
                        status: result.order?.status || 'confirmed',
                        payment_status: 'paid',
                      },
                    };

                    console.log('Complete booking data for confirmation:', {
                      ...completeBookingData,
                      payment: {
                        ...completeBookingData.payment,
                        // Redact sensitive data from logs
                        lastFour: '••••',
                      },
                    });

                    // Store complete booking data in localStorage for the confirmation page
                    localStorage.setItem('lastBooking', JSON.stringify(completeBookingData));
                    
                    // Clear booking data from session storage
                    sessionStorage.removeItem('current_booking_data');
                    
                    // Redirect to confirmation page with all necessary data
                    const searchParams = new URLSearchParams({
                      bookingId: completeBookingData.bookingId,
                      ref: completeBookingData.bookingReference,
                      status: 'succeeded',
                      paymentStatus: 'paid',
                      amount: completeBookingData.payment.amount.toString(),
                      currency: completeBookingData.payment.currency,
                    }).toString();
                    
                    router.push(`/confirmation?${searchParams}`);
                    
                  } catch (error: unknown) {
                    console.error('Error processing payment success:', error);
                    setLoading(false);
                    
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    
                    // Only show offer expired message if it's specifically about offers
                    if (errorMessage.includes('offer') && 
                        (errorMessage.includes('expired') || 
                         errorMessage.includes('no longer available') ||
                         errorMessage.includes('not found'))) {
                      setError('The selected flight is no longer available. Please search for a new flight.');
                      
                      // Clear stored data
                      sessionStorage.removeItem('current_booking_data');
                      localStorage.removeItem('current_booking_data');
                      
                      // Redirect to search after a delay
                      setTimeout(() => {
                        const searchParams = new URLSearchParams({
                          error: 'offer_expired',
                          message: 'The selected flight is no longer available. Please search for flights again.'
                        });
                        window.location.href = `/search?${searchParams.toString()}`;
                      }, 3000);
                    } else {
                      // For other errors, show a generic error message
                      setError('Payment was successful but there was an error processing your booking. Please contact support with your payment reference.');
                    }
                  }
                }}
                onPaymentError={(errorMessage) => {
                  console.error('Payment error:', errorMessage);
                  setError(errorMessage);
                }}
                paymentIntentId={paymentIntentId}
              />
              </div>
              ) : (
                <div className="p-6 bg-yellow-100 text-yellow-800 rounded-xl border border-yellow-300">
                  <p className="font-bold text-lg mb-2">Unable to initialize payment.</p>
                  <p className="text-base">Please refresh the page or try again later. If the problem persists, contact support.</p>
                </div>
              )}
            </div>

            {/* Security and Policy Information */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl shadow-inner text-sm text-gray-600 border border-gray-100">
              <p className="flex items-start mb-3">
                <FiCheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0 text-xl" />
                <span className="font-medium text-gray-700">Your payment is secure and encrypted with industry-standard protocols.</span>
              </p>
              <p className="flex items-start">
                <span className="mr-3 mt-1 flex-shrink-0"></span> {/* Placeholder for alignment */}
                <span>
                  By completing this booking, you agree to our <a href="/terms" className="text-orange-600 hover:underline font-medium">Terms of Service</a> and <a href="/privacy" className="text-orange-600 hover:underline font-medium">Privacy Policy</a>.
                </span>
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}