import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const searchResultId = params.id;
    
    // Fetch all rates for this search result
    const ratesResponse = await duffel.stays.searchResults.fetchAllRates(searchResultId);
    
    return NextResponse.json({
      success: true,
      rates: ratesResponse.data
    });
    
  } catch (error: any) {
    console.error('Error fetching hotel rates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch hotel rates' 
      },
      { status: 500 }
    );
  }
}
