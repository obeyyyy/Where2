import { FilterState, SearchParams } from "@/types/trip-search.types";

// constants/trip-search.constants.ts
export const DEFAULT_SEARCH_PARAMS: SearchParams = {
  budget: 750,
  currency: 'USD',
  origin: 'MAD',
  destination: 'PAR',
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  tripType: 'roundtrip',
  travelers: 1,
  nights: 7,
  includeHotels: true,
  useDuffel: true
};

export const DEFAULT_FILTERS: FilterState = {
  maxPrice: 5000,
  maxStops: 2,
  airlines: [],
  sortBy: 'price',
  sortOrder: 'asc'
};

export const QUICK_SELECT_BUDGETS = [250, 500, 750, 1000, 1500];

export const POPULAR_DESTINATIONS = [
  { code: 'PAR', name: 'Paris' },
  { code: 'LON', name: 'London' },
  { code: 'NYC', name: 'New York' },
  { code: 'ROM', name: 'Rome' },
  { code: 'BCN', name: 'Barcelona' },
];

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export const STOP_OPTIONS = [
  { label: 'Non-stop', value: 0 },
  { label: '1 stop max', value: 1 },
  { label: 'All flights', value: 2 }
];

export const SEARCH_VALIDATION = {
  MIN_TRAVELERS: 1,
  MAX_TRAVELERS: 9,
  MIN_BUDGET: 100,
  MAX_BUDGET: 10000,
  MIN_NIGHTS: 1,
  MAX_NIGHTS: 30,
} as const;

// Form step configuration
export const FORM_STEPS = [
  { id: 'initial', label: 'Budget', icon: 'FiDollarSign' },
  { id: 'dates', label: 'Dates', icon: 'FiCalendar' },
  { id: 'details', label: 'Details', icon: 'FiUsers' }
] as const;