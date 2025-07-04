import { NextResponse } from 'next/server';
import { Duffel } from '@duffel/api';
import { ANCILLARY_MARKUP } from '@/lib/pricing';
import { computePricing, PricingBreakdown as BasePricingBreakdown } from '@/lib/pricing';

// Duffel payment intent maximum amount (in GBP)
const DUFFEL_MAX_AMOUNT_GBP = 5000;

// Approximate exchange rates (as of July 2025)
const EXCHANGE_RATES = {
  EUR: 0.85, // 1 EUR = 0.85 GBP
  USD: 0.78, // 1 USD = 0.78 GBP
  GBP: 1,    // 1 GBP = 1 GBP
};

// Check if amount exceeds Duffel's limit
function exceedsDuffelLimit(amount: number, currency: string): boolean {
  // Convert from cents to whole units if amount is large (likely in cents)
  const amountInWholeUnits = amount > 1000 ? amount / 100 : amount;
  const exchangeRate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 0.85; // Default to EUR rate
  const amountInEUR = amountInWholeUnits * exchangeRate;
  console.log(`Debug - Payment amount check: ${amount} ${currency} (${amountInWholeUnits} whole units) = ${amountInEUR} EUR, limit: ${DUFFEL_MAX_AMOUNT_GBP} GBP`);
  return amountInEUR > DUFFEL_MAX_AMOUNT_GBP;
}

export async function POST(request: Request) {
  try {
    const { amount, currency = 'EUR', paymentIntentId, metadata = {}, offerId, ancillarySelection } = await request.json();

    console.log('[API] create-payment-intent - received', { amount, currency, paymentIntentId, metadata, offerId, hasAncillaries: !!ancillarySelection });
    
    // If we have an offerId and ancillarySelection, calculate the total server-side
    let finalAmount = parseFloat(amount);
    let calculationBreakdown = { baseAmount: finalAmount, ancillaryTotal: 0, markupTotal: 0, serviceTotal: 0 };
    
    if (offerId && ancillarySelection?.services?.length > 0) {
      console.log('[API] Calculating total with ancillaries server-side');
      
      // Calculate ancillary total WITHOUT additional markup
      // The Duffel component already applies markup via its markup prop
      const ancillaryTotal = ancillarySelection.services.reduce((sum: number, service: any) => {
        // Use the amount directly from the service without adding markup again
        // This amount already includes markup applied by the Duffel component
        const serviceAmount = parseFloat(service.amount || service.total_amount || '0');
        const serviceType = (service.type || '').toLowerCase();
        
        console.log(`[API] Ancillary service: ${serviceType}, amount: ${serviceAmount}`);
        
        // DO NOT add markup again - the Duffel component already did this
        return sum + serviceAmount;
      }, 0);
      
      calculationBreakdown.ancillaryTotal = ancillaryTotal;
      
      // Only add the ancillary total to the base amount
      // The base flight price already includes markup and service fees
      finalAmount = parseFloat(amount) + ancillaryTotal;
      
      console.log('[API] Server-side calculation:', { 
        baseAmount: parseFloat(amount), 
        ancillaryTotal, 
        finalAmount 
      });
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    
    // Check if amount exceeds Duffel's limit
    if (exceedsDuffelLimit(finalAmount, currency)) {
      return NextResponse.json({
        error: `Amount exceeds Duffel's maximum limit of 5000 EUR (or equivalent in ${currency})`,
        code: 'amount_exceeds_maximum',
        duffelLimit: DUFFEL_MAX_AMOUNT_GBP,
        currency: 'EUR'
      }, { status: 400 });
    }

    const duffel = new Duffel({
      token: process.env.DUFFEL_API!,
      debug: { verbose: true },
    });

    if (paymentIntentId) {
      // Update existing payment intent amount/currency if needed
      // Convert from cents to whole units if amount is large (likely in cents)
      const amountForDuffel = finalAmount > 1000 ? (finalAmount / 100).toFixed(2) : finalAmount.toFixed(2);
      console.log(`Debug - Sending amount to Duffel: ${amountForDuffel} ${currency} (original: ${finalAmount})`);
      
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
            amount: amountForDuffel,
            currency,
            metadata: {
              ...metadata,
              amount_original: finalAmount,
              updated_at: new Date().toISOString()
            }
          }
        }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        return NextResponse.json(updateData, { status: updateRes.status });
      }
      return NextResponse.json({ 
        clientToken: updateData.data.client_token || updateData.data.client_secret, 
        paymentIntentId: updateData.data.id,
        amount: finalAmount,
        currency,
        breakdown: calculationBreakdown
      });
    }

    // Create new payment intent
    // Convert from cents to whole units if amount is large (likely in cents)
    const amountForDuffel = finalAmount > 1000 ? (finalAmount / 100).toFixed(2) : finalAmount.toFixed(2);
    console.log(`Debug - Sending amount to Duffel: ${amountForDuffel} ${currency} (original: ${finalAmount})`);
    
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
          amount: amountForDuffel,
          currency,
          payment: {
            type: 'card',
            card: { capture_now: true },
          },
          metadata: {
            ...metadata,
            baseAmount: metadata.baseAmount || finalAmount,
            ancillaryAmount: metadata.ancillaryAmount || calculationBreakdown.ancillaryTotal,
            created_at: new Date().toISOString()
          },
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/complete`,
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error creating payment intent:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json({ 
      clientToken: data.data.client_token || data.data.client_secret, 
      paymentIntentId: data.data.id,
      amount: finalAmount,
      currency,
      breakdown: calculationBreakdown
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
