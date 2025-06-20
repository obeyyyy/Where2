declare module 'airports-data' {
  interface Airport {
    iata: string;
    icao?: string;
    faa?: string;
    name: string;
    city: string;
    country: string;
    alt?: string;
    lat?: string;
    lon?: string;
    tz?: string;
  }

declare module 'airports-json' {
  interface Airport {
    iata: string;
    icao?: string;
    faa?: string;
    name: string;
    city: string;
    country: string;
    alt?: string;
    lat?: string;
    lon?: string;
    tz?: string;
  }
  const airportsJson: {
    airports: Airport[];
    regions?: any;
    countries?: any;
  };
  export default airportsJson;
}
  const airports: { [key: string]: Airport };
  export default airports;
}

declare module 'airports-json' {
  interface Airport {
    iata: string;
    icao?: string;
    faa?: string;
    name: string;
    city: string;
    country: string;
    alt?: string;
    lat?: string;
    lon?: string;
    tz?: string;
  }
  const airportsJson: {
    airports: Airport[];
    regions?: any;
    countries?: any;
  };
  export default airportsJson;
}