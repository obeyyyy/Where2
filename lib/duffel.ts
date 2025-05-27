import { Duffel } from '@duffel/api';

// Initialize Duffel client with API key from environment variables
const duffel = new Duffel({
  token: process.env.DUFFEL_ACCESS_TOKEN!,
  debug: { verbose: true },
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'test',
});

// Types for Duffel API
type PaymentType = 'balance' | 'arc_bsp_cash' | 'arc_bsp_credit' | 'arc_bsp_credit_card';

interface PaymentRequest {
  type: PaymentType;
  amount: string;
  currency: string;
  order_id: string;
  card_details?: {
    number: string;
    expiry_month: string;
    expiry_year: string;
    cvc: string;
    name: string;
  };
}

interface PassengerDetails {
  type: 'adult' | 'child' | 'infant_without_seat' | 'infant_with_seat';
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'm' | 'f' | 'x' | '';
  email: string;
  phone: string;
  documentType: 'passport' | 'passport_card' | 'national_identity_card' | 'driving_licence' | 'other';
  documentNumber: string;
  documentIssuingCountryCode: string;
  documentExpiryDate: string;
  documentNationality: string;
  address: {
    addressLine1: string;
    city: string;
    countryCode: string;
    postalCode: string;
  };
}

export async function createPayment(
  offerId: string,
  payment: PaymentRequest,
  passengers: PassengerDetails[],
  metadata: Record<string, any> = {}
) {
  try {
    // 1. Create an order
    const order = await duffel.orders.create({
      selected_offers: [offerId],
      passengers: passengers.map(passenger => ({
        born_on: passenger.dateOfBirth,
        email: passenger.email,
        family_name: passenger.lastName,
        gender: passenger.gender || null,
        given_name: passenger.firstName,
        title: passenger.title,
        phone_number: passenger.phone,
        identity_documents: [
          {
            type: passenger.documentType,
            unique_identifier: passenger.documentNumber,
            issuing_country_code: passenger.documentIssuingCountryCode,
            expires_on: passenger.documentExpiryDate,
          },
        ],
      })),
      payments: [
        {
          type: payment.type,
          currency: payment.currency,
          amount: payment.amount,
          ...(payment.type === 'arc_bsp_credit_card' && payment.card_details
            ? {
                card_number: payment.card_details.number,
                expiry_month: payment.card_details.expiry_month,
                expiry_year: payment.card_details.expiry_year,
                cvc: payment.card_details.cvc,
                name: payment.card_details.name,
              }
            : {}),
        },
      ],
      metadata,
    });

    return { success: true, order };
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return { 
      success: false, 
      error: error.errors?.[0]?.message || 'Failed to process payment' 
    };
  }
}

export async function getOrderDetails(orderId: string) {
  try {
    const order = await duffel.orders.get(orderId, {
      return_available_services: true,
    });
    return { success: true, order };
  } catch (error: any) {
    console.error('Error fetching order details:', error);
    return { 
      success: false, 
      error: error.errors?.[0]?.message || 'Failed to fetch order details' 
    };
  }
}

export default duffel;
