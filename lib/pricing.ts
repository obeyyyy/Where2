// Utility functions to keep pricing logic in one place


export const ANCILLARY_MARKUP = {
  bags: {
    amount: 1,   // +€1 per bag
    rate: 0.09,  // +8 %
  },
  seats: {
    amount: 2,   // +€2 per seat
    rate: 0.08,
  },
  cancel_for_any_reason: {
    amount: 0,
    rate: 0.25,  // +25 %
  },
} as const;


export interface PricingBreakdown {
  ancillaryRows: any;
  base: number;
  markupPerPassenger: number;
  servicePerPassenger: number;
  passengers: number;
  markupTotal: number;
  serviceTotal: number;
  total: number;
  currency: string;
  ancillaryTotal: number;
}

/**
 * Compute the full pricing breakdown for a trip.
 *
 * @param baseAmount      The base price returned by Duffel (already includes taxes).
 * @param passengers      Number of passengers.
 * @param currency        Currency code (defaults to EUR).
 * @param markupPerPax    Fixed markup fee per passenger.
 * @param servicePerPax   Fixed service fee per passenger.
 * @param ancillaryTotal  Ancillary total (e.g. bags, seats, etc.)
 */
export function computePricing (
  {
    baseAmount,
    passengers,
    currency = 'EUR',
    markupPerPax = 2.00,
    servicePerPax = 1.00,
    ancillaryTotal = 0,
  }: {
    baseAmount: number;
    passengers: number;
    currency?: string;
    markupPerPax?: number;
    servicePerPax?: number;
    ancillaryTotal?: number;
  }
): PricingBreakdown {
  const markupTotal = markupPerPax * passengers;
  const serviceTotal = servicePerPax * passengers;
  const total = +(baseAmount + markupTotal + serviceTotal + ancillaryTotal).toFixed(2);

  return {
    base: +baseAmount.toFixed(2),
    markupPerPassenger: markupPerPax,
    servicePerPassenger: servicePerPax,
    passengers,
    markupTotal: +markupTotal.toFixed(2),
    serviceTotal: +serviceTotal.toFixed(2),
    total,
    currency,
    ancillaryTotal,
    ancillaryRows: undefined,
  };
}

