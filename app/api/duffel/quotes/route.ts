import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

export const dynamic = 'force-dynamic'; // Ensure we get fresh data on each request

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rateId = searchParams.get('rateId');

  if (!rateId) {
    console.error('Missing rateId parameter');
    return NextResponse.json(
      { error: 'Missing rateId parameter' },
      { status: 400 }
    );
  }

  console.log('Fetching quote for rate ID:', rateId);

  try {
    // Check if the rate ID is valid
    if (!rateId.startsWith('rate_')) {
      console.error('Invalid rate ID format');
      return NextResponse.json(
        { error: 'Invalid rate ID format' },
        { status: 400 }
      );
    }

    const response = await duffel.stays.quotes.get(rateId);
    
    if (!response || !response.data) {
      console.error('No data received from Duffel API');
      return NextResponse.json(
        { error: 'No data received from the booking service' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(response.data);
    
  } catch (error: any) {
    console.error('Error details:', {
      message: error.message,
      code: error.errors?.[0]?.code,
      status: error.meta?.status,
      requestId: error.meta?.request_id,
      rateId
    });

    if (error.meta?.status === 404) {
      return NextResponse.json(
        { 
          error: 'This rate is no longer available. Please search for rooms again.',
          code: 'RATE_EXPIRED'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: error.errors?.[0]?.message || 'Failed to fetch quote. Please try again.',
        code: error.errors?.[0]?.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
