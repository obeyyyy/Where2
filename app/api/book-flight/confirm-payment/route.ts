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
    const body = await request.json();
    const {
      paymentIntentId,
      paymentMethod,
      amount,
      currency,
      offerId,
      passengers,
      metadata,
      isConfirming = false
    } = body;

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

    // Use the full offer ID as it contains necessary metadata
    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Log the offer ID and related information
    console.log('Creating order with offer ID:', offerId);
    console.log('Payment intent status:', confirmResponse.status);
    console.log('Passenger count:', formattedPassengers.length);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Duffel API Key:', process.env.DUFFEL_API ? '***REDACTED***' : 'Not set');

    // Verify the offer exists before proceeding
    try {
      const offerResponse = await fetch(`https://api.duffel.com/air/offers/${offerId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.DUFFEL_API}`,
          'Accept': 'application/json',
          'Duffel-Version': 'v2'
        }
      });

      if (!offerResponse.ok) {
        const errorData = await offerResponse.json();
        console.error('Error fetching offer:', {
          status: offerResponse.status,
          error: errorData
        });
        
        return NextResponse.json({
          success: false,
          error: `The selected offer is no longer available. Please search for flights again.`,
          status: 'offer_invalid',
          details: {
            offerId,
            error: errorData.errors?.[0]?.detail || 'Offer not found or expired'
          }
        }, { status: 400 });
      }
      
      const offerData = await offerResponse.json();
      console.log('Offer details:', {
        id: offerData.data?.id,
        expires_at: offerData.data?.expires_at,
        available_seats: offerData.data?.available_seats,
        total_amount: offerData.data?.total_amount,
        total_currency: offerData.data?.total_currency
      });
      
      if (!offerData.data || !offerData.data.id) {
        console.error('Invalid offer response from Duffel API:', offerData);
        return NextResponse.json(
          { 
            success: false, 
            status: 'offer_invalid',
            error: 'The selected flight is no longer available. Please search for flights again.' 
          },
          { status: 400 }
        );
      }
      
      // Check if offer is expired
      const offerExpiry = new Date(offerData.data.expires_at);
      if (new Date() > offerExpiry) {
        console.error('Offer has expired:', offerData.data.id, 'Expired at:', offerData.data.expires_at);
        return NextResponse.json(
          { 
            success: false, 
            status: 'offer_expired',
            error: 'The selected flight offer has expired. Please search for flights again.'
          },
          { status: 400 }
        );
      }

    } catch (error) {
      console.error('Error verifying offer:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify flight availability. Please try again.',
        status: 'offer_verification_failed'
      }, { status: 500 });
    }

    // Create order if payment is confirmed and offer is valid
    if (confirmResponse.status === 'succeeded' && confirmResponse.paymentIntent && confirmResponse.paymentIntentId) {
      // First, verify the offer exists and get its details
      let verifiedOfferId = offerId;
      try {
        console.log('Verifying offer with ID:', offerId);
        const offerResponse = await fetch(`https://api.duffel.com/air/offers/${offerId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.DUFFEL_API}`,
            'Accept': 'application/json',
            'Duffel-Version': 'v2'
          }
        });

        if (!offerResponse.ok) {
          const errorData = await offerResponse.json();
          console.error('Error verifying offer:', errorData);
          return NextResponse.json({
            success: false,
            status: 'offer_verification_failed',
            error: 'The selected flight is no longer available. Please search for flights again.',
            details: {
              offerId,
              error: errorData.errors?.[0]?.detail || 'Offer not found or expired'
            }
          }, { status: 400 });
        }
        
        const offerData = await offerResponse.json();
        console.log('Retrieved offer details:', {
          id: offerData.data?.id,
          expires_at: offerData.data?.expires_at,
          total_amount: offerData.data?.total_amount,
          total_currency: offerData.data?.total_currency,
          owner: offerData.data?.owner?.name || 'unknown'
        });
        
        if (!offerData.data || !offerData.data.id) {
          console.error('Invalid offer response from Duffel API:', offerData);
          return NextResponse.json(
            { 
              success: false, 
              status: 'offer_invalid',
              error: 'The selected flight is no longer available. Please search for flights again.' 
            },
            { status: 400 }
          );
        }
        
        // Use the verified offer ID from the response
        verifiedOfferId = offerData.data.id;
        
        // Check if offer is expired
        const offerExpiry = new Date(offerData.data.expires_at);
        if (new Date() > offerExpiry) {
          console.error('Offer has expired:', offerData.data.id, 'Expired at:', offerData.data.expires_at);
          return NextResponse.json(
            { 
              success: false, 
              status: 'offer_expired',
              error: 'The selected flight offer has expired. Please search for flights again.'
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('Error verifying offer:', error);
        return NextResponse.json({
          success: false,
          status: 'offer_verification_error',
          error: 'Failed to verify flight availability. Please try again.'
        }, { status: 500 });
      }

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
      console.log('Creating order with verified offer ID:', verifiedOfferId);
      console.log('Payment intent status:', confirmResponse.status);
      console.log('Passenger count:', formattedPassengers.length);
      console.log('Environment:', process.env.NODE_ENV || 'development');
      
      try {
        // Create the order using the createOrder function with the verified offer ID
        const orderResponse = await createOrder(
          [verifiedOfferId], // Use the verified offer ID
          formattedPassengers,
          confirmResponse.paymentIntentId,
          {
            ...metadata,
            payment_intent_id: confirmResponse.paymentIntentId,
            environment: process.env.NODE_ENV || 'development',
            verified_offer_id: verifiedOfferId,
            amount: amount?.toString() || '0',
            currency: currency || 'EUR'
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
