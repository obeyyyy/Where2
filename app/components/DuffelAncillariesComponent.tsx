'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DuffelAncillaries } from '@duffel/components';
import { AncillaryState, AncillaryRow } from '@/types/Ancillary';
import { ANCILLARY_MARKUP } from '@/lib/pricing';

interface DuffelAncillariesComponentProps {
  offerId: string;
  passengers: any[];
  onAncillariesSelected: (ancillaryState: AncillaryState) => void;
}

const DuffelAncillariesComponent: React.FC<DuffelAncillariesComponentProps> = ({
  offerId,
  passengers,
  onAncillariesSelected,
}) => {
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch client key from the API
  useEffect(() => {
    const fetchClientKey = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/ancillaries/client-key?offerId=${offerId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch client key: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.client_key) {
          throw new Error('Client key not found in response');
        }
        
        setClientKey(data.client_key);
        setError(null);
      } catch (err) {
        console.error('Error fetching client key:', err);
        setError(err instanceof Error ? err.message : 'Unknown error fetching client key');
      } finally {
        setLoading(false);
      }
    };

    if (offerId) {
      fetchClientKey();
    }
  }, [offerId]);

  // Handle ancillary selection
  const handlePayloadReady = (data: any, metadata: any) => {
    console.log('🔍 DEBUG - Ancillaries selected. Order payload:', data);
    console.log('🔍 DEBUG - Ancillaries selected. Metadata:', metadata);
    console.log('🔍 DEBUG - Payload services:', data?.services);
    
    // IMPORTANT: Log the actual services array to see what's available
    if (data?.services) {
      data.services.forEach((service: any, index: number) => {
        console.log(`🔍 DEBUG - Service ${index}:`, {
          id: service.id,
          amount: service.amount,
          currency: service.currency,
          segment_ids: service.segment_ids,
          passenger_ids: service.passenger_ids
        });
      });
    }

    // Process selected ancillaries
    const selectedAncillaries: AncillaryRow[] = [];
    let totalAmount = 0;
    let currency = metadata?.offer_total_currency || 'EUR'; // Get currency from metadata
    
    // Map of service IDs to their metadata for quick lookup
    const serviceIdMap = new Map();
    
    // Create a map of service IDs from the payload for validation
    if (data?.services && Array.isArray(data.services)) {
      data.services.forEach((service: any) => {
        if (service && service.id) {
          serviceIdMap.set(service.id, true);
        }
      });
    }
    
    console.log('🔍 DEBUG - Found', serviceIdMap.size, 'selected services in payload')
    
    // Process baggage services - following Duffel's guide for adding extra bags
    if (metadata?.baggage_services && metadata.baggage_services.length > 0) {
      console.log('🔍 DEBUG - Processing baggage services:', metadata.baggage_services.length);
      
      // First, find all baggage services that are actually selected in the payload
      const selectedBaggageServices = data?.services?.filter((service: any) => 
        service && service.type === 'baggage') || [];
      
      console.log('🔍 DEBUG - Selected baggage services in payload:', selectedBaggageServices.length);
      
      // Create a map of selected service IDs for quick lookup
      const selectedServiceIds = new Map();
      selectedBaggageServices.forEach((service: any) => {
        if (service && service.id) {
          selectedServiceIds.set(service.id, service);
        }
      });
      
      // Process each baggage service from metadata
      metadata.baggage_services.forEach((service: any) => {
        if (service) {
          // Get service ID
          const serviceId = service.id;
          
          // Only process services that are actually selected in the payload
          if (serviceId && (selectedServiceIds.has(serviceId) || selectedServiceIds.size === 0)) {
            // Get the selected service from the payload if available
            const selectedService = selectedServiceIds.get(serviceId);
            
            // Extract price directly from the metadata
            let amount = 0;
            let serviceCurrency = currency;
            
            // Try to get price in this priority order:
            // 1. From the selected service in payload
            // 2. From the metadata total_amount
            // 3. From serviceInformation
            if (selectedService && selectedService.amount && !isNaN(parseFloat(selectedService.amount))) {
              amount = parseFloat(selectedService.amount);
              serviceCurrency = selectedService.currency || currency;
              console.log('🔍 DEBUG - Extracted baggage price from payload service:', amount, serviceCurrency);
            } else if (service.total_amount && !isNaN(parseFloat(service.total_amount))) {
              amount = parseFloat(service.total_amount);
              serviceCurrency = service.total_currency || currency;
              console.log('🔍 DEBUG - Extracted baggage price from metadata.total_amount:', amount, serviceCurrency);
            } else if (service.serviceInformation?.total_amount && !isNaN(parseFloat(service.serviceInformation.total_amount))) {
              // Try to get from serviceInformation if available
              amount = parseFloat(service.serviceInformation.total_amount);
              serviceCurrency = service.serviceInformation.total_currency || currency;
              console.log('🔍 DEBUG - Extracted baggage price from serviceInformation:', amount, serviceCurrency);
            } else {
              // If no price found, log a warning
              console.warn('⚠️ Baggage service amount missing or invalid:', serviceId);
              
              // Use a default price as fallback
              amount = 25; // Default baggage price
              console.log('🔍 DEBUG - Using default baggage price:', amount);
            }
          
            // Add to total
            totalAmount += amount;
          
            console.log('🔍 DEBUG - Adding baggage service:', {
              id: serviceId,
              type: service.type || 'baggage',
              amount,
              currency: serviceCurrency,
              passengerName: service.passengerName || service.serviceInformation?.passengerName || null,
              segmentIds: service.segmentIds || service.serviceInformation?.segmentIds || []
            });
            
            // Create ancillary row with all required properties
            selectedAncillaries.push({
              id: serviceId,
              title: `${service.type || 'Baggage'} (${service.maximum_weight_kg || service.serviceInformation?.maximum_weight_kg || '20'}kg)`,
              details: `${service.quantity || 1}x ${service.type || 'checked'} baggage`,
              amount,
              currency: serviceCurrency,
              passengerId: service.passengerIds?.[0] || '',
              passengerName: service.passengerName || service.serviceInformation?.passengerName || null,
              segmentIds: service.segmentIds || service.serviceInformation?.segmentIds || [],
              segmentInfo: ''
            });
          }
        }
      });
    }
    
    // Process seat services - following Duffel's guide for adding seats
    if (metadata?.seat_services && metadata.seat_services.length > 0) {
      console.log('🔍 DEBUG - Processing seat services:', metadata.seat_services.length);
      
      // First, find all seat services that are actually selected in the payload
      const selectedSeatServices = data?.services?.filter((service: any) => 
        service && service.type === 'seat') || [];
      
      console.log('🔍 DEBUG - Selected seat services in payload:', selectedSeatServices.length);
      
      // Create a map of selected service IDs for quick lookup
      const selectedSeatServiceIds = new Map();
      selectedSeatServices.forEach((service: any) => {
        if (service && service.id) {
          selectedSeatServiceIds.set(service.id, service);
        }
      });
      
      // Process each seat service from metadata
      metadata.seat_services.forEach((service: any) => {
        if (service) {
          // Get service ID
          const serviceId = service.id;
          
          // Only process services that are actually selected in the payload
          if (serviceId && (selectedSeatServiceIds.has(serviceId) || selectedSeatServiceIds.size === 0)) {
            // Get the selected service from the payload if available
            const selectedService = selectedSeatServiceIds.get(serviceId);
            
            // Extract price directly from the metadata
            let amount = 0;
            let serviceCurrency = currency;
            
            // Try to get price in this priority order:
            // 1. From the selected service in payload
            // 2. From the metadata total_amount
            // 3. From serviceInformation
            if (selectedService && selectedService.amount && !isNaN(parseFloat(selectedService.amount))) {
              amount = parseFloat(selectedService.amount);
              serviceCurrency = selectedService.currency || currency;
              console.log('🔍 DEBUG - Extracted seat price from payload service:', amount, serviceCurrency);
            } else if (service.total_amount && !isNaN(parseFloat(service.total_amount))) {
              amount = parseFloat(service.total_amount);
              serviceCurrency = service.total_currency || currency;
              console.log('🔍 DEBUG - Extracted seat price from metadata.total_amount:', amount, serviceCurrency);
            } else if (service.serviceInformation?.total_amount && !isNaN(parseFloat(service.serviceInformation.total_amount))) {
              // Try to get from serviceInformation if available
              amount = parseFloat(service.serviceInformation.total_amount);
              serviceCurrency = service.serviceInformation.total_currency || currency;
              console.log('🔍 DEBUG - Extracted seat price from serviceInformation:', amount, serviceCurrency);
            } else {
              // If no price found, log a warning
              console.warn('⚠️ Seat service amount missing or invalid:', serviceId);
              
              // Use a default price as fallback
              amount = 15; // Default seat price
              console.log('🔍 DEBUG - Using default seat price:', amount);
            }
            
            // Add to total
            totalAmount += amount;
            
            console.log('🔍 DEBUG - Adding seat service:', {
              id: serviceId,
              type: service.type || 'seat',
              amount,
              currency: serviceCurrency,
              designator: service.designator,
              cabin_class: service.cabin_class,
              passengerIds: service.passenger_ids || service.passengerIds,
              segmentIds: service.segment_ids || service.segmentIds
            });
            
            // Create ancillary row with all required properties
            selectedAncillaries.push({
              id: serviceId,
              title: `Seat ${service.designator || ''} (${service.cabin_class || 'Economy'})`,
              details: `Seat selection - ${service.cabin_class || 'Economy'} class`,
              amount,
              currency: serviceCurrency,
              passengerId: service.passenger_ids?.[0] || service.passengerIds?.[0] || '',
              passengerName: service.passengerName || getPassengerName(service.passenger_ids?.[0] || service.passengerIds?.[0]),
              segmentIds: service.segment_ids || service.segmentIds || [],
              segmentInfo: ''
            });
          }
        }
      });
    }
    
    // Process cancel for any reason services
    if (metadata?.cancel_for_any_reason_services && metadata.cancel_for_any_reason_services.length > 0) {
      console.log('🔍 DEBUG - Processing CFAR services:', metadata.cancel_for_any_reason_services.length);
      
      metadata.cancel_for_any_reason_services.forEach((service: any) => {
        if (service) {
          // Get service ID
          const serviceId = service.id || `cfar_${selectedAncillaries.length}`;
          
          // Only process services that are actually selected in the payload
          if (serviceId && (serviceIdMap.has(serviceId) || !data?.services)) {
            // Extract price directly from the metadata
            let amount = 0;
            let serviceCurrency = currency;
            
            // The price is in the total_amount field of the CFAR service or in serviceInformation
            if (service.total_amount && !isNaN(parseFloat(service.total_amount))) {
              amount = parseFloat(service.total_amount);
              serviceCurrency = service.total_currency || currency;
              console.log('🔍 DEBUG - Extracted CFAR price from metadata.total_amount:', amount, serviceCurrency);
            } else if (service.serviceInformation?.total_amount && !isNaN(parseFloat(service.serviceInformation.total_amount))) {
              // Try to get from serviceInformation if available
              amount = parseFloat(service.serviceInformation.total_amount);
              serviceCurrency = service.serviceInformation.total_currency || currency;
              console.log('🔍 DEBUG - Extracted CFAR price from serviceInformation:', amount, serviceCurrency);
            } else {
              // If no price found, log a warning
              console.warn('⚠️ CFAR service amount missing or invalid:', serviceId);
              
              // Use a default price as fallback
              amount = 30; // Default CFAR price
              console.log('🔍 DEBUG - Using default CFAR price:', amount);
            }
            
            // Add to total
            totalAmount += amount;
            
            console.log('🔍 DEBUG - Adding CFAR service:', {
              id: serviceId,
              type: 'cancel_for_any_reason',
              amount,
              currency: serviceCurrency
            });
            
            // Create ancillary row with all required properties
            selectedAncillaries.push({
              id: serviceId,
              title: 'Cancel for any reason protection',
              details: 'Trip cancellation insurance',
              amount,
              currency: serviceCurrency,
              passengerId: service.passengerIds?.[0] || '',
              passengerName: service.passengerName || getPassengerName(service.passengerIds?.[0]),
              segmentIds: service.segmentIds || [],
              segmentInfo: ''
            });
          }
        }
      });
    }

    // Create ancillary state
    const ancillaryState: AncillaryState = {
      rows: selectedAncillaries,
      total: totalAmount,
      currency: currency
    };

    console.log('🔍 DEBUG - Final ancillary state:', ancillaryState);
    console.log('🔍 DEBUG - Selected ancillaries count:', selectedAncillaries.length);
    console.log('🔍 DEBUG - Total amount:', totalAmount);

    // Pass selected ancillaries to parent component
    onAncillariesSelected(ancillaryState);
    console.log('🔍 DEBUG - Called onAncillariesSelected with state');
  };

  // Helper function to get passenger name from ID
  const getPassengerName = (passengerId: string): string => {
    if (!passengerId || !passengers) return '';
    
    const passenger = passengers.find(p => p.id === passengerId);
    if (!passenger) return '';
    
    return `${passenger.title || ''} ${passenger.firstName || passenger.given_name || ''} ${passenger.lastName || passenger.family_name || ''}`.trim();
  };

  // Use ANCILLARY_MARKUP from pricing.ts instead of defining markup locally

  // Log passengers before rendering to debug the issue
  useEffect(() => {
    console.log('🔍 DEBUG - DuffelAncillariesComponent received passengers:', passengers);
    console.log('🔍 DEBUG - Passenger count:', passengers.length);
  }, [passengers]);

  // Ensure we only pass unique passengers to the Duffel component
  // This prevents the component from seeing duplicate passengers
  const uniquePassengers = useMemo(() => {
    const passengerMap = new Map();
    
    // Use a map to deduplicate passengers by ID
    passengers.forEach(passenger => {
      if (!passengerMap.has(passenger.id)) {
        passengerMap.set(passenger.id, passenger);
      }
    });
    
    const uniqueArray = Array.from(passengerMap.values());
    console.log('🔍 DEBUG - Unique passengers:', uniqueArray);
    console.log('🔍 DEBUG - Unique passenger count:', uniqueArray.length);
    
    return uniqueArray;
  }, [passengers]);

  if (loading) {
    return <div className="p-4 text-center">Loading ancillaries...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!clientKey) {
    return <div className="p-4 text-center">Unable to load ancillaries component</div>;
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Additional Services</h2>
      <div className="p-2 bg-blue-50 rounded mb-4">
        <p className="text-sm text-blue-700">Debug: {uniquePassengers.length} unique passenger(s)</p>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <DuffelAncillaries
          debug={true}
          offer_id={offerId}
          client_key={clientKey}
          services={['bags', 'seats', 'cancel_for_any_reason']}
          passengers={uniquePassengers}
          markup={ANCILLARY_MARKUP}
          onPayloadReady={handlePayloadReady}
        />
      </div>
    </div>
  );
};

export default DuffelAncillariesComponent;
