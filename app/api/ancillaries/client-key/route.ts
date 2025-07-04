import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get the offer ID from query params
  const url = new URL(req.url);
  const offerId = url.searchParams.get('offerId');
  
  console.log(`[API] Ancillaries data requested for offer: ${offerId}`);
  
  if (!offerId) {
    console.error('[API] No offer ID provided');
    return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
  }
  
  // Verify DUFFEL_API exists
  if (!process.env.DUFFEL_API) {
    console.error('[API] Missing DUFFEL_API environment variable');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }
  
  const headers = {
    'Authorization': `Bearer ${process.env.DUFFEL_API}`,
    'Duffel-Version': 'v2',
    'Accept': 'application/json'
  };
  
  try {
    // Step 1: Create a component client key (required for Duffel UI components)
    console.log('[API] Creating component client key');
    const keyRes = await fetch('https://api.duffel.com/identity/component_client_keys', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // no scoping for now; can include user_id, order_id, etc.
    });

    if (!keyRes.ok) {
      const errorText = await keyRes.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { raw: errorText };
      }
      
      console.error(`[API] Failed to create component client key (${keyRes.status})`, errorData);
      return NextResponse.json(
        { error: `Failed to create component client key (${keyRes.status})`, details: errorData },
        { status: keyRes.status }
      );
    }
    
    const keyJson = await keyRes.json();
    const clientKey = keyJson?.data?.component_client_key || keyJson?.component_client_key;
    console.log('[API] Component client key created');
    if (!clientKey) {
      console.error('[API] component_client_key missing in response', keyJson);
      return NextResponse.json({ error: 'Invalid ancillary session response format' }, { status: 500 });
    }

    console.log('[API] Returning client_key for ancillaries component');
    return NextResponse.json({ client_key: clientKey });
  } catch (error) {
    console.error('[API] Error fetching ancillaries data:', error);
    return NextResponse.json({ 
      error: 'Failed to get ancillaries data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
