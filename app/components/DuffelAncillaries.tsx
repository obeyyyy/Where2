import { useEffect, useState, useCallback } from 'react';
import { DuffelAncillaries } from '@duffel/components';
import { ANCILLARY_MARKUP } from '@/lib/pricing';

// The passenger structure expected by Duffel
export type DuffelPassenger = {
  id: string;
  given_name: string;
  family_name: string;
  born_on: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'X';
  title?: string;
  email?: string;
  phone_number?: string;
};

interface Props {
  offerId: string;
  passengers: any[];
  flightPrice: string;
  onPayloadReady: (payload: any) => void;
  debug?: boolean;
  /** Services to display; default ['bags'] to avoid seat-map 403 if not enabled */
  services?: Array<'bags' | 'seats' | 'cancel_for_any_reason'>;
}

/**
 * Wrapper around @duffel/components <DuffelAncillaries /> that:
 *  1. Retrieves the client_key, offer object and seat_maps from our Next.js API route
 *  2. Maps our internal passenger schema to Duffel's expected shape
 *  3. Shows simple loading / error states while data is being fetched
 */
export default function DuffelAncillariesContainer({
  offerId,
  passengers,
  flightPrice,
  onPayloadReady,
  debug = false,
  services = ['bags'],
}: Props) {
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  // Removed validity change notification to prevent infinite loops

  useEffect(() => {
    const fetchAncillaryData = async () => {
      try {
        const res = await fetch(`/api/ancillaries/client-key?offerId=${offerId}`);
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error || 'Failed to fetch data');
        }
        const json = await res.json();
        setClientKey(json.client_key);
      } catch (err) {
        console.error('[DuffelAncillaries] Error fetching data:', err);
        setError('Unable to load extra options. Please try again later.');
      }
    };

    if (offerId) {
      fetchAncillaryData();
    }
  }, [offerId]);

  // Convert local passenger structure to Duffel-compatible passengers
  const mapPassengers = (): DuffelPassenger[] => {
    return passengers.map((p: any, idx: number) => ({
      id: p.id || `pas_${idx}`,
      given_name: p.firstName || p.given_name || '',
      family_name: p.lastName || p.family_name || '',
      born_on: (p.dateOfBirth || p.born_on || '').split('T')[0],
      gender: (p.gender || 'X').toUpperCase(),
      title: p.title,
      email: p.email || '',
      phone_number: p.phone || p.phone_number,
    }));
  };

  // Use useCallback to memoize the handlePayloadReady function to prevent infinite re-renders
  const handlePayloadReady = useCallback(async (payload: any) => {
    console.log('Ancillary payload received:', payload);
    try {
      // Extract base price from the flight
      const basePrice = parseFloat(flightPrice || '0');
      
      // Calculate the actual ancillary amount by subtracting base price
      // This is critical because Duffel payments include the total (flight + ancillaries)
      let ancillaryAmount = 0;
      let ancillaryCurrency = 'EUR';
      
      if (payload.payments && payload.payments.length > 0) {
        const totalWithAncillaries = parseFloat(payload.payments[0].amount);
        ancillaryAmount = totalWithAncillaries - basePrice;
        ancillaryCurrency = payload.payments[0].currency;
        
        // Ensure we don't have negative ancillary amount due to calculation errors
        if (ancillaryAmount < 0) ancillaryAmount = 0;
        
        console.log(`Calculated ancillary amount: ${ancillaryAmount} (total: ${totalWithAncillaries}, base: ${basePrice})`);
        
        // Create a separate payment entry for just the ancillary portion
        payload.ancillaryPayment = {
          amount: ancillaryAmount.toString(),
          currency: ancillaryCurrency
        };
      }
      
      // Convert to proper DuffelAncillaryPayload format with explicit ancillary amount
      const formattedPayload: any = {
        services: payload.services || [],
        payments: payload.payments || [],
        ancillaryPayment: payload.ancillaryPayment,
        metadata: payload.metadata,
        selected_offers: [offerId]
      };
      
      console.log('Sending formatted payload with ancillary payment:', formattedPayload);
      await onPayloadReady(formattedPayload);
      setIsValid(true);
    } catch (err) {
      console.error('Error handling ancillary payload:', err);
      setError('Failed to process selections. Please try again.');
      setIsValid(false);
    }
  }, [flightPrice, offerId, onPayloadReady]); // Add dependencies to prevent stale closures

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4">
        {error}
      </div>
    );
  }

  if (!clientKey) {
    return (
      <div className="flex items-center gap-2 text-gray-600 py-4">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        </svg>
        Loading extra options...
      </div>
    );
  }

  return (
    <DuffelAncillaries
      debug={debug}
      offer_id={offerId}
      client_key={clientKey}
      services={services}
      markup={ANCILLARY_MARKUP}
      passengers={mapPassengers() as any}
      onPayloadReady={handlePayloadReady}
    />
  );
}
