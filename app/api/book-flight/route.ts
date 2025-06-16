import { NextResponse } from 'next/server';
import { 
  createPayment,
  confirmPayment,
  createOrder,
  PaymentRequest,
  PaymentOperationResponse,
  PassengerDetails,
  CardDetails
} from '@/lib/duffel';

// Define request body types
interface BookingRequest {
  offerId: string;
  passengers: PassengerDetails[];
  paymentMethod: PaymentMethod;
  paymentIntentId?: string;
  isConfirming?: boolean;
  amount: string | number;
  currency: string;
  metadata?: Record<string, any>;
}

type PaymentMethod = 
  | { type: 'card'; id: string }
  | { type: 'card'; card: CardDetails }
  | string; // Token string

// Response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: string;
  [key: string]: any;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received raw request body:', JSON.stringify({
      ...body,
      paymentMethod: body.paymentMethod ? '***' : 'none',
      passengers: body.passengers?.length || 0
    }, null, 2));
    
    // Now type assert after logging
    const typedBody = body as BookingRequest;
    const { 
      offerId, 
      passengers, 
      paymentMethod, 
      paymentIntentId, 
      isConfirming = false, 
      amount, 
      currency = 'EUR',
      metadata = {}
    } = typedBody;

    console.log('Received booking request:', {
      offerId,
      passengerCount: passengers?.length,
      hasPaymentMethod: !!paymentMethod,
      paymentIntentId,
      isConfirming,
      amount,
      currency,
      metadataKeys: Object.keys(metadata)
    });

    // Validation
    if (!offerId) {
      return errorResponse('Offer ID is required', 400, 'missing_offer_id');
    }

    if (!passengers?.length) {
      return errorResponse('At least one passenger is required', 400, 'missing_passengers');
    }

    // Handle payment confirmation flow
    if (isConfirming) {
      if (!paymentIntentId) {
        return errorResponse('Payment intent ID is required for confirmation', 400, 'missing_payment_intent_id');
      }

      return handlePaymentConfirmation({
        paymentIntentId,
        paymentMethod,
        offerId,
        passengers,
        metadata
      });
    }

    // Handle new payment intent creation
    return handleNewPaymentIntent({
      offerId,
      passengers,
      paymentMethod,
      amount,
      currency,
      metadata
    });

  } catch (error: any) {
    console.error('Error in book-flight API:', error);
    return errorResponse(
      error.message || 'Internal server error',
      500,
      'server_error'
    );
  }
}

// Helper functions
async function handlePaymentConfirmation({
  paymentIntentId,
  paymentMethod,
  offerId,
  passengers,
  metadata
}: {
  paymentIntentId: string;
  paymentMethod: PaymentMethod;
  offerId: string;
  passengers: PassengerDetails[];
  metadata: Record<string, any>;
}): Promise<NextResponse> {
  console.log('=== PAYMENT CONFIRMATION FLOW ===');
  
  try {
    console.log('Confirming payment with details:', {
      paymentIntentId: paymentIntentId.substring(0, 8) + '...',
      hasPaymentMethod: !!paymentMethod,
      offerId,
      passengerCount: passengers.length
    });

    // Prepare payment method for confirmation
    const paymentMethodForConfirm = preparePaymentMethod(paymentMethod);
    if (!paymentMethodForConfirm) {
      return errorResponse('Invalid payment method format', 400, 'invalid_payment_method');
    }

    // Call the confirmPayment function from duffel.ts
    const confirmResponse = await confirmPayment(
      paymentIntentId,
      paymentMethodForConfirm
    );

    console.log('Payment confirmation response:', {
      success: confirmResponse.success,
      status: confirmResponse.status,
      requiresAction: confirmResponse.requiresClientAction,
      error: confirmResponse.error
    });

    if (!confirmResponse.success) {
      return errorResponse(
        confirmResponse.error || 'Payment confirmation failed',
        400,
        'payment_confirmation_failed',
        { paymentIntentId }
      );
    }

    // If payment requires additional action (3D Secure), return the client secret
    if (confirmResponse.requiresClientAction) {
      return successResponse({
        requiresAction: true,
        clientSecret: confirmResponse.clientSecret,
        paymentIntentId,
        status: confirmResponse.status
      });
    }

    // If payment is successful, create the order
    console.log('Creating order for offer:', offerId);
    const orderResponse = await createOrder(
      [offerId],
      passengers,
      paymentIntentId,
      metadata
    );

    if (!orderResponse.success) {
      console.error('Failed to create order:', orderResponse.error);
      return errorResponse(
        'Order creation failed: ' + (orderResponse.error || 'Unknown error'),
        400,
        'order_creation_failed',
        { paymentIntentId }
      );
    }

    console.log('Order created successfully:', orderResponse.order?.id);
    return successResponse({
      order: orderResponse.order,
      paymentStatus: 'succeeded',
      paymentIntentId,
      bookingReference: orderResponse.bookingReference
    });

  } catch (error: any) {
    console.error('Error during payment confirmation:', error);
    return errorResponse(
      error.message || 'Payment confirmation failed',
      500,
      'payment_confirmation_error',
      { paymentIntentId }
    );
  }
}

async function handleNewPaymentIntent({
  offerId,
  passengers,
  paymentMethod,
  amount,
  currency,
  metadata
}: {
  offerId: string;
  passengers: PassengerDetails[];
  paymentMethod: PaymentMethod;
  amount: string | number;
  currency: string;
  metadata: Record<string, any>;
}): Promise<NextResponse> {
  console.log('=== CREATE PAYMENT INTENT FLOW ===');

  try {
    // Convert amount to number if it's a string
    const paymentAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return errorResponse(
        `A valid amount greater than 0 is required. Received: ${amount}`,
        400,
        'invalid_amount',
        { receivedAmount: amount, parsedAmount: paymentAmount }
      );
    }
    
    // Verify the offer is still valid but use the passed amount (which includes markups)
    console.log('Verifying offer:', offerId);
    const offerResponse = await fetch(`https://api.duffel.com/air/offers/${offerId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.DUFFEL_API}`,
        'Duffel-Version': 'v2'
      }
    });

    if (!offerResponse.ok) {
      const errorData = await offerResponse.json();
      console.error('Failed to verify offer:', errorData);
      return errorResponse(
        'Failed to verify flight offer. Please try again.',
        offerResponse.status,
        'offer_verification_failed',
        { errorData }
      );
    }

    const offerData = await offerResponse.json();
    console.log('Offer verified:', {
      id: offerData.data.id,
      expires_at: offerData.data.expires_at,
      total_amount: offerData.data.total_amount,
      total_currency: offerData.data.total_currency,
      owner: offerData.data.owner?.name
    });
    
    // Use the passed amount which includes all markups and fees
    const paymentCurrency = currency || offerData.data.total_currency;

    console.log('Creating payment intent with details:', {
      offerId,
      amount: paymentAmount,
      currency: paymentCurrency,
      passengerCount: passengers.length,
      source: 'offer_details'
    });

    // Step 1: Create a payment intent without payment method
    console.log('Sending request to Duffel API...');
    const response = await fetch('https://api.duffel.com/payments/payment_intents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Duffel-Version': 'v2',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.DUFFEL_API}`
      },
      body: JSON.stringify({
        data: {
          amount: paymentAmount.toFixed(2),
          currency: paymentCurrency,
          metadata: {
            ...metadata,
            source: 'where2-web',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            offer_id: offerId,
            passenger_count: passengers.length,
            test: process.env.NODE_ENV !== 'production',
            base_amount: offerData.data.total_amount,  // Store base amount for reference
            total_amount: paymentAmount.toFixed(2),    // Total amount with markups
            currency: paymentCurrency,
            markups_included: true
          }
        }
      })
    });

    const responseData = await response.json();
    
    console.log('Duffel API response:', {
      status: response.status,
      ok: response.ok,
      responseData: responseData
    });
    
    if (!response.ok) {
      console.error('Failed to create payment intent:', responseData);
      return errorResponse(
        responseData.errors?.[0]?.message || 'Failed to create payment intent',
        response.status,
        'payment_intent_creation_failed',
        { 
          response: responseData,
          requestDetails: {
            amount: paymentAmount,
            currency,
            offerId,
            passengerCount: passengers.length
          }
        }
      );
    }

    const paymentIntent = responseData.data || {};
    
    // Log detailed information about the payment intent
    console.log('Payment intent created:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      hasClientSecret: !!paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentIntentKeys: paymentIntent ? Object.keys(paymentIntent) : []
    });

    // Check if we have either client_token or client_secret
    const clientToken = paymentIntent.client_token || paymentIntent.client_secret;
    
    if (!clientToken) {
      console.warn('No client_token or client_secret in payment intent response.');
      
      // Return a more detailed error response
      return errorResponse(
        'Payment processing is not properly configured',
        400,
        'payment_configuration_error',
        {
          error: 'missing_client_token',
          message: 'The payment intent was created but no client_token was returned',
          possibleCauses: [
            'Duffel account is not properly configured for payments',
            'Test mode may not be properly set up',
            'Missing or invalid payment method in Duffel account',
            'Insufficient permissions for the API key'
          ],
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          },
          responseData: responseData
        }
      );
    }

    // Return the client token to the frontend to collect payment details
    return successResponse({
      clientToken: clientToken,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      requiresAction: false,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return errorResponse(
      error.message || 'Failed to create payment intent',
      500,
      'payment_intent_creation_failed'
    );
  }
}

function preparePaymentMethod(paymentMethod: PaymentMethod): any | null {
  if (!paymentMethod) return null;

  if (typeof paymentMethod === 'string') {
    // Token string - for backward compatibility
    return { 
      type: 'card',
      card: { 
        token: paymentMethod,
        test: process.env.NODE_ENV !== 'production'
      }
    };
  }

  if ('id' in paymentMethod) {
    // Payment method with ID
    return { 
      type: 'card',
      card: { 
        id: paymentMethod.id,
        test: process.env.NODE_ENV !== 'production'
      }
    };
  }

  if ('card' in paymentMethod) {
    // Raw card details
    const card = paymentMethod.card;
    // Use test card number in development if a test card is detected
    const finalCardNumber = card.number.startsWith('4') && process.env.NODE_ENV !== 'production' 
      ? '4242424242424242' 
      : card.number.replace(/\s+/g, '');

    // Format expiry month and year
    const expiryMonth = String(card.expiry_month || '12').padStart(2, '0');
    let expiryYear = String(card.expiry_year || (new Date().getFullYear() + 1));
    
    // Convert 2-digit year to 4-digit if needed
    if (expiryYear.length === 2) {
      const currentYear = new Date().getFullYear();
      const prefix = currentYear.toString().substring(0, 2); // Get first 2 digits of current year
      expiryYear = prefix + expiryYear;
    }

    console.log('Formatted card details:', {
      number: `••••${finalCardNumber.slice(-4)}`,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      name: card.name || 'Test User',
      test: process.env.NODE_ENV !== 'production'
    });

    return {
      type: 'card',
      card: {
        number: finalCardNumber,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvc: String(card.cvc || '314'),
        name: String(card.name || 'Test User'),
        test: process.env.NODE_ENV !== 'production',
        billing_details: {
          name: String(card.name || 'Test User'),
          email: 'test@example.com'
        }
      }
    };
  }

  return null;
}

function successResponse(
  data: any,
  status = 200
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}

function errorResponse(
  message: string,
  statusCode: number,
  errorCode?: string,
  additionalData: Record<string, any> = {}
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: message,
    status: errorCode || 'error',
    ...additionalData
  };

  console.error(`API Error [${statusCode}]:`, message, additionalData);
  return NextResponse.json(response, { status: statusCode });
}