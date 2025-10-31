import { NextResponse } from 'next/server';
import { duffel } from '@/lib/duffel';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const searchResultId = params.id;
    if (!searchResultId || !searchResultId.startsWith('srr_')) {
      return NextResponse.json(
        { success: false, error: 'Invalid search result id. Expected srr_*' },
        { status: 400 }
      );
    }
    
    // Fetch all rates for this search result
    const ratesResponse = await duffel.stays.searchResults.fetchAllRates(searchResultId);
    const normalize = (resp: any): any[] => {
      if (Array.isArray(resp)) return resp;
      if (resp?.data && Array.isArray(resp.data)) return resp.data;
      if (resp?.records && Array.isArray(resp.records)) return resp.records;
      if (resp?.rates && Array.isArray(resp.rates)) return resp.rates;
      if (resp?.data?.rates && Array.isArray(resp.data.rates)) return resp.data.rates;
      if (Array.isArray(resp?.data?.records)) return resp.data.records;
      return [];
    };
    const rates = normalize(ratesResponse);
    
    return NextResponse.json({
      success: true,
      rates
    });
    
  } catch (error: any) {
    console.error('Error fetching hotel rates:', error);
    const status = error?.meta?.status || 500;
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch hotel rates'
      },
      { status }
    );
  }
}
