import { NextResponse } from 'next/server';

const BASE_URL = 'https://test.api.amadeus.com/v2';
const AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';

// Cache object to store token and its expiration time
let tokenCache = {
  token: '',
  expiresAt: 0
};

async function getAccessToken() {
  console.log('getAccessToken called');
  
  // If token exists and is not expired, return cached token
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) { // 1 minute buffer
    console.log('Using cached token, expires at:', new Date(tokenCache.expiresAt).toISOString());
    return tokenCache.token;
  }
  
  console.log('Fetching new token...');

  try {
    // Basic Auth header for token request
    const authHeader = 'Basic ' + Buffer.from(
      `${process.env.AMADEUS_CLIENT_ID}:${process.env.AMADEUS_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token error response:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData
      });
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const data = await tokenResponse.json();
    
    if (!data.access_token) {
      throw new Error('No access token received in response');
    }
    
    // Cache the token with its expiration time (default to 30 minutes if not provided)
    const expiresIn = (data.expires_in || 1800) * 1000; // Convert to milliseconds
    const newExpiresAt = Date.now() + expiresIn;
    tokenCache = {
      token: data.access_token,
      expiresAt: newExpiresAt
    };
    
    console.log('New token obtained, expires at:', new Date(newExpiresAt).toISOString());
    console.log('Token type:', data.token_type || 'Bearer');
    return data.access_token;
  } catch (error) {
    console.error('Token fetch error:', error);
    throw new Error('Authentication failed');
  }
}

export async function GET() {
  try {
    const token = await getAccessToken();
    
    // Get current date and add 30 days for departure
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() + 30);
    
    // Add 7 days for return
    const returnDate = new Date(departureDate);
    returnDate.setDate(returnDate.getDate() + 7);
    
    // Format dates as YYYY-MM-DD
    const departureDateStr = departureDate.toISOString().split('T')[0];
    const returnDateStr = returnDate.toISOString().split('T')[0];

    // Make sure we have a valid token
    if (!token) {
      throw new Error('No access token available');
    }
    
    // Construct the flight offers search URL with all required parameters
    const searchParams = new URLSearchParams({
      originLocationCode: 'MAD',
      destinationLocationCode: 'PAR',
      departureDate: departureDateStr,
      returnDate: returnDateStr,
      adults: '1',
      max: '5',
      currencyCode: 'EUR',
      nonStop: 'false'
    });
    
    const url = `${BASE_URL}/shopping/flight-offers?${searchParams.toString()}`;

    console.log('Making API request with token:', token ? `${token.substring(0, 10)}...` : 'No token');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const tripData = await response.json();
    return NextResponse.json(tripData);
  } catch (error) {
    console.error('Error in GET route:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch trip data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
