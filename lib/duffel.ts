import { Duffel } from '@duffel/api';

// Initialize the Duffel API client
export const duffel = new Duffel({
  token: process.env.DUFFEL_API!,
  debug: { verbose: true },
});

// Payment method details that can be used in a payment request
export interface CardDetails {
  number: string;
  expiry?: string; // MM/YY or MM/YYYY format
  expiry_month?: string | number;
  expiry_year?: string | number;
  cvc: string;
  name?: string;
}

// Payment method type
type PaymentMethod = 
  | { type: 'card'; card: CardDetails }
  | { id: string; [key: string]: any }
  | string;

// Payment request interface
export interface PaymentRequest {
  type?: 'balance' | 'arc_bsp_cash' | 'card';
  amount: string | number;
  currency: string;
  order_id?: string;
  card_details?: CardDetails | string;
  payment_method?: PaymentMethod;
  card?: CardDetails; // For backward compatibility
  // Use a mapped type to allow any additional properties
  [key: string]: unknown;
}

export type Gender = 'm' | 'f' | 'x' | 'male' | 'female';

export interface Passenger {
  id?: string; // Make ID optional since we don't want to send it to Duffel
  title: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  email: string;
  phoneNumber: string;
  [key: string]: unknown; // Allow additional properties
}

export interface PassengerDetails {
  id?: string;
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  email: string;
  phone: string;
  documentNumber: string;
  documentExpiryDate: string;
  documentIssuingCountryCode: string;
  documentNationality: string;
  documentType?: string;
}

export interface PaymentIntentResponse {
  id: string;
  client_secret: string;
  status: string;
  amount: string;
  currency: string;
  metadata?: Record<string, any>;
}

export interface OrderRequest {
  type: 'instant' | 'hold' | 'schedule';
  selected_offers: string[];
  payments: Array<{
    type: 'balance' | 'arc_bsp_cash';
    amount: string;
    currency: string;
  }>;
  passengers: Array<{
    id?: string;
    title?: string;
    gender?: Gender;
    given_name: string;
    family_name: string;
    born_on: string;
    email: string;
    phone_number: string;
    identity_documents?: Array<{
      type: string;
      unique_identifier: string;
      expires_on: string;
      issuing_country_code: string;
      nationality: string;
    }>;
  }>;
  metadata?: Record<string, any>;
}

// Consolidated response interface for payment operations
export interface PaymentOperationResponse {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  requiresAction?: boolean;
  error?: string;
  status: 'succeeded' | 'requires_action' | 'processing' | 'requires_payment_method' | 'failed' | 'canceled' | 'requires_confirmation' | 'requires_capture';
  paymentIntent?: any;
  requiresClientAction?: boolean;
  
  // Payment details
  amount?: string | number;
  currency?: string;
  
  // Additional fields for better error handling
  declineCode?: string;
  code?: string;
  
  // Debug information (only in development)
  rawResponse?: any;
  rawError?: any;
  order?: unknown;
}

// For backward compatibility
export type CreatePaymentResponse = PaymentOperationResponse;
export type ConfirmPaymentResponse = PaymentOperationResponse;

export interface CreateOrderResponse {
  success: boolean;
  order?: any;
  error?: string;
  status?: string;
  bookingReference?: string;
  details?: {
    offerId?: string;
    error?: string;
    [key: string]: any;
  };
}

export async function createOrder(
  selectedOffers: string[],
  passengers: PassengerDetails[],
  paymentIntentId: string,
  metadata: Record<string, any> = {}
): Promise<CreateOrderResponse> {
  try {
    console.log('=== ORDER CREATION STARTED ===');
    console.log('Creating order for offers:', selectedOffers);
    
    // Validate offer IDs
    if (!Array.isArray(selectedOffers) || selectedOffers.length === 0) {
      const error = 'No offer IDs provided for order creation';
      console.error(error);
      return { success: false, error, status: 'invalid_offer' };
    }
    
    // Check if any offer ID is invalid
    const invalidOffers = selectedOffers.filter(offerId => 
      !offerId || typeof offerId !== 'string' || !offerId.startsWith('off_')
    );
    
    if (invalidOffers.length > 0) {
      const error = `Invalid offer ID(s): ${invalidOffers.join(', ')}`;
      console.error(error);
      return { success: false, error, status: 'invalid_offer' };
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
    const formattedPassengers = passengers.map((passenger) => {
      const formattedPhone = formatPhoneNumber(passenger.phone);
      console.log('Final passenger phone formatting:', {
        original: passenger.phone,
        formatted: formattedPhone
      });
      
      // Do not include an ID - Duffel will generate one
      return {
        born_on: passenger.dateOfBirth,
        email: passenger.email,
        family_name: passenger.lastName,
        given_name: passenger.firstName,
        gender: (passenger.gender === 'male' || passenger.gender === 'female') ? passenger.gender[0] : (passenger.gender as 'm' | 'f' | 'x'),
        title: passenger.title,
        phone_number: formattedPhone,
        identity_documents: [{
          type: passenger.documentType || 'passport',
          unique_identifier: passenger.documentNumber,
          expires_on: passenger.documentExpiryDate,
          issuing_country_code: passenger.documentIssuingCountryCode,
          nationality: passenger.documentNationality
        }]
      };
    });

    // Extract amount and currency from metadata if available, or use defaults
    const amount = metadata.amount || '0';
    const currency = metadata.currency || 'EUR';
    
    const orderData = {
      type: 'instant',
      selected_offers: selectedOffers,
      passengers: formattedPassengers,
      payments: [
        {
          type: 'balance',
          amount: amount.toString(),
          currency: currency
        }
      ],
      metadata: {
        ...metadata,
        payment_intent_id: paymentIntentId,
        source: 'where2-web',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Order data being sent to Duffel API:', JSON.stringify({
      ...orderData,
      passengers: orderData.passengers.map(p => ({
        ...p,
        identity_documents: p.identity_documents?.map(d => ({
          ...d,
          unique_identifier: d.unique_identifier ? '***REDACTED***' : undefined
        }))
      }))
    }, null, 2));

    console.log('Sending order creation request:', {
      selectedOffersCount: selectedOffers.length,
      passengerCount: formattedPassengers.length,
      paymentIntentId,
      metadata: orderData.metadata
    });

    const startTime = Date.now();
    // First, verify the offer exists and is valid
    const offerId = selectedOffers[0]; // We're only using the first offer for now
    console.log('Verifying offer before order creation:', offerId);
    
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
        console.error('Error verifying offer:', {
          status: offerResponse.status,
          error: errorData,
          offerId
        });
        
        return {
          success: false,
          error: 'The selected flight is no longer available. Please search for flights again.',
          status: 'offer_unavailable',
          details: {
            offerId,
            error: errorData.errors?.[0]?.detail || 'Offer not found or expired'
          }
        };
      }
      
      const offerData = await offerResponse.json();
      console.log('Offer verification successful:', {
        id: offerData.data?.id,
        expires_at: offerData.data?.expires_at,
        available: offerData.data?.available,
        owner: offerData.data?.owner?.name || 'unknown'
      });
      
      // Check if offer is still available
      if (offerData.data?.available === false) {
        const error = 'The selected flight is no longer available';
        console.error(error, { offerId });
        return { success: false, error, status: 'offer_unavailable' };
      }
      
      // Check if offer has expired
      if (offerData.data?.expires_at) {
        const expiryDate = new Date(offerData.data.expires_at);
        if (new Date() > expiryDate) {
          const error = 'The selected flight offer has expired';
          console.error(error, { offerId, expiredAt: expiryDate });
          return { success: false, error, status: 'offer_expired' };
        }
      }
    } catch (error) {
      console.error('Error during offer verification:', error);
      return {
        success: false,
        error: 'Failed to verify flight availability. Please try again.',
        status: 'offer_verification_failed'
      };
    }
    
    console.log('Creating order with verified offer:', offerId);
    
    // Ensure we have the latest payment intent status
    const paymentStatusResponse = await getPaymentIntentStatus(paymentIntentId);
    if (!paymentStatusResponse.success || paymentStatusResponse.status !== 'succeeded') {
      const error = paymentStatusResponse.error || 'Payment not confirmed';
      console.error('Payment not confirmed:', { paymentIntentId, status: paymentStatusResponse.status, error });
      return {
        success: false,
        error: 'Payment confirmation failed. Please try again.',
        status: 'payment_not_confirmed',
        details: {
          paymentIntentId,
          status: paymentStatusResponse.status,
          error
        }
      };
    }
    
    // Prepare the order request
    const orderRequest = {
      data: {
        type: 'instant',
        selected_offers: [offerId], // Use the verified offer ID
        // Pass the passengers with their IDs
        passengers: formattedPassengers,
        payments: [
          {
            type: 'balance',
            amount: amount.toString(),
            currency: currency
          }
        ],
        metadata: {
          ...(metadata || {}),
          payment_intent_id: paymentIntentId,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
          // Include additional context for debugging
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
          version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown'
        }
      }
    };
    
    console.log('Sending order creation request to Duffel API:', JSON.stringify({
      ...orderRequest,
      data: {
        ...orderRequest.data,
        passengers: orderRequest.data.passengers.map((p: any) => ({
          ...p,
          identity_documents: p.identity_documents?.map((d: any) => ({
            ...d,
            unique_identifier: '***REDACTED***'
          }))
        }))
      }
    }, null, 2));

    const requestStartTime = Date.now();
    const response = await fetch('https://api.duffel.com/air/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DUFFEL_API}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Duffel-Version': 'v2',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'where2-web/1.0',
        'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      body: JSON.stringify(orderRequest)
    });

    const responseTime = Date.now() - requestStartTime;
    console.log(`Order creation response received in ${responseTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      // Log detailed error information
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        responseTime,
        paymentIntentId,
        requestId: response.headers.get('x-request-id'),
        rateLimitRemaining: response.headers.get('ratelimit-remaining'),
        rateLimitReset: response.headers.get('ratelimit-reset'),
        offerId,
        requestBody: {
          ...orderRequest,
          data: {
            ...orderRequest.data,
            passengers: orderRequest.data.passengers.map((p: any) => ({
              ...p,
              identity_documents: p.identity_documents?.map((d: any) => ({
                ...d,
                unique_identifier: '***REDACTED***'
              }))
            }))
          }
        }
      };
      
      console.error('Error creating order:', JSON.stringify(errorDetails, null, 2));

      // Extract more detailed error information
      const apiError = errorData.errors?.[0];
      const errorMessage = apiError?.message || errorData.error?.message || 'Failed to create order';
      
      return {
        success: false,
        error: errorMessage,
        status: 'order_creation_failed',
        details: {
          code: apiError?.code,
          type: apiError?.type,
          title: apiError?.title,
          status: response.status,
          requestId: response.headers.get('x-request-id'),
          offerId,
          paymentIntentId,
          // Include the first few characters of the offer ID for debugging
          offerIdPrefix: offerId ? `${offerId.substring(0, 8)}...` : 'none',
          // Include the first few characters of the payment intent ID for debugging
          paymentIntentIdPrefix: paymentIntentId ? `${paymentIntentId.substring(0, 8)}...` : 'none'
        }
      };
    }

    console.log('Parsing order creation response...');
    const responseData = await response.json();
    console.log('Raw order creation response:', JSON.stringify({
      hasData: !!responseData.data,
      keys: responseData.data ? Object.keys(responseData.data) : []
    }, null, 2));
    
    const order = responseData.data;
    
    if (!order) {
      const error = 'No order data in response';
      console.error(error, { 
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseData 
      });
      return {
        success: false,
        error,
        status: 'order_creation_failed'
      };
    }

    // Log all available order data (excluding sensitive information)
    const { owner, documents, ...safeOrderData } = order;
    console.log('=== ORDER CREATION SUCCESS ===');
    console.log('Order ID:', order.id);
    console.log('Booking Reference:', order.booking_reference || order.id);
    console.log('Status:', order.status);
    console.log('Payment Intent ID:', paymentIntentId);
    console.log('Response Time:', `${responseTime}ms`);
    
    // Log order details
    console.log('\nOrder Details:');
    console.log('- Type:', order.type);
    console.log('- Created At:', order.created_at);
    console.log('- Currency:', order.total_currency);
    console.log('- Total Amount:', order.total_amount);
    
    // Log passengers
    if (order.passengers?.length) {
      console.log('\nPassengers:');
      order.passengers.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. ${p.given_name} ${p.family_name} (${p.type || 'adult'})`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Phone: ${p.phone_number}`);
      });
    }
    
    // Log flights
    if (order.slices?.length) {
      console.log('\nFlight Segments:');
      order.slices.forEach((slice: any, i: number) => {
        console.log(`  Segment ${i + 1}:`);
        console.log(`  - ${slice.origin.name} (${slice.origin.iata_code}) to ${slice.destination.name} (${slice.destination.iata_code})`);
        console.log(`  - Departure: ${slice.departure_date_time_utc}`);
        console.log(`  - Arrival: ${slice.arrival_date_time_utc}`);
        console.log(`  - Flight Number: ${slice.marketing_carrier.iata_code}${slice.marketing_flight_number}`);
      });
    }
    
    console.log('\nFull Order Data (sensitive data redacted):', JSON.stringify(safeOrderData, null, 2));
    console.log('=== END ORDER CREATION ===');

    return { 
      success: true, 
      order,
      bookingReference: order.booking_reference || order.id
    };
  } catch (error) {
    console.error('Error in createOrder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
      status: 'order_creation_error'
    };
  }
}

interface PaymentMethodOptions {
  id?: string;
  type?: string;
  card?: {
    number: string;
    expiry_month: string | number;
    expiry_year: string | number;
    cvc: string;
    name?: string;
  };
}

interface CreatePaymentIntentResponse {
  success: boolean;
  paymentIntent?: any;
  error?: string;
  clientSecret?: string;
  paymentIntentId?: string;
  status?: string;
  amount?: string;
  currency?: string;
}

export async function createPaymentIntent(
  amount: string | number,
  currency: string = 'EUR',
  options: {
    metadata?: Record<string, any>;
    payment_method?: string | PaymentMethodOptions;
    confirm?: boolean;
    [key: string]: any;
  } = {}
): Promise<CreatePaymentIntentResponse> {
  const { metadata = {}, payment_method, confirm, ...restOptions } = options;
  
  // Ensure amount is a valid number greater than 0
  const amountValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(amountValue) || amountValue <= 0) {
    console.error('Invalid amount for payment intent:', amount);
    return { success: false, error: 'Amount must be greater than 0' };
  }
  
  // Format amount to exactly 2 decimal places as a string
  const formattedAmount = amountValue.toFixed(2);

  // Prepare the request body with proper payment method handling
  const requestBody: any = {
    data: {
      amount: formattedAmount,
      currency: currency.toUpperCase(),
      ...(metadata && { metadata }),
      ...restOptions,
      ...(confirm !== undefined && { confirm })
    }
  };

  // Handle payment method based on its type
  if (payment_method) {
    if (typeof payment_method === 'string') {
      // If it's a payment method ID string
      console.log('Using payment method token:', payment_method.substring(0, 8) + '...');
      requestBody.data.payment_method = payment_method;
    } else if ('card' in payment_method && payment_method.card) {
      // If it's a card object, include all card details
      const card = payment_method.card;
      requestBody.data.payment_method = {
        type: 'card',
        card: {
          number: String(card.number || '').replace(/\s+/g, ''),
          expiry_month: String(card.expiry_month || '').padStart(2, '0'),
          expiry_year: String(card.expiry_year || '').replace(/^20/, ''),
          cvc: String(card.cvc || ''),
          name: String(card.name || 'Cardholder Name')
        }
      };
      console.log('Using card payment method:', {
        type: 'card',
        card: {
          number: '•••• •••• •••• ' + (requestBody.data.payment_method.card.number.slice(-4) || '••••'),
          expiry_month: requestBody.data.payment_method.card.expiry_month,
          expiry_year: requestBody.data.payment_method.card.expiry_year,
          cvc: requestBody.data.payment_method.card.cvc ? '•••' : undefined,
          name: requestBody.data.payment_method.card.name ? '•••• ••••' : undefined
        }
      });
    } else if (typeof payment_method === 'object' && 'id' in payment_method) {
      // If it's a payment method object with an id
      console.log('Using payment method ID:', payment_method.id);
      requestBody.data.payment_method = payment_method.id;
    } else {
      console.warn('Unsupported payment method format:', payment_method);
    }
  } else {
    console.warn('No payment method provided for payment intent');
  }

  // Add confirm flag if provided
  if (confirm !== undefined) {
    requestBody.data.confirm = confirm;
  }

  // Always include the payment method if provided, even if not confirming
  // The API will handle it appropriately based on the confirm flag

  // Create a loggable version of the request body with sensitive data masked
  const loggableBody = JSON.parse(JSON.stringify(requestBody));
  
  if (loggableBody.data.payment_method) {
    if (typeof loggableBody.data.payment_method === 'string') {
      loggableBody.data.payment_method = `token:${loggableBody.data.payment_method.substring(0, 8)}...`;
    } else if (loggableBody.data.payment_method.card) {
      const card = loggableBody.data.payment_method.card;
      if (card.number) {
        card.number = '•••• •••• •••• ' + (String(card.number).slice(-4) || '••••');
      }
      if (card.cvc) {
        card.cvc = '•••';
      }
      if (card.name) {
        card.name = '•••• ••••';
      }
    }
  }

  console.log('Creating payment intent with request:', JSON.stringify(loggableBody, null, 2));

  try {
    // Create payment intent
    const response = await fetch('https://api.duffel.com/payments/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DUFFEL_API}`,
        'Content-Type': 'application/json',
        'Duffel-Version': 'v2',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.errors?.[0]?.message || 'Failed to create payment intent';
      console.error('Error creating payment intent:', errorMessage, errorData);
      return { success: false, error: errorMessage };
    }

    const responseData = await response.json();
    console.log('Payment intent API response:', JSON.stringify(responseData, null, 2));
    
    const paymentIntent = responseData.data;
    if (!paymentIntent) {
      const error = 'No payment intent data in API response';
      console.error(error, { responseData });
      return { success: false, error };
    }
    
    console.log('Payment intent created:', paymentIntent.id);
    
    // Use client_token as clientSecret for compatibility
    const clientToken = paymentIntent.client_token;
    if (!clientToken) {
      const error = 'No client token returned from payment intent';
      console.error(error, { paymentIntent });
      return {
        success: false,
        error,
        paymentIntent
      };
    }

    return { 
      success: true, 
      paymentIntent,
      clientSecret: clientToken,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    };
      
  } catch (error: any) {
    console.error('Unexpected error creating payment intent:', error);
    return { 
      success: false,
      error: error.message || 'Failed to create payment intent'
    };
  }
}

// Define the payment method type
type ConfirmPaymentMethod = 
  | string 
  | {
      card: {
        number: string;
        expiry_month: string | number;
        expiry_year: string | number;
        cvc: string;
        name?: string;
      };
    };

export async function createPayment(
  offerId: string,
  payment: PaymentRequest,
  passengers: PassengerDetails[] = [],
  metadata: Record<string, any> = {}
): Promise<PaymentOperationResponse> {
  try {
    console.log('=== CREATE PAYMENT REQUEST ===');
    console.log('Offer ID:', offerId);
    console.log('Payment details:', {
      amount: payment.amount,
      currency: payment.currency,
      type: payment.type,
      metadata: payment.metadata
    });
    console.log('Passenger count:', passengers.length);
    
    // Ensure amount is properly formatted
    const parsedAmount = typeof payment.amount === 'string' ? 
      parseFloat(payment.amount) : Number(payment.amount);
      
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error(`Invalid payment amount: ${payment.amount}`);
    }
    
    // Create a new payment request with the parsed amount
    const paymentRequest: PaymentRequest = {
      ...payment,
      amount: parsedAmount,
      currency: payment.currency || 'EUR',
      metadata: {
        ...(payment.metadata || {}),
        source: 'where2-web',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Processed payment request:', {
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      type: paymentRequest.type,
      hasPaymentMethod: !!paymentRequest.payment_method || !!paymentRequest.card_details
    });
    
    console.log('Starting payment intent creation for offer ID:', offerId);
    
    // Set the final amount and currency
    const paymentAmount = parsedAmount;
    const paymentCurrency = paymentRequest.currency || 'EUR';
    
    // Validate the amount
    if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error(`Invalid amount: ${paymentAmount}`);
    }
    
    // Log the payment details for debugging
    console.log('Creating payment with amount:', paymentAmount, paymentCurrency);
    
    // Prepare payment intent data
    const paymentIntentData: Record<string, any> = {
      amount: Math.round(paymentAmount * 100), // Convert to cents
      currency: paymentCurrency.toLowerCase(),
      metadata: {
        ...(paymentRequest.metadata || {}),
        offer_id: offerId,
        passenger_count: passengers.length,
        source: 'where2-web',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      },
      payment_method_types: ['card']
    };

    // Extract and normalize the payment method
    let paymentMethodForApi: any = undefined;
    
    // Handle different payment method formats
    if (paymentRequest.payment_method) {
      const pm = paymentRequest.payment_method;
      if (typeof pm === 'string') {
        // It's a payment method ID string
        paymentMethodForApi = pm;
        console.log('Using payment method ID:', pm.substring(0, 8) + '...');
      } else if ('card' in pm && pm.card) {
        // It's a card object
        const card = pm.card;
        const cardNumber = String(card.number || '').replace(/\s+/g, '');
        
        // Use a working test card for development
        const useTestCard = process.env.NODE_ENV !== 'production' && cardNumber.startsWith('400000');
        const finalCardNumber = useTestCard ? '4242424242424242' : cardNumber;
        
        paymentMethodForApi = {
          type: 'card',
          card: {
            number: finalCardNumber,
            expiry_month: String(card.expiry_month || '12').padStart(2, '0'),
            expiry_year: String(card.expiry_year || (new Date().getFullYear() + 1)).replace(/^20/, ''),
            cvc: String(card.cvc || '123'),
            name: String(card.name || 'Test User')
          }
        };
        
        const last4 = paymentMethodForApi.card.number.slice(-4);
        console.log('Using card payment method (last 4):', '•••• ' + last4);
        
        if (useTestCard) {
          console.log('Using test card number for development');
        }
      } else if ('id' in pm && pm.id) {
        // It's an object with an ID
        paymentMethodForApi = pm.id;
        console.log('Using payment method ID from object:', pm.id.substring(0, 8) + '...');
      }
    } else if (paymentRequest.card_details) {
      // For backward compatibility with old format
      const cardDetails = paymentRequest.card_details;
      if (typeof cardDetails === 'string') {
        // If it's a string, use it as a payment method ID
        paymentMethodForApi = cardDetails;
        console.log('Using card details as payment method ID:', cardDetails.substring(0, 8) + '...');
      } else {
        // It's a CardDetails object
        const cardNumber = String(cardDetails.number || '').replace(/\s+/g, '');
        const useTestCard = process.env.NODE_ENV !== 'production' && cardNumber.startsWith('400000');
        const finalCardNumber = useTestCard ? '4242424242424242' : cardNumber;
        
        paymentMethodForApi = {
          type: 'card',
          card: {
            number: finalCardNumber,
            expiry_month: String(cardDetails.expiry_month || '12').padStart(2, '0'),
            expiry_year: String(cardDetails.expiry_year || (new Date().getFullYear() + 1)).replace(/^20/, ''),
            cvc: String(cardDetails.cvc || '123'),
            name: String(cardDetails.name || 'Test User')
          }
        };
        
        const last4 = paymentMethodForApi.card.number.slice(-4);
        console.log('Using card details object (last 4):', '•••• ' + last4);
        
        if (useTestCard) {
          console.log('Using test card number for development');
        }
      }
    } else if (paymentRequest.type === 'card' && paymentRequest.card) {
      // For backward compatibility with old format
      const card = paymentRequest.card;
      const cardNumber = String(card.number || '').replace(/\s+/g, '');
      const useTestCard = process.env.NODE_ENV !== 'production' && cardNumber.startsWith('400000');
      const finalCardNumber = useTestCard ? '4242424242424242' : cardNumber;
      
      paymentMethodForApi = {
        type: 'card',
        card: {
          number: finalCardNumber,
          expiry_month: String(card.expiry_month || '12').padStart(2, '0'),
          expiry_year: String(card.expiry_year || (new Date().getFullYear() + 1)).replace(/^20/, ''),
          cvc: String(card.cvc || '123'),
          name: String(card.name || 'Test User')
        }
      };
      
      const last4 = paymentMethodForApi.card.number.slice(-4);
      console.log('Using card object (last 4):', '•••• ' + last4);
      
      if (useTestCard) {
        console.log('Using test card number for development');
      }
    } else {
      throw new Error('No valid payment method provided');
    }
    
    // Log the payment method we're sending to createPaymentIntent (masking sensitive data)
    if (paymentMethodForApi) {
      const loggableMethod = typeof paymentMethodForApi === 'string' 
        ? { type: 'token', value: `${paymentMethodForApi.substring(0, 8)}...` }
        : {
            type: paymentMethodForApi.type,
            card: {
              number: paymentMethodForApi.card?.number ? `••••${String(paymentMethodForApi.card.number).slice(-4)}` : undefined,
              expiry_month: paymentMethodForApi.card?.expiry_month || '••',
              expiry_year: paymentMethodForApi.card?.expiry_year ? '••' : undefined,
              cvc: paymentMethodForApi.card?.cvc ? '•••' : undefined,
              name: paymentMethodForApi.card?.name ? '•••• ••••••' : undefined
            }
          };
      console.log('Sending payment method to createPaymentIntent:', loggableMethod);
      
      // Log the full payment method in development for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log('Full payment method (development only):', {
          ...paymentMethodForApi,
          card: {
            ...paymentMethodForApi.card,
            number: paymentMethodForApi.card?.number ? `••••${String(paymentMethodForApi.card.number).slice(-4)}` : undefined,
            cvc: '•••'
          }
        });
      }
    }

    // Create and confirm the payment intent in a single step
    const url = 'https://api.duffel.com/payments/payment_intents';
    console.log('Creating and confirming payment intent in one step');
    
    // Prepare payment intent request
    const paymentIntentRequest = {
      data: {
        amount: String(paymentAmount),
        currency: paymentCurrency.toUpperCase(),
        description: `Payment for offer ${offerId}`,
        metadata: {
          source: 'where2-web',
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
          amount: paymentAmount,
          currency: paymentCurrency,
          offer_id: offerId,
          passenger_count: passengers.length,
          masked_card: paymentMethodForApi.card ? `•••• •••• •••• ${paymentMethodForApi.card.number.slice(-4)}` : undefined
        },
        payment_method: paymentMethodForApi,
        return_url: 'https://your-website.com/return',
        confirm: true,
        statement_descriptor: 'WHERE2 FLIGHT',
        setup_future_usage: 'off_session',
        receipt_email: 'test@example.com', // In production, use the user's email
        // Add test mode flag if in development
        ...(process.env.NODE_ENV !== 'production' ? { test: true } : {})
      }
    };
    
    console.log('Sending payment intent request:', JSON.stringify(paymentIntentRequest, null, 2));
    
    let response;
    let responseData;
    
    try {
      console.log('Sending payment intent request to:', url);
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'Duffel-Version': 'v2',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'Authorization': 'Bearer [REDACTED]'
      });
      
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DUFFEL_API}`,
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip'
        },
        body: JSON.stringify(paymentIntentRequest)
      });
      
      console.log(`Payment intent API response status: ${response.status}`);
      
      // Try to parse response as JSON, but don't fail if it's not
      try {
        responseData = await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        const text = await response.text();
        console.error('Raw response text:', text);
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
      }
      
      if (!response.ok) {
        console.error('Payment intent creation failed:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData
        });
        
        const errorMessage = responseData?.errors?.[0]?.message || 
                            responseData?.error?.message || 
                            response.statusText || 
                            'Failed to create payment intent';
        
        return {
          success: false,
          error: errorMessage,
          requiresClientAction: false,
          status: 'failed',
          paymentIntent: responseData?.data || null,
          rawResponse: process.env.NODE_ENV === 'development' ? responseData : undefined
        } as PaymentOperationResponse;
      }
    } catch (error: any) {
      console.error('Network or API error during payment intent creation:', error);
      return {
        success: false,
        error: error.message || 'Network error during payment processing',
        requiresClientAction: false,
        status: 'failed',
        rawError: process.env.NODE_ENV === 'development' ? error : undefined
      } as PaymentOperationResponse;
    }

    // At this point, we have a successful response (status 2xx)
    const paymentIntent = responseData?.data;
    
    if (!paymentIntent) {
      console.error('No payment intent data in response:', responseData);
      return {
        success: false,
        error: 'Invalid response from payment provider',
        requiresClientAction: false,
        status: 'failed',
        rawResponse: process.env.NODE_ENV === 'development' ? responseData : undefined
      } as PaymentOperationResponse;
    }
    
    console.log('Payment intent API response:', {
      status: response.status,
      payment_intent: {
        id: paymentIntent?.id,
        status: paymentIntent?.status,
        client_secret: paymentIntent?.client_secret ? '••••' : undefined,
        amount: paymentIntent?.amount,
        currency: paymentIntent?.currency,
        created: paymentIntent?.created_at,
        last_payment_error: paymentIntent?.last_payment_error,
        next_action: paymentIntent?.next_action?.type,
        // Include more debug info in development
        ...(process.env.NODE_ENV === 'development' ? {
          raw_status: paymentIntent?.status,
          requires_action: paymentIntent?.status === 'requires_action',
          requires_payment_method: paymentIntent?.status === 'requires_payment_method',
          requires_confirmation: paymentIntent?.status === 'requires_confirmation',
          processing: paymentIntent?.status === 'processing',
          requires_capture: paymentIntent?.status === 'requires_capture',
          canceled: paymentIntent?.status === 'canceled',
          succeeded: paymentIntent?.status === 'succeeded',
          last_payment_error: paymentIntent?.last_payment_error,
          next_action: paymentIntent?.next_action
        } : {})
      }
    });

    // Handle the response based on the payment intent status
    switch (paymentIntent.status) {
      case 'requires_action':
      case 'requires_source_action':
        if (!paymentIntent.client_secret) {
          console.error('Payment requires action but no client_secret provided');
          return {
            success: false,
            error: 'Payment requires additional authentication but no client secret was provided',
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            paymentIntent: paymentIntent,
            requiresClientAction: false
          } as PaymentOperationResponse;
        }
        return {
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          requiresAction: true,
          status: 'requires_action',
          paymentIntent: paymentIntent
        } as PaymentOperationResponse;
        
      case 'requires_payment_method':
        console.error('Payment requires a valid payment method:', {
          payment_intent_id: paymentIntent.id,
          last_payment_error: paymentIntent.last_payment_error,
          status: paymentIntent.status
        });
        
        const errorMessage = paymentIntent.last_payment_error?.message || 
                            'The payment method was declined. Please try again with a different payment method.';
        
        return {
          success: false,
          error: errorMessage,
          paymentIntentId: paymentIntent.id,
          status: 'requires_payment_method',
          paymentIntent: paymentIntent,
          requiresClientAction: false,
          declineCode: paymentIntent.last_payment_error?.decline_code,
          code: paymentIntent.last_payment_error?.code
        } as PaymentOperationResponse;

      case 'succeeded':
        console.log('Payment succeeded:', paymentIntent.id);
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          status: 'succeeded',
          paymentIntent: paymentIntent
        } as PaymentOperationResponse;

      case 'requires_payment_method':
      case 'requires_source':
        console.error('Payment failed: requires_payment_method', paymentIntent.last_payment_error);
        throw new Error(
          paymentIntent.last_payment_error?.message || 
          'Payment failed. Please try again with a different payment method.'
        );

      case 'canceled':
        console.error('Payment was canceled:', paymentIntent.cancellation_reason);
        throw new Error('Payment was canceled');

      default:
        console.error('Unexpected payment status:', paymentIntent.status, paymentIntent);
        throw new Error(`Unexpected payment status: ${paymentIntent.status}`);
    }
  } catch (error: any) {
    console.error('Error in createPayment:', error);
    
    // Extract error message from different possible error formats
    let errorMessage = 'An error occurred while processing the payment';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    }
    
    // Log additional error details for debugging
    if (error?.response?.data) {
      console.error('Error details:', error.response.data);
    }
    
    return {
      success: false,
      error: errorMessage,
      requiresClientAction: false,
      status: 'failed',
      paymentIntent: error?.response?.data || null
    } as PaymentOperationResponse;
  }
}

export async function confirmPayment(
  paymentIntentId: string,
  paymentMethod: ConfirmPaymentMethod,
  returnUrl: string = 'https://your-website.com/return'
): Promise<ConfirmPaymentResponse> {
  // Prepare the confirm request with a fallback return URL for server-side execution
  const finalReturnUrl = typeof window !== 'undefined' 
    ? window.location.href 
    : returnUrl;

  try {
    console.log(`[confirmPayment] Starting confirmation for payment intent: ${paymentIntentId}`);
    
    if (!paymentIntentId) {
      throw new Error('Payment intent ID is required');
    }
    
    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }
    
    // First, check the current status of the payment intent
    const statusResponse = await getPaymentIntentStatus(paymentIntentId);
    
    if (!statusResponse.success) {
      throw new Error(`Failed to get payment intent status: ${statusResponse.error}`);
    }
    
    const currentStatus = statusResponse.status;
    const paymentIntentData = statusResponse.data;
    
    console.log(`[confirmPayment] Current payment intent status: ${currentStatus}`);

    // If already succeeded, return success
    if (currentStatus === 'succeeded') {
      console.log(`[confirmPayment] Payment intent ${paymentIntentId} is already succeeded`);
      return {
        success: true,
        status: 'succeeded',
        paymentIntentId,
        paymentIntent: paymentIntentData,
        amount: paymentIntentData.amount,
        currency: paymentIntentData.currency || 'EUR',
      };
    }
    
    // If requires action, return the client secret for 3D Secure
    if (currentStatus === 'requires_action') {
      return {
        success: true,
        clientSecret: paymentIntentData.client_secret,
        paymentIntentId: paymentIntentData.id,
        requiresAction: true,
        status: 'requires_action'
      };
    }

    // If the payment intent requires a payment method, attach and confirm it
    if (currentStatus === 'requires_payment_method') {
      console.log(`[confirmPayment] Payment intent requires a payment method, attaching and confirming...`);
      
      // Handle different payment method types
      let paymentMethodForApi;
      
      if (typeof paymentMethod === 'string') {
        // If it's a payment method ID
        paymentMethodForApi = paymentMethod;
      } else if (paymentMethod && 'card' in paymentMethod) {
        const card = paymentMethod.card;
        let cardNumber = String(card.number || '').replace(/\s+/g, '');
        
        // Use a working test card for development
        if (process.env.NODE_ENV !== 'production' && cardNumber.startsWith('400000')) {
          console.log('Using test card number for development');
          // Use a working test card number
          cardNumber = '4242424242424242';
        }
        
        // Format expiry
        let expiryMonth = '';
        let expiryYear = '';
        
        if ('expiry' in card && card.expiry) {
          // Handle MM/YY or MM/YYYY format
          const expiryParts = String(card.expiry).split('/').map(part => part.trim());
          if (expiryParts.length >= 2) {
            expiryMonth = expiryParts[0].padStart(2, '0');
            expiryYear = expiryParts[1].length === 2 ? `20${expiryParts[1]}` : expiryParts[1];
          }
        } else {
          // Use separate month/year if available
          expiryMonth = String(card.expiry_month || '12').padStart(2, '0');
          expiryYear = String(card.expiry_year || new Date().getFullYear() + 1);
          if (expiryYear.length === 2) {
            expiryYear = `20${expiryYear}`; // Convert YY to YYYY
          }
        }
        
        // Ensure expiry is in the future
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        if (parseInt(expiryYear) < currentYear || 
            (parseInt(expiryYear) === currentYear && parseInt(expiryMonth) < currentMonth)) {
          throw new Error('Card has expired. Please use a valid expiry date.');
        }
        
        // Validate required fields
        if (!cardNumber || !expiryMonth || !expiryYear || !card.cvc) {
          throw new Error('Missing required card details. Please provide card number, expiry, and CVC.');
        }
        
        paymentMethodForApi = {
          type: 'card',
          card: {
            number: cardNumber,
            expiry_month: expiryMonth,
            expiry_year: expiryYear,
            cvc: String(card.cvc || '123'), // Default test CVC if not provided
            name: String(card.name || 'Test User')
          }
        };
        
        console.log('Formatted payment method for API:', {
          ...paymentMethodForApi,
          card: {
            ...paymentMethodForApi.card,
            number: '••••' + (cardNumber.length > 4 ? cardNumber.slice(-4) : ''),
            cvc: '•••'
          }
        });
      } else {
        throw new Error('Invalid payment method format. Must be a payment method ID or card details object');
      }
      
      console.log(`[confirmPayment] Sending payment method to confirm endpoint`);
      
      // In v2, we can directly confirm the payment intent with the payment method
      const confirmUrl = `https://api.duffel.com/payments/payment_intents/${paymentIntentId}/actions/confirm`;
      console.log(`[confirmPayment] Confirming payment intent with payment method at: ${confirmUrl}`);
      
      const confirmResponse = await fetch(confirmUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DUFFEL_API}`,
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip'
        },
        body: JSON.stringify({
          data: {
            payment_method: paymentMethodForApi,
            return_url: returnUrl
          }
        })
      });
      
      console.log(`[confirmPayment] Payment intent confirmation response status: ${confirmResponse.status}`);
      
      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json().catch(() => ({}));
        console.error(`[confirmPayment] Failed to confirm payment:`, errorData);
        throw new Error(errorData.errors?.[0]?.message || 'Failed to confirm payment');
      }
      
      const result = await confirmResponse.json();
      const updatedIntent = result.data;
      
      console.log(`[confirmPayment] Payment intent confirmed with status: ${updatedIntent.status}`);
      
      // Handle the response based on the payment intent status
      if (updatedIntent.status === 'requires_action' && updatedIntent.client_secret) {
        return {
          success: true,
          clientSecret: updatedIntent.client_secret,
          paymentIntentId: updatedIntent.id,
          requiresAction: true,
          status: 'requires_action'
        };
      }
      
      if (updatedIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntent: updatedIntent,
          paymentIntentId: updatedIntent.id,
          status: 'succeeded',
          amount: updatedIntent.amount,
          currency: updatedIntent.currency || 'EUR'
        };
      }
      
      // For any other status, return the current state
      return {
        success: false,
        paymentIntent: updatedIntent,
        paymentIntentId: updatedIntent.id,
        status: updatedIntent.status || 'unknown',
        error: `Payment status: ${updatedIntent.status || 'unknown'}`
      };
    }
    
    // If we get here, the payment intent is in an unexpected state
    throw new Error(`Cannot process payment intent in state: ${currentStatus.status}`);
  } catch (error) {
    console.error(`[confirmPayment] Error confirming payment:`, error);
    return {
      success: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error confirming payment',
      paymentIntentId
    };
  }
}

// Get payment intent status
export async function getPaymentIntentStatus(paymentIntentId: string) {
  try {
    console.log(`[getPaymentIntentStatus] Getting status for payment intent: ${paymentIntentId}`);
    
    const response = await fetch(`https://api.duffel.com/payments/payment_intents/${paymentIntentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DUFFEL_API}`,
        'Duffel-Version': 'v2',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[getPaymentIntentStatus] Failed to get payment intent status:`, errorData);
      return {
        success: false,
        error: errorData.errors?.[0]?.message || 'Failed to get payment intent status',
        status: 'error'
      };
    }
    
    const responseData = await response.json();
    console.log(`[getPaymentIntentStatus] Received payment intent data:`, JSON.stringify(responseData, null, 2));
    
    return {
      success: true,
      status: responseData.data.status,
      data: responseData.data
    };
  } catch (error) {
    console.error(`[getPaymentIntentStatus] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    };
  }
}

// Get order details
export async function getOrderDetails(orderId: string): Promise<{
  success: boolean;
  order?: any;
  error?: string;
}> {
  try {
    const order = await duffel.orders.get(orderId);
    return { success: true, order };
  } catch (error: any) {
    console.error('Error fetching order details:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch order details'
    };
  }
}

export default duffel;
