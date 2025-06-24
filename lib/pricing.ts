// Utility functions to keep pricing logic in one place
// This temporary module provides a single‐source-of-truth pricing breakdown
// until a full backend quoting service is introduced.

export interface PricingBreakdown {
  base: number;
  markupPerPassenger: number;
  servicePerPassenger: number;
  passengers: number;
  markupTotal: number;
  serviceTotal: number;
  total: number;
  currency: string;
}

/**
 * Compute the full pricing breakdown for a trip.
 *
 * @param baseAmount      The base price returned by Duffel (already includes taxes).
 * @param passengers      Number of passengers.
 * @param currency        Currency code (defaults to EUR).
 * @param markupPerPax    Fixed markup fee per passenger.
 * @param servicePerPax   Fixed service fee per passenger.
 */
export function computePricing (
  {
    baseAmount,
    passengers,
    currency = 'EUR',
    markupPerPax = 2.00,
    servicePerPax = 1.00,
  }: {
    baseAmount: number;
    passengers: number;
    currency?: string;
    markupPerPax?: number;
    servicePerPax?: number;
  }
): PricingBreakdown {
  const markupTotal = markupPerPax * passengers;
  const serviceTotal = servicePerPax * passengers;
  const total = +(baseAmount + markupTotal + serviceTotal).toFixed(2);

  return {
    base: +baseAmount.toFixed(2),
    markupPerPassenger: markupPerPax,
    servicePerPassenger: servicePerPax,
    passengers,
    markupTotal: +markupTotal.toFixed(2),
    serviceTotal: +serviceTotal.toFixed(2),
    total,
    currency,
  };
}
