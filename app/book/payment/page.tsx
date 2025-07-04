'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { AncillaryState } from '@/types/Ancillary';
import { computePricing, PricingBreakdown as BasePricingBreakdown, PricingBreakdown } from '@/lib/pricing';
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
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const [serverCurrency, setServerCurrency] = useState<string>('EUR');
  const [serverBreakdown, setServerBreakdown] = useState<any>(null);
  const [amount, setAmount] = useState<string>('0');
  const [ancillaryTotal, setAncillaryTotal] = useState<string>('0');
  const [currency, setCurrency] = useState<string>('EUR');
  const [priceInfo, setPriceInfo] = useState<PricingBreakdown | null>(null);

  // Function to fetch ancillary details from Duffel API
  const fetchAncillaryDetails = async (offerId: string) => {
    try {
      console.log('Fetching ancillary details for offer:', offerId);
      
      // First check if we have selected ancillaries in the payment payload
      const paymentPayloadStr = sessionStorage.getItem('payment_payload');
      const paymentPayload = paymentPayloadStr ? JSON.parse(paymentPayloadStr) : null;
      
      console.log('Payment payload from session storage:', paymentPayload);
      
      // If we have selected ancillaries from the booking page, use those instead of fetching all available ones
      if (paymentPayload?.ancillarySelection) {
        console.log('Using selected ancillaries from booking page:', paymentPayload.ancillarySelection);
        
        // Format the selected ancillary rows for display
        const selectedAncillaryRows = paymentPayload.ancillarySelection.services?.map((service: any) => ({
          title: service.title || service.name || 'Extra Service',
          type: service.type || 'ancillary',
          amount: parseFloat(service.amount || service.total_amount || '0'),
          details: service.details || `${service.type || 'Extra'} service`,
          passengerName: service.passengerName || `Passenger ${service.passenger_id || service.passenger_ids?.[0] || ''}`,
          segmentInfo: service.segmentInfo || `Segment ${service.segment_id || service.segment_ids?.[0] || ''}`,
          passenger: service.passenger_id || service.passenger_ids?.[0],
          segment: service.segment_id || service.segment_ids?.[0]
        })) || [];
        
        console.log('Formatted ancillary rows for display:', selectedAncillaryRows);
        
        // Calculate total from selected ancillaries only
        const selectedAncillaryTotal = selectedAncillaryRows.reduce((sum: number, row: any) => sum + row.amount, 0);
        
        console.log(`Using ${selectedAncillaryRows.length} selected ancillary items with total: ${selectedAncillaryTotal}`);
        
        // Update price info with selected ancillary details
        updatePriceInfoWithAncillaries(selectedAncillaryRows, selectedAncillaryTotal);
        
        return { ancillaryRows: selectedAncillaryRows, ancillaryTotal: selectedAncillaryTotal };
      }
      
      // If we don't have selected ancillaries, check if we have a breakdown with selected flag
      if (paymentPayload?.breakdown) {
        // Only include ancillaries that are explicitly marked as selected
        const selectedBreakdown = paymentPayload.breakdown.filter((item: any) => item.selected === true);
        
        if (selectedBreakdown.length > 0) {
          console.log(`Using ${selectedBreakdown.length} selected items from breakdown`);
          const selectedTotal = selectedBreakdown.reduce((sum: number, item: any) => sum + item.amount, 0);
          
          // Update price info with selected ancillary details
          updatePriceInfoWithAncillaries(selectedBreakdown, selectedTotal);
          
          return { ancillaryRows: selectedBreakdown, ancillaryTotal: selectedTotal };
        }
      }
      
      // If we don't have any selected ancillaries from the booking page,
      // return empty arrays to avoid including unselected ancillaries
      console.log('No selected ancillaries found, returning empty breakdown');
      
      // Update price info with empty ancillary details
      updatePriceInfoWithAncillaries([], 0);
      
      return { ancillaryRows: [], ancillaryTotal: 0 };
    } catch (error) {
      console.error('Error fetching ancillary details:', error);
      
      // Update price info with empty ancillary details on error
      updatePriceInfoWithAncillaries([], 0);
      
      return { ancillaryRows: [], ancillaryTotal: 0 };
    }
  };
  
  // Helper function to update price info with ancillary details
  const updatePriceInfoWithAncillaries = (ancillaryRows: any[], ancillaryTotal: number) => {
    console.log('Updating price info with ancillary details:', { ancillaryRows, ancillaryTotal });
    
    // Ensure ancillary rows have all required properties for display
    const enhancedAncillaryRows = ancillaryRows.map(row => ({
      ...row,
      // Ensure these fields exist for the UI
      details: row.details || `${row.type || 'Extra'} service`,
      passengerName: row.passengerName || row.passenger || `Passenger`,
      segmentInfo: row.segmentInfo || row.segment || `Flight segment`
    }));
    
    console.log('Enhanced ancillary rows for display:', enhancedAncillaryRows);
    
    setPriceInfo((prev: PricingBreakdown | null) => {
      if (!prev) {
        console.error('No previous price info found, cannot update');
        return null;
      }
      
      // Update existing price info with enhanced rows
      const updated = {
        ...prev,
        ancillaryRows: enhancedAncillaryRows, // Use the enhanced rows instead of original rows
        ancillaryTotal,
        total: prev.base + prev.markupTotal + prev.serviceTotal + ancillaryTotal
      };
      
      console.log('Total calculation breakdown:', {
        flightPrice: prev.base,
        markupTotal: prev.markupTotal,
        serviceTotal: prev.serviceTotal,
        ancillaryTotal,
        calculatedTotal: prev.base + prev.markupTotal + prev.serviceTotal + ancillaryTotal
      });
      
      console.log('Updated price info:', updated);
      return updated;
    });
  };
  
  // Add debug logging for priceInfo
  useEffect(() => {
    if (priceInfo) {
      console.log('Current priceInfo state:', priceInfo);
      console.log('Ancillary rows available:', priceInfo.ancillaryRows?.length || 0);
      
      // Calculate total amount for payment form when priceInfo changes
      if (bookingData?.trip?.price) {
        const totalAmount = (
          parseFloat(bookingData.trip.price.total || '0') + 
          (priceInfo.markupTotal || 0) + 
          (priceInfo.serviceTotal || 0) + 
          (priceInfo.ancillaryTotal || 0)
        ).toFixed(2);
        
        // Update the amount for payment form
        setAmount(totalAmount);
        console.log('Updated payment amount:', totalAmount);
      }
    }
  }, [priceInfo, bookingData]);

  // Fetch booking data and create payment intent on mount
  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        setLoading(true);
        // Get both payment payload and booking data
        const [paymentPayload, bookingData] = await Promise.all([
          sessionStorage.getItem('payment_payload'),
          sessionStorage.getItem('current_booking_data')
        ].map(item => item ? JSON.parse(item) : null));

        // Merge data with proper fallbacks
        const mergedData = {
          ...(bookingData || {}),
          ...(paymentPayload || {}),
          passengers: paymentPayload?.passengers || bookingData?.passengers || []
        };

        setBookingData(mergedData);
        
        // Extract amount and currency with proper fallbacks
        const isRoundtrip = mergedData.searchParams?.tripType === 'roundtrip';
        let localBaseAmount = '0';
        let localCurrency = 'EUR';
        
        if (isRoundtrip && mergedData.trip?.price?.total) {
          // Use the total price directly from Duffel for roundtrip
          localBaseAmount = mergedData.trip.price.total;
          localCurrency = mergedData.trip.price.currency || 'EUR';
        } else if (isRoundtrip && mergedData.trip?.price?.breakdown) {
          // If we have a breakdown but no total, use the outbound price as the total
          // since Duffel returns a single price for roundtrip
          localBaseAmount = mergedData.trip.price.breakdown.outbound || '0';
          localCurrency = mergedData.trip.price.breakdown.currency || 'EUR';
        } else {
          // For one-way, use the total amount
          localBaseAmount = mergedData.trip?.price?.total || 
                     mergedData.trip?.price?.breakdown?.basePrice || 
                     '0';
          localCurrency = mergedData.trip?.price?.currency || 
                   mergedData.trip?.price?.breakdown?.currency || 
                   'EUR';
        }
        
        // Get ancillary amount from canonical payment payload if available
        const ancillaryTotalCanonical = paymentPayload?.priceInfo?.ancillary || 
          (paymentPayload?.breakdown ? paymentPayload.breakdown.reduce((s: number, b: any) => s + b.amount, 0) : 0);
        
        console.log('Ancillary total from canonical:', ancillaryTotalCanonical);
        
        // If we have a canonical total from the booking page, use that directly
        // This ensures we use the exact same total that was calculated in the booking page
        let finalTotal = 0;
        let localAmount = '';
        let breakdown: BasePricingBreakdown;
        
        if (paymentPayload?.priceInfo?.total) {
          // Use the pre-calculated total that includes ancillaries
          console.log('Using canonical total price:', paymentPayload.priceInfo.total);
          finalTotal = parseFloat(paymentPayload.priceInfo.total);
          localAmount = finalTotal.toString();
          
          // Create a breakdown for display purposes
          breakdown = computePricing({
            baseAmount: parseFloat(localBaseAmount),
            passengers: mergedData.passengers?.length || 1,
            currency: localCurrency,
            ancillaryTotal: ancillaryTotalCanonical,
          });
          // Override the total with our canonical value
          breakdown.total = finalTotal;
        } else {
          // Fall back to computing the price if we don't have a canonical total
          breakdown = computePricing({
            baseAmount: parseFloat(localBaseAmount),
            passengers: mergedData.passengers?.length || 1,
            currency: localCurrency,
            ancillaryTotal: ancillaryTotalCanonical,
          });
          finalTotal = parseFloat(breakdown.total.toFixed(2));
          localAmount = finalTotal.toString();
          console.log('Computed total price:', finalTotal);
        }

        // Save breakdown for display & downstream components
        // Make sure to include ancillaryRows from the payload if available
        // Following Duffel's guide for adding extra bags
        let ancillaryRows = [];
        
        // First try to get ancillary data from the payload services
        if (paymentPayload?.ancillarySelection?.services && 
            Array.isArray(paymentPayload.ancillarySelection.services) && 
            paymentPayload.ancillarySelection.services.length > 0) {
          
          console.log('Using ancillary services from payload:', paymentPayload.ancillarySelection.services.length);
          
          ancillaryRows = paymentPayload.ancillarySelection.services.map((service: any) => ({
            title: service.title || service.type || 'Extra Service',
            type: service.type || 'ancillary',
            amount: parseFloat(service.amount || service.total_amount || '0'),
            currency: service.currency || localCurrency,
            passengerId: service.passengerId || '',
            passengerName: service.passengerName || '',
            details: service.details || `${service.type || 'Extra service'}`
          }));
        } 
        // If no services in payload, try to get from ancillaryBreakdown
        else if (paymentPayload?.ancillaryBreakdown) {
          try {
            const parsedBreakdown = typeof paymentPayload.ancillaryBreakdown === 'string' 
              ? JSON.parse(paymentPayload.ancillaryBreakdown) 
              : paymentPayload.ancillaryBreakdown;
              
            if (Array.isArray(parsedBreakdown)) {
              console.log('Using ancillary breakdown from payload:', parsedBreakdown.length);
              ancillaryRows = parsedBreakdown;
            }
          } catch (e) {
            console.error('Error parsing ancillary breakdown:', e);
          }
        }
        
        console.log('Setting price info with ancillary rows:', ancillaryRows);
        setPriceInfo({ 
          ...breakdown, 
          ancillaryTotal: ancillaryTotalCanonical, 
          total: finalTotal,
          ancillaryRows: ancillaryRows.length > 0 ? ancillaryRows : (paymentPayload?.priceInfo?.ancillaryRows || [])
        });
        if (paymentPayload?.breakdown) {
          // Only include selected ancillaries in the breakdown and total
          const selectedAncillaries = paymentPayload.breakdown.filter((b: any) => b.selected !== false);
          
          // Use ancillary prices directly from the Duffel component (markup already applied via ANCILLARY_MARKUP)
          const ancillaryTotal = selectedAncillaries.reduce(
            (sum: number, service: any) => sum + parseFloat(service.amount || service.total_amount || '0'), 
            0
          );
          
          console.log('Selected ancillaries:', selectedAncillaries);
          console.log('Ancillary total:', ancillaryTotal);
          
          setPriceInfo((prev: PricingBreakdown | null) => {
            if (!prev) return null;
            
            const updatedTotal = prev.base + prev.markupTotal + prev.serviceTotal + ancillaryTotal;
            console.log('Updated total calculation:', {
              base: prev.base,
              markupTotal: prev.markupTotal,
              serviceTotal: prev.serviceTotal,
              ancillaryTotal: ancillaryTotal,
              calculatedTotal: updatedTotal
            });
            
            return {
              ...prev,
              ancillaryRows: selectedAncillaries,
              ancillaryTotal: ancillaryTotal,
              total: updatedTotal
            };
          });
        }
        
        // Update state variables
        setCurrency(localCurrency);
        setAmount(localAmount);
        
        console.log('Creating payment intent with:', { 
          amount: localAmount, 
          currency: localCurrency,
          paymentIntentId: mergedData.paymentIntentId || undefined,
          hasAncillaries: !!mergedData.ancillarySelection
        });
        
        // Create payment intent with server-side calculation
        // Ensure we're using the same pricing logic as in the booking page
        const passengerCount = mergedData.passengers?.length || bookingData?.passengers?.length || 1;
        
        // IMPORTANT: Extract the FLIGHT BASE PRICE ONLY (excluding ancillaries)
        // This is the price from Duffel API before any ancillaries are added
        const flightBasePrice = parseFloat(bookingData?.trip?.price?.total || '0');
        const ancillaryTotal = priceInfo?.ancillaryTotal || 0;
        
        console.log('Payment calculation - separated components:', {
          flightBasePrice,
          ancillaryTotal,
          passengerCount
        });
        
        // Use computePricing directly to ensure consistent pricing logic
        // but with flight price only (no ancillaries)
        const pricingResult = computePricing({
          baseAmount: flightBasePrice,
          passengers: passengerCount,
          // DO NOT include ancillary total in computePricing
          // It will be added separately by the server
          ancillaryTotal: 0
        });
        
        // Calculate flight price with markup (excluding ancillaries)
        const flightPriceWithMarkup = pricingResult.total.toFixed(2);
        console.log('Payment intent calculation using computePricing:', {
          flightBasePrice,
          passengers: passengerCount,
          markupTotal: pricingResult.markupTotal,
          serviceTotal: pricingResult.serviceTotal,
          ancillaryTotal,
          calculatedTotal: flightPriceWithMarkup
        });
        
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Use the flight price with markup (excluding ancillaries)
            // The server will add ancillaries separately
            amount: flightPriceWithMarkup,
            currency: localCurrency,
            paymentIntentId: mergedData.paymentIntentId || undefined,
            offerId: bookingData.trip.id || bookingData.trip.offerId,
            // Include pricing breakdown from computePricing for the API
            metadata: {
              passengerCount,
              baseFlightPrice: flightBasePrice,
              markupTotal: pricingResult.markupTotal,
              serviceTotal: pricingResult.serviceTotal,
              ancillaryTotal
            },
            ancillarySelection: mergedData.ancillarySelection
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
        
        // Store server-calculated amount and breakdown if available
        if (result.amount) {
          console.log('Using server-calculated amount:', result.amount);
          setServerAmount(result.amount);
          setServerCurrency(result.currency || localCurrency);
          
          if (result.breakdown) {
            console.log('Server provided price breakdown:', result.breakdown);
            setServerBreakdown(result.breakdown);
          }
        }
        
        console.log('Payment intent response:', {
          status: response.status,
          ok: response.ok,
          result: safeResult,
          hasClientToken: !!(result.clientToken || result.client_token || result.data?.clientToken || result.data?.client_token),
          serverAmount: result.amount
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
            // Use server-calculated amount if available, otherwise fall back to client-side calculation
            amount: serverAmount !== null ? serverAmount : (
                bookingData.trip.offers?.[0]?.total_amount || 
                bookingData.trip.price?.total || 
                bookingData.trip.total_amount || 
                bookingData.trip.amount || 
                0
            ),
            currency: serverCurrency || bookingData.trip.price?.currency || bookingData.trip.total_currency || 'EUR',
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
      
      // Initialize priceInfo with data from booking data
      const passengers = parsedData.passengers?.length || 1;
      const baseAmount = parseFloat(parsedData.trip?.price?.base || '0');
      const totalAmount = parseFloat(parsedData.trip?.price?.total || '0');
      const markupPerPassenger = parseFloat(parsedData.trip?.price?.breakdown?.markup || '1');
      const servicePerPassenger = parseFloat(parsedData.trip?.price?.breakdown?.serviceFee || '2');
      
      // Debug log all potential ancillary data sources
      console.log('Checking ancillary data sources:', {
        hasAncillaryBreakdown: !!parsedData.ancillaryBreakdown,
        ancillaryBreakdownType: typeof parsedData.ancillaryBreakdown,
        hasAncillarySelection: !!parsedData.ancillarySelection,
        ancillarySelectionType: typeof parsedData.ancillarySelection,
        hasAncillaryPayment: !!parsedData.ancillaryPayment,
        tripPriceBreakdown: parsedData.trip?.price?.breakdown
      });
      
      // Get ancillary information from booking data
      const ancillaryTotal = parseFloat(parsedData.trip?.price?.breakdown?.ancillaryTotal || '0');
      console.log('Found ancillary total in booking data:', ancillaryTotal);
      
      // Create ancillary rows from the breakdown if available
      let ancillaryRows: any[] = [];
      
      // Try multiple sources for ancillary data, in order of preference
      
      // 1. First try ancillaryBreakdown if it exists
      if (parsedData.ancillaryBreakdown) {
        try {
          // Handle both string and object formats
          const breakdown = typeof parsedData.ancillaryBreakdown === 'string' 
            ? JSON.parse(parsedData.ancillaryBreakdown)
            : parsedData.ancillaryBreakdown;
            
          console.log('Parsed ancillary breakdown:', breakdown);
          
          if (Array.isArray(breakdown) && breakdown.length > 0) {
            ancillaryRows = breakdown.map((item: any) => ({
              type: item.type || 'ancillary',
              title: item.title || item.name || item.type?.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) || 'Extra',
              amount: parseFloat(item.amount || item.price || '0'),
              selected: true,
              passenger: item.passenger_id ? 
                parsedData.passengers?.find((p: any) => p.id === item.passenger_id)?.firstName || 'Passenger' : 
                'All Passengers',
              segment: item.segment_id ? 
                `for ${item.segment_id.includes('outbound') ? 'Outbound' : 'Return'} Flight` : 
                '',
              details: item.description || item.details || '',
              originalItem: item
            }));
          }
        } catch (e) {
          console.error('Error parsing ancillary breakdown:', e);
        }
      }
      
      // 2. Then try ancillarySelection if breakdown parsing failed or returned no items
      if (ancillaryRows.length === 0 && parsedData.ancillarySelection) {
        try {
          // Handle both string and object formats
          const selection = typeof parsedData.ancillarySelection === 'string'
            ? JSON.parse(parsedData.ancillarySelection)
            : parsedData.ancillarySelection;
            
          console.log('Using ancillary selection:', selection);
          
          if (selection.services && Array.isArray(selection.services)) {
            ancillaryRows = selection.services.map((service: any) => {
              // Extract detailed information from the service
              const serviceType = service.type || 'Extra';
              const serviceTitle = service.title || service.name || service.type || 'Selected Extra';
              const serviceAmount = parseFloat(service.amount || service.total_amount || '0');
              
              // Extract passenger information if available
              const passengerName = service.passenger_id ? 
                parsedData.passengers?.find((p: any) => p.id === service.passenger_id)?.firstName || 'Passenger' : 
                'All Passengers';
              
              // Extract segment information if available
              const segmentInfo = service.segment_id ? 
                `for ${service.segment_id.includes('outbound') ? 'Outbound' : 'Return'} Flight` : 
                '';
              
              // Extract detailed information based on service type
              let details = '';
              if (serviceType === 'bags') {
                details = `${service.quantity || 1}x ${service.weight || ''} ${service.unit || 'kg'} bag`;
              } else if (serviceType === 'seats') {
                details = `Seat ${service.seat_designation || ''} ${service.cabin_class || 'Economy'}`;
              } else {
                details = service.description || '';
              }
              
              return {
                type: serviceType,
                title: serviceTitle,
                amount: serviceAmount,
                selected: true,
                passenger: passengerName,
                segment: segmentInfo,
                details: details,
                originalService: service
              };
            });
          }
        } catch (e) {
          console.error('Error parsing ancillary selection:', e);
        }
      }
      
      // 3. Finally try to extract from payment payload if available
      if (ancillaryRows.length === 0 && parsedData.paymentPayload) {
        try {
          const payload = typeof parsedData.paymentPayload === 'string'
            ? JSON.parse(parsedData.paymentPayload)
            : parsedData.paymentPayload;
            
          console.log('Checking payment payload for ancillary data:', payload);
          
          if (payload.ancillaryPayment) {
            // Create a generic entry based on the ancillary payment
            ancillaryRows = [{
              type: 'ancillary',
              title: 'Selected Extras',
              amount: parseFloat(payload.ancillaryPayment.amount || '0'),
              selected: true,
              passenger: 'All Passengers',
              segment: '',
              details: 'Additional services selected during booking',
              originalPayload: payload.ancillaryPayment
            }];
          }
        } catch (e) {
          console.error('Error parsing payment payload:', e);
        }
      }
      
      // If we still have no ancillary rows but we know there's an ancillary total,
      // create a generic entry
      if (ancillaryRows.length === 0 && ancillaryTotal > 0) {
        ancillaryRows = [{
          type: 'ancillary',
          title: 'Selected Extras',
          amount: ancillaryTotal,
          selected: true,
          passenger: 'All Passengers',
          segment: '',
          details: 'Additional services selected during booking'
        }];
      }
      
      // Log the final ancillary rows
      console.log(`Found ${ancillaryRows.length} ancillary items:`, ancillaryRows);
      
      // Create initial priceInfo
      const initialPriceInfo: PricingBreakdown = {
        passengers,
        base: baseAmount,
        markupPerPassenger,
        servicePerPassenger,
        markupTotal: markupPerPassenger * passengers,
        serviceTotal: servicePerPassenger * passengers,
        total: totalAmount,
        currency: parsedData.trip?.price?.currency || 'EUR',
        ancillaryTotal: ancillaryTotal,
        ancillaryRows: ancillaryRows
      };
      
      console.log('Setting initial priceInfo:', initialPriceInfo);
      setPriceInfo(initialPriceInfo);
      
      // Fetch ancillary details if we have an offer ID
      if (parsedData.trip?.offerId || parsedData.trip?.id) {
        const offerId = parsedData.trip?.offerId || parsedData.trip?.id;
        console.log('Fetching ancillary details for offer ID:', offerId);
        fetchAncillaryDetails(offerId);
      } else {
        console.warn('No offer ID found in booking data, cannot fetch ancillary details');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading booking data:', err);
      setError('Failed to load booking data');
      setLoading(false);
    }
  }, [router]);
    // Fallback for amount and currency if not provided
    const displayAmount = priceInfo?.total.toFixed(2) || parseFloat(amount || bookingData?.trip?.price?.total || '0').toFixed(2);
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
                  {bookingData?.passengers?.map((passenger, index) => (
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
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mt-4">
                <h2 className="text-2xl font-bold text-[#5D4037]">Price Details</h2>
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
                            Markup Fee ({priceInfo?.passengers || bookingData?.passengers?.length || 1} × {displayCurrency}
                            {(priceInfo?.markupPerPassenger || 1).toFixed(2)})
                        </span>
                        <span className="font-semibold text-gray-800">
                            {displayCurrency}
                            {(priceInfo?.markupTotal || (bookingData?.passengers?.length || 1)).toFixed(2)}
                        </span>
                    </div>

                    {/* Service Fee */}
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-600">
                            Service Fee ({priceInfo?.passengers || bookingData?.passengers?.length || 1} × {displayCurrency}
                            {(priceInfo?.servicePerPassenger || 2).toFixed(2)})
                        </span>
                        <span className="font-semibold text-gray-800">
                            {displayCurrency}
                            {(priceInfo?.serviceTotal || ((bookingData?.passengers?.length || 1) * 2)).toFixed(2)}
                        </span>
                    </div>
                    
                    {/* Ancillary Options */}
                    {priceInfo?.ancillaryRows && priceInfo.ancillaryRows.length > 0 && (
                      <div className="mt-3 mb-3">
                        <div className="text-gray-700 font-medium mb-2">Selected Extras:</div>
                        {priceInfo.ancillaryRows.map((item: any, index: number) => (
                          <div key={index} className="flex flex-col py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 font-medium flex items-center">
                                <span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span>
                                {item.title || item.type || 'Extra'}
                              </span>
                              <span className="font-semibold text-gray-800">
                                {displayCurrency} {item.amount.toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Show detailed information */}
                            <div className="ml-4 text-sm text-gray-500">
                              {item.details && (
                                <div className="flex items-center gap-1">
                                  <span className="text-orange-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                  <span>{item.details}</span>
                                </div>
                              )}
                              
                              {/* Show passenger information */}
                              {(item.passengerName || item.passenger) && (
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                  <span>{item.passengerName || item.passenger}</span>
                                </div>
                              )}
                              
                              {/* Show segment information */}
                              {(item.segmentInfo || item.segment) && (
                                <div className="flex items-center gap-1">
                                  <span className="text-green-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                  <span>{item.segmentInfo || item.segment}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total Summary */}
                    <div className="pt-4 flex justify-between font-bold text-xl">
                        <span>Total Amount</span>
                        <span className="text-[#FFB800]">
                            {displayCurrency} {
                                serverAmount?.toFixed(2)
                            }
                        </span>
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
                onPaymentError={(error: any) => {
                  console.error('Payment error:', error);
                  const errorMessage = typeof error === 'string' ? error : (error && error.message) || 'Unknown error';
                  setError(`Payment failed: ${errorMessage}`);
                }}
                amount={serverAmount !== null ? serverAmount : parseFloat(amount || '0')}
                currency={serverCurrency || bookingData.trip?.price?.currency || 'EUR'}
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
                        offerId: bookingData.trip.id || bookingData.trip.offer_id,
                        paymentIntentId: paymentIntentId,
                        paymentMethod: paymentResult?.paymentMethod || {
                          type: 'card',
                          ...paymentResult
                        },
                        amount: serverAmount !== null ? serverAmount : (
                          parseFloat(bookingData?.trip?.price?.total || '0') + 
                          (priceInfo?.markupTotal || 0) + 
                          (priceInfo?.serviceTotal || 0) + 
                          (priceInfo?.ancillaryTotal || 0)
                        ),
                        currency: serverCurrency || bookingData?.trip?.price?.currency || 'EUR',
                        passengers: bookingData.passengers.map(p => ({
                          id: p.id,
                          title: p.title,
                          firstName: p.firstName,
                          lastName: p.lastName,
                          email: p.email,
                          phone: p.phone,
                          dateOfBirth: p.dateOfBirth,
                          gender: p.gender,
                          documentNumber: p.documentNumber,
                          documentIssuingCountryCode: p.documentIssuingCountryCode,
                          documentExpiryDate: p.documentExpiryDate,
                          documentNationality: p.documentNationality
                        })),
                        metadata: {
                          ...bookingData.metadata,
                          source: 'web-payment'
                        }
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
                    
                    // Format ancillary data for confirmation page
                    const ancillaryBreakdownArray = priceInfo?.ancillaryRows && priceInfo.ancillaryRows.length > 0 
                      ? priceInfo.ancillaryRows.map((item: any) => {
                          // Determine the type based on the item's type or title
                          let type = item.type || 'extra';
                          if (item.title?.toLowerCase().includes('bag')) type = 'bags';
                          else if (item.title?.toLowerCase().includes('seat')) type = 'seats';
                          else if (item.title?.toLowerCase().includes('cancel')) type = 'cancel_for_any_reason';
                          
                          // Format the title for display
                          const title = item.title || (type ? type.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) : 'Extra');
                          
                          // Create details string
                          let details = item.details || '';
                          if (item.segmentInfo && !details.includes(item.segmentInfo)) {
                            details = details ? `${details} • ${item.segmentInfo}` : item.segmentInfo;
                          }
                          
                          return {
                            type,
                            title,
                            details,
                            amount: parseFloat(item.amount || 0),
                            passenger: item.passengerId || '',
                            segmentInfo: item.segmentInfo || ''
                          };
                        })
                      : [];
                    
                    const completeBookingData = {
                      ...bookingData,
                      payment: {
                        status: 'succeeded',
                        amount: result.order?.total_amount || bookingData.trip.price?.total || 0,
                        currency: result.order?.total_currency || bookingData.trip.price?.currency || 'EUR',
                        paymentMethod: paymentResult?.paymentMethod || 'card',
                        lastFour: paymentResult?.lastFour || '••••',
                        timestamp: new Date().toISOString(),
                        paymentIntentId: paymentIntentId,
                      },
                      bookingId: result.order?.id || `booking-${Date.now()}`,
                      bookingReference: bookingReference,
                      status: result.order?.status || 'confirmed',
                      createdAt: new Date().toISOString(),
                      // Add ancillary data
                      ancillaryBreakdown: JSON.stringify(ancillaryBreakdownArray),
                      ancillaryAmount: priceInfo?.ancillaryTotal || 0,
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
                      paymentStatus: completeBookingData.payment.status,
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
                // onPaymentError is already defined above
                paymentIntentId={paymentIntentId || ''}
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