const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export interface MapboxFeature {
  id: string;
  place_type: string[];
  relevance: number;
  text: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  geometry: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  context?: Array<{
    id: string;
    text: string;
    wikidata?: string;
    short_code?: string;
  }>;
}

export async function geocodeLocation(query: string): Promise<MapboxFeature[]> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('Mapbox access token is not configured');
  }

  const searchText = encodeURIComponent(query);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchText}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,neighborhood,address&limit=5`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to geocode location');
    }

    return data.features || [];
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode location. Please try again.');
  }
}

export async function getCoordinatesForLocation(location: string): Promise<{ lat: number; lon: number }> {
  const features = await geocodeLocation(location);
  
  if (features.length === 0) {
    throw new Error('No matching locations found');
  }

  // Get the most relevant result (first one)
  const [lon, lat] = features[0].center;
  return { lat, lon };
}
