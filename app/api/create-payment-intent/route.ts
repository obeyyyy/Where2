import { NextResponse } from 'next/server';
import { Duffel } from '@duffel/api';

export async function POST(request: Request) {
  try {
    const { amount, currency = 'EUR', paymentIntentId } = await request.json();

    console.log('[API] create-payment-intent - received', { amount, currency, paymentIntentId });

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const duffel = new Duffel({
      token: process.env.DUFFEL_API!,
      debug: { verbose: true },
    });

    if (paymentIntentId) {
      // Update existing payment intent amount/currency if needed
      const updateRes = await fetch(`https://api.duffel.com/payments/payment_intents/${paymentIntentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          'Accept': 'application/json',
          Authorization: `Bearer ${process.env.DUFFEL_API}`,
        },
        body: JSON.stringify({
          data: {
            amount: parseFloat(amount).toFixed(2),
            currency,
          },
        }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        return NextResponse.json(updateData, { status: updateRes.status });
      }
      return NextResponse.json({ clientToken: updateData.data.client_token || updateData.data.client_secret, paymentIntentId: updateData.data.id });
    }

    // Create new payment intent
    const response = await fetch('https://api.duffel.com/payments/payment_intents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Duffel-Version': 'v2',
        'Accept': 'application/json',
        Authorization: `Bearer ${process.env.DUFFEL_API}`,
      },
      body: JSON.stringify({
        data: {
          amount: parseFloat(amount).toFixed(2),
          currency,
          payment: {
            type: 'card',
            card: { capture_now: true },
          },
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/complete`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ clientToken: data.data.client_token || data.data.client_secret, paymentIntentId: data.data.id });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
