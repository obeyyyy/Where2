import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const searchResultId = params.id;
    
    if (!searchResultId) {
      return NextResponse.json(
        { error: 'Search result ID is required' },
        { status: 400 }
      );
    }

    // Fetch all available room rates for the selected hotel
    const ratesResponse = await duffel.stays.searchResults.fetchAllRates(searchResultId);

    return NextResponse.json({
      success: true,
      rates: ratesResponse.data
    });
  } catch (error: any) {
    console.error('Error fetching hotel details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch hotel details',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
