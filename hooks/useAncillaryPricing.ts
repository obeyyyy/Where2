import { useState, useCallback, useMemo } from 'react';
import { DuffelAncillaryPayload } from '@/types/booking';
import { ANCILLARY_MARKUP } from '@/lib/pricing';

export default function useAncillaryPricing() {
  const [selection, setSelection] = useState<DuffelAncillaryPayload | null>(null);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  
  // Apply markup to ancillary items based on their type
  const applyMarkup = useCallback((item: any) => {
    const type = item.type?.toLowerCase() || '';
    let markup = 0;
    
    // Apply markup based on ancillary type
    if (type.includes('bag')) {
      // Apply bags markup: fixed amount + percentage
      markup = 1 + (item.amount * 0.02); // €1 + 2%
    } else if (type.includes('seat')) {
      // Apply seats markup: fixed amount
      markup = 2; // €2 per seat
    } else if (type.includes('cancel')) {
      // Apply cancellation markup: percentage
      markup = item.amount * 0.25; // 25%
    }
    
    // Return ancillary with markup included
    return {
      ...item,
      originalAmount: item.amount,
      markup: markup,
      amount: item.amount + markup
    };
  }, []);

  const calculateCosts = useCallback(() => {
    if (!selection) return { amount: 0, currency: 'EUR' };
    
    // If we have explicit ancillaryPayment data (our custom field), use that as the source of truth
    if (selection.ancillaryPayment) {
      console.log('Using explicit ancillary payment amount:', selection.ancillaryPayment);
      return { 
        amount: parseFloat(selection.ancillaryPayment.amount), 
        currency: selection.ancillaryPayment.currency 
      };
    }
    
    // If we have payments data from Duffel, use that as the source of truth
    if (selection.payments && selection.payments.length > 0) {
      const payment = selection.payments[0];
      console.log('Using payment amount from Duffel:', payment);
      return { 
        amount: parseFloat(payment.amount), 
        currency: payment.currency 
      };
    }
    
    // Fallback to calculating from services
    if (Array.isArray(selection.services) && selection.services.length > 0) {
      const currency = selection.services[0]?.total_currency || 'EUR';
      const amount = selection.services.reduce(
        (sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 
        0
      );
      console.log('Calculated amount from services:', amount);
      return { amount, currency };
    }
    
    console.log('No valid payment data found in selection');
    return { amount: 0, currency: 'EUR' };
  }, [selection]);

  const priceBreakdown = useMemo(() => {
    if (!selection) return [];
    
    console.log('Generating price breakdown from selection:', selection);
    
    // Handle Duffel component's internal state structure
    if (selection.baggageSelectedServices || selection.seatSelectedServices || selection.cfarSelectedServices) {
      const rows: {label: string; amount: number; currency: string; type: string; details?: string}[] = [];
      
      // Process baggage services
      if (Array.isArray(selection.baggageSelectedServices)) {
        selection.baggageSelectedServices.forEach((bag: any) => {
          console.log('Processing bag service:', bag);
          rows.push({
            label: `Checked Bag`,
            amount: parseFloat(bag.total_amount || '0'),
            currency: bag.total_currency || 'EUR',
            type: 'bags',
            details: bag.maximum_weight_kg ? `${bag.maximum_weight_kg}kg bag` : 'Checked baggage'
          });
        });
      }
      
      // Process seat services
      if (Array.isArray(selection.seatSelectedServices)) {
        selection.seatSelectedServices.forEach((seat: any) => {
          console.log('Processing seat service:', seat);
          rows.push({
            label: `Seat Selection`,
            amount: parseFloat(seat.total_amount || '0'),
            currency: seat.total_currency || 'EUR',
            type: 'seats',
            details: seat.designator ? `Seat ${seat.designator}` : 'Seat selection'
          });
        });
      }
      
      // Process cancellation services
      if (Array.isArray(selection.cfarSelectedServices)) {
    
        selection.cfarSelectedServices.forEach((cfar: any) => {
          console.log('Processing cancellation service:', cfar);
          rows.push({
            label: `Cancellation Protection`,
            amount: parseFloat(cfar.total_amount || '0'),
            currency: cfar.total_currency || 'EUR',
            type: 'cancel_for_any_reason',
            details: 'Trip cancellation protection'
          });
        });
      }
      
      console.log('Generated breakdown rows from Duffel component state:', rows);
      return rows;
    }
    
    // Handle standard services array
    if (Array.isArray(selection.services)) {
      const rows = selection.services.map(s => ({
        label: s.name || s.type,
        amount: parseFloat(s.total_amount || '0'),
        currency: s.total_currency || 'EUR',
        type: s.type || 'ancillary',
        details: s.description || ''
      }));
      console.log('Generated breakdown rows from services array:', rows);
      return rows;
    }
    
    // Handle metadata structure
    if (selection.metadata) {
      const rows: {label: string; amount: number; currency: string; type: string; details?: string}[] = [];
      
      // Helper to add items to breakdown
      const addToBreakdown = (label: string, type: string, item: any, details?: string) => {
        if (!item) return;
        const amount = parseFloat(item.total_amount || item.price?.amount || '0');
        const currency = item.total_currency || item.price?.currency || 'EUR';
        rows.push({ label, amount, currency, type, details });
      };
      
      // Process bags
      Object.values(selection.metadata.bags || {}).forEach((bags: any) => {
        bags.forEach((bag: any) => {
          const details = bag.maximum_weight_kg ? `${bag.maximum_weight_kg}kg bag` : 'Checked baggage';
          addToBreakdown('Baggage', 'bags', bag, details);
        });
      });
      
      // Process seats
      Object.values(selection.metadata.seats || {}).forEach((seats: any) => {
        seats.forEach((seat: any) => {
          const details = seat.designator ? `Seat ${seat.designator}` : 'Seat selection';
          addToBreakdown('Seat Selection', 'seats', seat, details);
        });
      });
      
      // Process cancellation
      const cancelMeta = selection.metadata.cancel_for_any_reason;
      if (cancelMeta) {
        const cancels = Array.isArray(cancelMeta) ? cancelMeta : [cancelMeta];
        cancels.forEach((c: any) => {
          addToBreakdown('Cancellation Protection', 'cancel_for_any_reason', c, 'Trip cancellation protection');
        });
      }
      
      console.log('Generated breakdown rows from metadata:', rows);
      return rows;
    }
    
    console.log('No valid structure found for price breakdown');
    return [];
  }, [selection]);

  const handleSelection = useCallback(async (payload: DuffelAncillaryPayload | null) => {
    // If payload is null, reset the selection state
    if (!payload) {
      setSelection(null);
      setBreakdown([]);
      return;
    }
    
    // Create a stable copy of the payload to avoid unnecessary re-renders
    const stablePayload = JSON.parse(JSON.stringify(payload));
    
    setSelection(stablePayload);
    
    try {
      const res = await fetch('/api/ancillaries/price', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DUFFEL_API}` 
        },
        body: JSON.stringify({
          offerId: stablePayload.selected_offers?.[0],
          services: stablePayload.services,
          markup: ANCILLARY_MARKUP // Default markup
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      
      const priced = await res.json();
      setBreakdown(priced.breakdown);
    } catch (err) {
      console.error('Ancillary pricing error', err);
    }
  }, []); // Empty dependency array since this function shouldn't change

  // Calculate costs with markup applied
  const calculateCostsWithMarkup = useCallback(() => {
    // If no selection, return zero
    if (!selection) {
      return { amount: 0, currency: 'EUR', breakdown: [] };
    }
    
    console.log('Calculating costs with markup for selection:', selection);
    
    // Handle Duffel component's internal state structure
    if (selection.baggageSelectedServices || selection.seatSelectedServices || selection.cfarSelectedServices) {
      let totalAmount = 0;
      let currency = 'EUR';
      const breakdownItems: any[] = [];
      
      // Process baggage services
      if (Array.isArray(selection.baggageSelectedServices)) {
        selection.baggageSelectedServices.forEach((bag: any) => {
          const amount = parseFloat(bag.total_amount || '0');
          const markup = amount * 0.1; // 10% markup for bags
          totalAmount += amount + markup;
          currency = bag.total_currency || currency;
          
          breakdownItems.push({
            id: bag.id,
            title: 'Checked Bag',
            type: 'bags',
            details: bag.maximum_weight_kg ? `${bag.maximum_weight_kg}kg bag` : 'Checked baggage',
            amount: amount + markup,
            originalAmount: amount,
            markup: markup,
            currency: bag.total_currency || currency,
            passenger: bag.passenger_id || null,
            segment: bag.segment_id || null
          });
        });
      }
      
      // Process seat services
      if (Array.isArray(selection.seatSelectedServices)) {
        selection.seatSelectedServices.forEach((seat: any) => {
          const amount = parseFloat(seat.total_amount || '0');
          const markup = 2; // Fixed €2 markup for seats
          totalAmount += amount + markup;
          currency = seat.total_currency || currency;
          
          breakdownItems.push({
            id: seat.id,
            title: 'Seat Selection',
            type: 'seats',
            details: seat.designator ? `Seat ${seat.designator}` : 'Seat selection',
            amount: amount + markup,
            originalAmount: amount,
            markup: markup,
            currency: seat.total_currency || currency,
            passenger: seat.passenger_id || null,
            segment: seat.segment_id || null
          });
        });
      }
      
      // Process cancellation services
      if (Array.isArray(selection.cfarSelectedServices)) {
        selection.cfarSelectedServices.forEach((cfar: any) => {
          const amount = parseFloat(cfar.total_amount || '0');
          const markup = amount * 0.15; // 15% markup for cancellation
          totalAmount += amount + markup;
          currency = cfar.total_currency || currency;
          
          breakdownItems.push({
            id: cfar.id,
            title: 'Cancellation Protection',
            type: 'cancel_for_any_reason',
            details: 'Trip cancellation protection',
            amount: amount + markup,
            originalAmount: amount,
            markup: markup,
            currency: cfar.total_currency || currency
          });
        });
      }
      
      console.log('Calculated breakdown from Duffel component state:', breakdownItems);
      console.log('Total amount with markup:', totalAmount);
      
      // Update the breakdown state
      setBreakdown(breakdownItems);
      
      return {
        amount: totalAmount,
        currency: currency,
        breakdown: breakdownItems,
        ancillaryTotal: totalAmount,
        ancillaryBreakdown: breakdownItems
      };
    }
    
    // Check if we have ancillaryPayment data (our custom field)
    if (selection.ancillaryPayment) {
      const totalAmount = parseFloat(selection.ancillaryPayment.amount);
      const currency = selection.ancillaryPayment.currency || 'EUR';
      
      // If we have services, create a breakdown based on them
      if (selection.services && selection.services.length > 0) {
        // Calculate the proportion of the total amount for each service
        const serviceCount = selection.services.length;
        const amountPerService = totalAmount / serviceCount;
        
        // Create a detailed breakdown with the correct amounts
        let breakdownWithMarkup = selection.services.map(service => {
          // Handle different service object structures
          const label = (service as any).title || service.name || 'Extra Service';
          const type = service.type || 'ancillary';
          const details = service.description || '';
          
          return {
            id: service.id,
            title: label,
            type: type.toLowerCase().includes('bag') ? 'bags' : 
                  type.toLowerCase().includes('seat') ? 'seats' : 
                  type.toLowerCase().includes('cancel') ? 'cancel_for_any_reason' : 'ancillary',
            details: details,
            amount: amountPerService,
            currency: currency,
            selected: true,
            // Safely access optional properties
            passenger: service.passenger_ids?.[0] || null,
            segment: service.segment_ids?.[0] || null
          };
        });
        
        console.log('Ancillary breakdown with correct amounts:', breakdownWithMarkup);
        console.log('Total amount from ancillaryPayment:', totalAmount);
        
        // Update the breakdown state
        setBreakdown(breakdownWithMarkup);
        
        return {
          amount: totalAmount,
          currency: currency,
          breakdown: breakdownWithMarkup,
          ancillaryTotal: totalAmount,
          ancillaryBreakdown: breakdownWithMarkup
        };
      } else {
        // If no services but we have ancillaryPayment, create a single item breakdown
        const breakdown = [{
          id: 'ancillary-total',
          title: 'Extra Services',
          type: 'ancillary',
          amount: totalAmount,
          currency: currency,
          selected: true
        }];
        
        setBreakdown(breakdown);
        
        return {
          amount: totalAmount,
          currency: currency,
          breakdown: breakdown,
          ancillaryTotal: totalAmount,
          ancillaryBreakdown: breakdown
        };
      }
    }
    
    // If we have services but no explicit payment data, calculate from services
    if (Array.isArray(selection.services) && selection.services.length > 0) {
      let totalAmount = 0;
      let currency = 'EUR';
      
      // Map services to breakdown items with markup
      const breakdownWithMarkup = selection.services.map(service => {
        const baseAmount = parseFloat(service.total_amount || '0');
        const serviceType = service.type || 'ancillary';
        let markup = 0;
        
        // Apply markup based on service type
        if (serviceType.toLowerCase().includes('bag')) {
          markup = baseAmount * 0.1; // 10% for bags
        } else if (serviceType.toLowerCase().includes('seat')) {
          markup = 2; // €2 for seats
        } else if (serviceType.toLowerCase().includes('cancel')) {
          markup = baseAmount * 0.15; // 15% for cancellation
        } else {
          markup = baseAmount * 0.05; // 5% default
        }
        
        const finalAmount = baseAmount + markup;
        totalAmount += finalAmount;
        currency = service.total_currency || currency;
        
        return {
          id: service.id,
          title: service.name || serviceType,
          type: serviceType.toLowerCase().includes('bag') ? 'bags' : 
                serviceType.toLowerCase().includes('seat') ? 'seats' : 
                serviceType.toLowerCase().includes('cancel') ? 'cancel_for_any_reason' : 'ancillary',
          details: service.description || '',
          amount: finalAmount,
          originalAmount: baseAmount,
          markup: markup,
          currency: service.total_currency || 'EUR',
          selected: true,
          passenger: service.passenger_ids?.[0] || null,
          segment: service.segment_ids?.[0] || null
        };
      });
      
      setBreakdown(breakdownWithMarkup);
      
      return {
        amount: totalAmount,
        currency: currency,
        breakdown: breakdownWithMarkup,
        ancillaryTotal: totalAmount,
        ancillaryBreakdown: breakdownWithMarkup
      };
    }
    
    // Fallback: no valid data found
    return { 
      amount: 0, 
      currency: 'EUR', 
      breakdown: [],
      ancillaryTotal: 0,
      ancillaryBreakdown: []
    };
  }, [selection]);
  
  return {
    selection,
    breakdown,
    setBreakdown,
    calculateCosts,
    calculateCostsWithMarkup,
    priceBreakdown,
    handleSelection,
    applyMarkup
  };
}
