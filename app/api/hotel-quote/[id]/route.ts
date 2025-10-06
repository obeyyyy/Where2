import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rateId = params.id;
    
    // Request a quote for this rate
    const quoteResponse = await duffel.stays.quotes.create(rateId);
    
    return NextResponse.json({
      success: true,
      quote: quoteResponse.data
    });
    
  } catch (error: any) {
    console.error('Error creating hotel quote:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create hotel quote' 
      },
      { status: 500 }
    );
  }
}
