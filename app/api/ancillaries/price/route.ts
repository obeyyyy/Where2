import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ancillaries/price
 * Body: { offerId: string, services: Array<{ id: string, quantity: number }>, markup: number }
 * Returns: { breakdown: Array<{ id: string, label: string, amount: number, currency: string, originalAmount: number, markup: number }>, total: number, currency: string }
 */

export async function POST(req: NextRequest) {
  try {
    const { offerId, services, markup = 0 } = await req.json();

    if (!offerId || !Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const DUFFEL_TOKEN = process.env.DUFFEL_API;
    if (!DUFFEL_TOKEN) {
      return NextResponse.json({ error: 'Duffel secret key not configured' }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DUFFEL_TOKEN}`,
      Accept: 'application/json',
    };

    const breakdown: { id: string; label: string; amount: number; currency: string; originalAmount: number; markup: number }[] = [];
    let currency = 'EUR';

    // Fetch each service to get price
    for (const svc of services) {
      const res = await fetch(`https://api.duffel.com/air/offer_services/${svc.id}`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Duffel service fetch failed', svc.id, err);
        continue;
      }

      const json = await res.json();
      const { total_amount, total_currency, name, type } = json.data || {};
      if (!total_amount) continue;

      const amt = parseFloat(total_amount) * (1 + markup);
      currency = total_currency || currency;
      breakdown.push({
        id: svc.id,
        label: `${name} (${type})`,
        amount: amt,
        currency: currency,
        originalAmount: parseFloat(total_amount),
        markup: markup
      });
    }
    console.log('Ancillary breakdown API ROUTE : ', breakdown);
    const total = breakdown.reduce((sum, b) => sum + b.amount, 0);

    return NextResponse.json({ breakdown, total, currency }, { status: 200 });
  } catch (error: any) {
    console.error('Ancillary price route error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
