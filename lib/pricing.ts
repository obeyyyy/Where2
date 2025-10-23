// Utility functions to keep pricing logic in one place

import { AncillaryRow } from "@/types/Ancillary";


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
  base: number;                    // Base flight price
  markupPerPassenger: number;      // Fixed markup per passenger
  servicePerPassenger: number;     // Fixed service fee per passenger
  passengers: number;              // Number of passengers
  markupTotal: number;             // Total markup (markupPerPassenger * passengers)
  serviceTotal: number;            // Total service fee (servicePerPassenger * passengers)
  ancillaryTotal: number;          // Total for all ancillaries
  total: number;                   // Grand total (base + markupTotal + serviceTotal + ancillaryTotal)
  currency: string;                // Currency code
  ancillaryRows: AncillaryRow[];   // Detailed breakdown of ancillaries
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
export function computePricing(params: {
  baseAmount: number;
  passengers: number;
  currency?: string;
  markupPerPax?: number;
  servicePerPax?: number;
  ancillaryTotal?: number;
  ancillaryRows?: AncillaryRow[];
}): PricingBreakdown {
  // Input validation
  if (params.baseAmount < 0) {
    throw new Error('Base amount cannot be negative');
  }
  if (params.passengers < 1) {
    throw new Error('At least one passenger is required');
  }
  if (params.ancillaryTotal && params.ancillaryTotal < 0) {
    throw new Error('Ancillary total cannot be negative');
  }

  const {
    baseAmount,
    passengers,
    currency = 'EUR',
    markupPerPax = 2.00,
    servicePerPax = 1.00,
    ancillaryTotal = 0,
    ancillaryRows = []
  } = params;

  // Calculate totals
  const markupTotal = +(markupPerPax * passengers).toFixed(2);
  const serviceTotal = +(servicePerPax * passengers).toFixed(2);
  const total = +(baseAmount + markupTotal + serviceTotal + ancillaryTotal).toFixed(2);

  return {
    base: +baseAmount.toFixed(2),
    markupPerPassenger: +markupPerPax.toFixed(2),
    servicePerPassenger: +servicePerPax.toFixed(2),
    passengers,
    markupTotal,
    serviceTotal,
    total,
    currency,
    ancillaryTotal: +ancillaryTotal.toFixed(2),
    ancillaryRows
  };
}

