import { NextResponse } from 'next/server';
import { confirmPayment, createOrder, PassengerDetails, duffel } from '@/lib/duffel';
import { Duffel } from '@duffel/api';

type PaymentMethodData = {
  card: {
    number: string;
    expiry_month: string | number;
    expiry_year: string | number;
    cvc: string;
    name?: string;
  };
};

// Initialize the Duffel API client with the correct type
const duffelClient = new Duffel({
  token: process.env.DUFFEL_API!,
  debug: { verbose: true },
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Define the type for our offer object to fix TypeScript errors
    type DuffelOffer = {
      id: string;
      total_amount: string | number;
      total_currency?: string;
      slices?: any[];
      origin?: any;
      destination?: any;
      departing_at?: string;
    };
    
    // Initialize selectedOffer in the outer scope so it's accessible throughout the function
    let selectedOffer: DuffelOffer | null = null;
    
    const body = await request.json();
    const {
      paymentIntentId,
      paymentMethod,
      amount,
      currency,
      offerId,
      offerIds = [], // Support for multiple offer IDs
      passengers,
      metadata,
      isConfirming = false,
      isRoundtrip = false
    } = body;
    
    // For backward compatibility, if offerId is provided but offerIds is empty, use offerId
    let allOfferIds = offerId ? [offerId, ...(offerIds || [])] : offerIds || [];
    // Deduplicate offer IDs
    allOfferIds = Array.from(new Set(allOfferIds));
    
    if (allOfferIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one offer ID is required' },
        { status: 400 }
      );
    }
    
    // IMPORTANT: Duffel API requires exactly ONE offer per order
    // For roundtrip bookings, this should be a single offer that includes both legs
    // If we have multiple offers, we need to verify they're from the same offer request
    // and represent a single roundtrip journey
    
    console.log('Processing booking with offers:', {
      offerCount: allOfferIds.length,
      isRoundtrip,
      offerIds: allOfferIds
    });

    console.log('Received payment confirmation request:', {
      paymentIntentId,
      passengerCount: passengers?.length,
      isConfirming,
      amount,
      currency
    });

    // Validate required fields
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return NextResponse.json(
        { error: 'At least one passenger is required' },
        { status: 400 }
      );
    }

    // Format phone number to E.164 format required by Duffel API
    const formatPhoneNumber = (phone: string): string => {
      if (!phone) return '';
      
      // If it already has a +, ensure it's in the correct format
      if (phone.startsWith('+')) {
        // If it's a UK number with an extra 1 after + (e.g., +144...), remove the extra 1
        if (phone.startsWith('+144') && phone.length > 12) {
          return `+44${phone.substring(3)}`;
        }
        return phone;
      }
      
      // Remove all non-digit characters
      const digits = phone.replace(/\D/g, '');
      
      // Handle different phone number formats
      if (digits.startsWith('00')) {
        // Convert 00 prefix to +
        return `+${digits.substring(2)}`;
      } else if (digits.startsWith('0')) {
        // For UK numbers starting with 0, replace with +44
        if (digits.length > 10) { // Likely a UK number with area code
          return `+44${digits.substring(1)}`;
        }
        // For other local numbers, default to +1 (US/Canada)
        return `+1${digits.substring(1)}`;
      } else if (digits.startsWith('44')) {
        // If it's a UK number without the + prefix
        return `+${digits}`;
      } else if (digits.length > 0) {
        // If no country code provided, default to +1 (US/Canada)
        return `+1${digits}`;
      }
      
      return '';
    };

    // Format passengers for Duffel API
    const formattedPassengers: PassengerDetails[] = passengers.map(passenger => {
      const formattedPhone = formatPhoneNumber(passenger.phone);
      console.log('Formatted phone number:', {
        original: passenger.phone,
        formatted: formattedPhone
      });
      
      // Ensure gender is in the correct format (m/f/x)
      const formattedGender = 
        passenger.gender === 'male' ? 'm' : 
        passenger.gender === 'female' ? 'f' : 
        (passenger.gender as 'm' | 'f' | 'x');
      
      return {
        title: passenger.title,
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        dateOfBirth: passenger.dateOfBirth,
        gender: formattedGender,
        email: passenger.email,
        phone: formattedPhone, // Use the formatted phone number
        documentNumber: passenger.documentNumber,
        documentExpiryDate: passenger.documentExpiryDate,
        documentIssuingCountryCode: passenger.documentIssuingCountryCode,
        documentNationality: passenger.documentNationality,
        documentType: 'passport'
      };
    });

    // Confirm payment
    const confirmResponse = await confirmPayment(paymentIntentId, paymentMethod);

    if (!confirmResponse.success) {
      return NextResponse.json({
        success: false,
        error: confirmResponse.error || 'Payment confirmation failed',
        status: confirmResponse.status || 'payment_failed'
      });
    }

    // If payment requires additional action (3D Secure)
    if (confirmResponse.requiresAction) {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: confirmResponse.clientSecret,
        paymentIntentId: confirmResponse.paymentIntentId,
        status: confirmResponse.status,
        message: 'Additional authentication required'
      });
    }

    // Validate we have offer IDs to process
    if (allOfferIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one offer ID is required' },
        { status: 400 }
      );
    }

    // Determine if this is a roundtrip booking based on metadata
    const isRoundtripBooking = metadata?.tripType === 'roundtrip' || isRoundtrip === true;
    
    // Log the offer details
    console.log('Processing booking with offers:', {
      offerCount: allOfferIds.length,
      isRoundtrip: isRoundtripBooking,
      offerIds: allOfferIds
    });

    // Verify all offers exist and are valid before proceeding
    let totalOfferAmount = 0;
    let offerCurrency = 'EUR'; // Default currency
    const verifiedOffers = [];
    
    // IMPORTANT: For Duffel API, a roundtrip booking should be represented by a single offer
    // that includes both outbound and return legs. However, our frontend might be sending
    // multiple offer IDs. We'll verify all offers but only use the first valid one for booking.
    
    try {
      // Process each offer to verify and calculate total amount
      for (const currentOfferId of allOfferIds) {
        const offerResponse = await fetch(`https://api.duffel.com/air/offers/${currentOfferId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.DUFFEL_API}`,
          'Accept': 'application/json',
          'Duffel-Version': 'v2'
        }
      });

        if (!offerResponse.ok) {
          const errorData = await offerResponse.json();
          console.error('Error fetching offer:', {
            offerId: currentOfferId,
            status: offerResponse.status,
            error: errorData
          });
          
          return NextResponse.json({
            success: false,
            error: `One or more selected flights are no longer available. Please search for flights again.`,
            status: 'offer_invalid',
            details: {
              offerId: currentOfferId,
              error: errorData.errors?.[0]?.detail || 'Offer not found or expired'
            }
          }, { status: 400 });
        }
        
        const offerData = await offerResponse.json();
        const offer = offerData.data;
        
        if (!offer || !offer.id) {
          console.error('Invalid offer response from Duffel API:', offerData);
          return NextResponse.json(
            { 
              success: false, 
              status: 'offer_invalid',
              error: 'One or more selected flights are no longer available. Please search for flights again.' 
            },
            { status: 400 }
          );
        }
        
        // Check if offer is expired
        const offerExpiry = new Date(offer.expires_at);
        if (new Date() > offerExpiry) {
          console.error('Offer has expired:', offer.id, 'Expired at:', offer.expires_at);
          return NextResponse.json(
            { 
              success: false, 
              status: 'offer_expired',
              error: 'One or more selected flight offers have expired. Please search for flights again.'
            },
            { status: 400 }
          );
        }
        
        // Add to verified offers
        verifiedOffers.push(offer);
        
        // Log detailed offer information for debugging
        console.log('OFFER DETAILS FOR PRICING:', {
          id: offer.id,
          total_amount: offer.total_amount,
          total_currency: offer.total_currency,
          base_amount: offer.base_amount,
          base_currency: offer.base_currency,
          tax_amount: offer.tax_amount,
          tax_currency: offer.tax_currency,
          slices_count: offer.slices?.length || 0,
          passengers_count: offer.passengers?.length || 0
        });
        
        // Log details for each slice to verify roundtrip
        if (offer.slices && Array.isArray(offer.slices)) {
          offer.slices.forEach((slice: any, index: any) => {
            console.log(`SLICE ${index + 1} DETAILS:`, {
              id: slice.id,
              origin: slice.origin?.iata_code,
              destination: slice.destination?.iata_code,
              duration: slice.duration,
              segments_count: slice.segments?.length || 0
            });
          });
        }
      }
      
      // For roundtrip bookings, we need to ensure we're using the correct offer
      // that contains both outbound and return slices
      const isRoundtripBooking = metadata?.tripType === 'roundtrip' || isRoundtrip === true;
      
      // Find the best offer for roundtrip booking (should have multiple slices)
      // Ensure we have at least one verified offer
      if (verifiedOffers.length === 0) {
        console.error('No verified offers found');
        return NextResponse.json({
          success: false,
          error: 'No valid offers found. Please search for flights again.',
          status: 'no_valid_offers'
        }, { status: 400 });
      }
      
      // Default to first offer
      selectedOffer = verifiedOffers[0];
      
      if (isRoundtripBooking) {
        // For roundtrip, find an offer with multiple slices if available
        const roundtripOffer = verifiedOffers.find(offer => 
          offer.slices && Array.isArray(offer.slices) && offer.slices.length > 1
        );
        
        if (roundtripOffer) {
          selectedOffer = roundtripOffer;
          console.log('Found valid roundtrip offer with multiple slices:', {
            offerId: roundtripOffer.id,
            slicesCount: roundtripOffer.slices?.length || 0
          });
        } else {
          console.warn('No roundtrip offer with multiple slices found. Using first offer as fallback.');
        }
      }
      
      // Set the total amount from the selected offer
      if (selectedOffer && selectedOffer.total_amount) {
        if (typeof selectedOffer.total_amount === 'string') {
          totalOfferAmount = parseFloat(selectedOffer.total_amount);
          offerCurrency = selectedOffer.total_currency || offerCurrency;
        } else {
          totalOfferAmount = Number(selectedOffer.total_amount);
          offerCurrency = selectedOffer.total_currency || offerCurrency;
        }
      }
      
      console.log('Verified all offers:', {
        offerCount: verifiedOffers.length,
        selectedOfferId: selectedOffer?.id || 'unknown',
        totalOfferAmount,
        offerCurrency,
        isRoundtrip: isRoundtripBooking,
        slicesCount: selectedOffer?.slices?.length || 0,
        offerIds: verifiedOffers.map(o => o.id)
      });

    } catch (error) {
      console.error('Error verifying offer:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify flight availability. Please try again.',
        status: 'offer_verification_failed'
      }, { status: 500 });
    }

    // Create order if payment is confirmed and offers are valid
    if (confirmResponse.status === 'succeeded' && confirmResponse.paymentIntent && confirmResponse.paymentIntentId) {
      // We've already verified all offers in the previous step
      // and stored them in the verifiedOffers array

      // --- ROUNDTRIP LOGIC ---
      // For roundtrip, ensure we pass both unique offers and sum their amounts
      // For oneway, fallback to single offer logic (already implemented)

      // Then, confirm the payment intent with Duffel
      try {
        console.log('Confirming payment intent with Duffel:', confirmResponse.paymentIntentId);
        
        // Get the payment method details from the request
        const paymentMethod = body.paymentMethod || {};
        
        // Prepare payment method for confirmation
        const paymentMethodData: PaymentMethodData = {
          card: {
            number: paymentMethod.cardNumber || '0000000000000000', // Provide a default value
            expiry_month: (paymentMethod.expiryMonth || '01').toString().padStart(2, '0'),
            expiry_year: (paymentMethod.expiryYear || new Date().getFullYear()).toString().slice(-2),
            cvc: paymentMethod.cvc || '123', // Provide a default value
            name: paymentMethod.cardholderName || 'Cardholder Name'
          }
        };
        
        // Confirm the payment using our helper function
        const confirmIntentResponse = await confirmPayment(
          confirmResponse.paymentIntentId,
          paymentMethodData,
          metadata.return_url || 'https://your-website.com/return'
        );
        
        if (!confirmIntentResponse.success || confirmIntentResponse.status !== 'succeeded') {
          console.error('Failed to confirm payment intent:', confirmIntentResponse);
          return NextResponse.json({
            success: false,
            status: 'payment_intent_confirmation_failed',
            error: confirmIntentResponse.error || 'Failed to confirm payment with the airline.'
          }, { status: 400 });
        }
        
        console.log('Payment intent confirmed successfully:', {
          paymentIntentId: confirmResponse.paymentIntentId,
          status: confirmIntentResponse.status,
          amount: confirmIntentResponse.paymentIntent?.amount,
          currency: confirmIntentResponse.paymentIntent?.currency
        });
      } catch (error) {
        console.error('Error confirming payment intent:', error);
        return NextResponse.json({
          success: false,
          status: 'payment_intent_confirmation_error',
          error: error instanceof Error ? error.message : 'Failed to process payment confirmation.'
        }, { status: 500 });
      }
      // Calculate the expected base amount for the order
      // For roundtrip, ensure we're using the full amount that includes both legs
      const isRoundtrip = isRoundtripBooking && selectedOffer && selectedOffer.slices && selectedOffer.slices.length > 1;
      const slicesCount = selectedOffer?.slices?.length || 1;
      
      // CRITICAL: Ensure we're using the correct total amount from the selected offer
      // This must include both legs for roundtrip bookings
      if (selectedOffer && selectedOffer.total_amount) {
        if (typeof selectedOffer.total_amount === 'string') {
          totalOfferAmount = parseFloat(selectedOffer.total_amount);
        } else {
          totalOfferAmount = Number(selectedOffer.total_amount);
        }
        offerCurrency = selectedOffer.total_currency || offerCurrency;
        
        // Double-check that we have the correct amount for roundtrip
        if (isRoundtrip) {
          console.log('ROUNDTRIP BOOKING DETECTED - Verifying full roundtrip price is used:', {
            offerId: selectedOffer.id,
            totalAmount: totalOfferAmount,
            currency: offerCurrency,
            slicesCount: slicesCount,
            sliceOrigins: selectedOffer.slices?.map((s: any) => s.origin?.iata_code) || [],
            sliceDestinations: selectedOffer.slices?.map((s: any) => s.destination?.iata_code) || []
          });
        }
      }
      
      // Log pricing breakdown for debugging
      console.log('PRICING BREAKDOWN FOR ORDER:', {
        offerId: selectedOffer?.id,
        originalOfferAmount: totalOfferAmount,
        adjustedTotalAmount: totalOfferAmount,
        isRoundtrip,
        slicesCount,
        paymentIntentAmount: confirmResponse.paymentIntent?.amount,
        expectedBaseAmount: totalOfferAmount
      });
      
      console.log('Creating order with verified offers:', {
        offerCount: verifiedOffers.length,
        totalOfferAmount,
        offerCurrency,
        paymentIntentStatus: confirmResponse.status,
        passengerCount: formattedPassengers.length,
        environment: process.env.NODE_ENV || 'development'
      });
      
      try {
        // Prepare order metadata
        // Ensure metadata only contains string values and simple structures
        // Determine trip type from the original metadata/isRoundtrip flag
        const tripType = isRoundtripBooking ? 'roundtrip' : 'oneway';
        const isRoundtripMeta = isRoundtripBooking ? 'true' : 'false';
        
        // For roundtrip bookings, we should have a single offer that includes both legs
        // The first verified offer should be used for the order
        const orderMetadata = {
          // Only include essential metadata as simple key-value pairs
          source: 'web-booking',
          trip_type: tripType,
          payment_intent_id: confirmResponse.paymentIntentId,
          environment: process.env.NODE_ENV || 'development',
          is_roundtrip: isRoundtripMeta,
          base_amount: totalOfferAmount.toString(),
          base_currency: offerCurrency,
          total_amount: confirmResponse.paymentIntent?.amount || '',
          total_currency: confirmResponse.paymentIntent?.currency || '',
          // Flatten the price breakdown into simple key-value pairs
          markup_percentage: '50.00%',
          // Include all offer IDs as a comma-separated string for reference
          // but only the first one will be used for the actual order
          offer_ids: verifiedOffers.map(o => o.id).join(','),
          primary_offer_id: verifiedOffers[0]?.id || '',
          // Add a timestamp
          timestamp: new Date().toISOString()
        };

        console.log('Creating order with metadata:', JSON.stringify(orderMetadata, null, 2));
        
        // Log the total amount being used for order creation
        console.log('Using total amount for order creation:', {
          offerId: selectedOffer?.id,
          totalAmount: totalOfferAmount.toString(),
          currency: offerCurrency,
          originalOfferCount: allOfferIds.length,
          isRoundtrip: isRoundtripBooking
        });
        
        // CRITICAL: For roundtrip bookings, ensure we're using the correct combined offer
        // that includes both outbound and return legs, and the total amount reflects both legs
        if (!selectedOffer || !selectedOffer.id) {
          throw new Error('No valid offer found for order creation');
        }
        
        // Log the final offer and amount being used for order creation
        console.log('FINAL ORDER CREATION DETAILS:', {
          offerId: selectedOffer.id,
          totalAmount: totalOfferAmount,
          currency: offerCurrency,
          isRoundtrip: isRoundtrip ? 'true' : 'false',
          slicesCount: slicesCount,
          paymentIntentId: confirmResponse.paymentIntentId
        });
        
        // Create the order with the verified offer ID
        // IMPORTANT: Duffel API requires exactly ONE offer per order
        // For roundtrip bookings, this should be a single offer that includes both legs
        const orderResponse = await createOrder(
          [selectedOffer.id], // Use the selected offer ID with the combined roundtrip if applicable
          formattedPassengers,
          confirmResponse.paymentIntentId,
          {
            ...orderMetadata,
            // Include price breakdown in metadata
            price_breakdown: JSON.stringify({
              base_amount: totalOfferAmount,
              base_currency: offerCurrency,
              total_with_markup: confirmResponse.paymentIntent?.amount || amount,
              currency: confirmResponse.paymentIntent?.currency || currency || 'EUR',
              markup_percentage: confirmResponse.paymentIntent?.amount && totalOfferAmount > 0 
                ? ((parseFloat(confirmResponse.paymentIntent.amount) - totalOfferAmount) / totalOfferAmount * 100).toFixed(2) + '%'
                : 'N/A',
              offers: [{
                id: selectedOffer.id,
                amount: totalOfferAmount,
                currency: offerCurrency,
                slices_count: slicesCount,
                is_roundtrip: isRoundtrip ? 'true' : 'false'
              }]
            })
          }
        );
        
        console.log('Order creation response:', {
          success: orderResponse.success,
          orderId: orderResponse.order?.id,
          status: orderResponse.status,
          error: orderResponse.error
        });
        
        console.log('Order creation response:', {
          success: orderResponse.success,
          orderId: orderResponse.order?.id,
          status: orderResponse.status,
          error: orderResponse.error
        });
        
        if (!orderResponse.success) {
          // Handle API errors
          if (orderResponse.error && typeof orderResponse.error === 'object' && 'response' in orderResponse.error) {
            const errorResponse = orderResponse.error as { response: { data: any; status: number } };
            console.error('Duffel API error:', errorResponse.response.data);
            
            // Extract error message safely
            const errorData = errorResponse.response.data;
            const errorMessage = 
              (typeof errorData === 'object' && errorData?.error?.message) ||
              'Failed to create order';
            
            const errorStatus = errorResponse.response.status || 400;
            
            // Check for offer not found or invalid
            const errorText = JSON.stringify(errorData).toLowerCase();
            if (errorText.includes('not found') || errorText.includes('not found in your account')) {
              return NextResponse.json(
                { 
                  success: false, 
                  status: 'offer_invalid',
                  error: 'The selected flight is no longer available. Please search for flights again.'
                },
                { status: 400 }
              );
            }
            
            // Handle other API errors
            return NextResponse.json(
              { 
                success: false, 
                status: 'order_creation_failed',
                error: errorMessage,
                details: Array.isArray(errorData?.errors) ? errorData.errors : undefined
              },
              { status: errorStatus }
            );
          }
          
          return NextResponse.json({
            success: false,
            error: orderResponse.error || 'Order creation failed',
            status: 'order_creation_failed'
          });
        }
        
        // Order created successfully
        return NextResponse.json({
          success: true,
          order: orderResponse.order,
          paymentIntent: confirmResponse.paymentIntent,
          status: 'completed',
          bookingReference: orderResponse.bookingReference,
          orderId: orderResponse.order?.id,
          paymentStatus: confirmResponse.status
        });
      } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({
          success: false,
          status: 'order_creation_error',
          error: 'Failed to create order. Please try again.'
        }, { status: 500 });
      }

      // This return is no longer needed as we're returning from the try block
      // The response is already handled in the try block
    } else {
      return NextResponse.json({
        success: false,
        error: 'Payment intent ID is missing or invalid',
        status: confirmResponse.status || 'unknown'
      });
    }

  } catch (error) {
    console.error('Error in payment confirmation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
        status: 'confirmation_error'
      },
      { status: 500 }
    );
  }
}
