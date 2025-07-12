import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rateId } = body;

    if (!rateId) {
      return NextResponse.json(
        { error: 'Rate ID is required' },
        { status: 400 }
      );
    }

    // Call Duffel Stays API to create a quote for the selected rate
    const quoteResponse = await duffel.stays.quotes.create(rateId);

    return NextResponse.json({
      success: true,
      quote: quoteResponse.data
    });
  } catch (error: any) {
    console.error('Error creating hotel quote:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create hotel quote',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
