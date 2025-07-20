"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
// Import the airports data
const airports = require('airports-json').airports;
// Import world countries data with dynamic import
const countriesData = require('world-countries/countries.json');

// Import components
import { FlightItineraryCard } from "@/app/components/FlightItineraryCard";
import { computePricing, PricingBreakdown } from "@/lib/pricing";
import PassengerForm, { PassengerInfo } from "@/app/components/PassengerForm";
import DuffelAncillariesComponent from "@/app/components/DuffelAncillariesComponent";
import { AncillaryState } from "@/types/Ancillary";


// Extend the PassengerInfo interface with additional properties
interface BookingPassengerInfo extends PassengerInfo {
  // Personal Information
  id?: string; // Added for Duffel ancillaries component
  type: 'adult' | 'child' | 'infant_without_seat' | 'infant_with_seat';
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'm' | 'f' | 'x' | '';
  email: string;
  phone: string;
  
  // Identity Document
  documentType: 'passport' | 'passport_card' | 'national_identity_card' | 'driving_licence' | 'other';
  documentNumber: string;
  documentIssuingCountryCode: string;
  documentExpiryDate: string;
  documentNationality: string;
  
  // Contact Information
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    countryCode: string;
    postalCode: string;
    region?: string;
  };
  
  // Loyalty Program
  frequentFlyerNumber?: string;
  frequentFlyerProgram?: string;
  
  // Special Requirements
  specialAssistance?: boolean;
  mealPreferences?: string[];
  
  // Additional Information
  middleName?: string;
  titleAfterName?: string;
  titleBeforeName?: string;
  infantPassportNumber?: string;
  // Add any additional properties needed for booking
  passportNumber?: string; // For backward compatibility
  nationality?: string;    // For backward compatibility
  passportExpiry?: string; // For backward compatibility
}

interface BookingData {
  trip: any;
  searchParams: {
    tripType: string;
    departureDate: string;
    returnDate?: string;
    travelers: number;
    from: string;
    to: string;
  };
  budget: string;
}

// Reusable blank passenger template
const defaultPassenger: BookingPassengerInfo = {
  type: 'adult',
  title: 'mr',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'm',
  email: '',
  phone: '',
  documentType: 'passport',
  documentNumber: '',
  documentIssuingCountryCode: '',
  documentExpiryDate: '',
  documentNationality: '',
  address: {
    addressLine1: '',
    city: '',
    countryCode: '',
    postalCode: ''
  },
  specialAssistance: false,
  mealPreferences: []
};

const BookingPage: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<number>(0);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [flightLoading, setFlightLoading] = useState<boolean>(true);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [passengerData, setPassengerData] = useState<BookingPassengerInfo[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [ancillaryState, setAncillaryState] = useState<AncillaryState>({ rows: [], total: 0, currency: 'EUR' });
  const [showAncillaries, setShowAncillaries] = useState<boolean>(false);

  // Memoize price calculations
  const priceInfo = useMemo(() => {
    if (!bookingData?.trip) return {
      base: 0,
      markupPerPassenger: 0,
      servicePerPassenger: 0,
      passengers: 0,
      markupTotal: 0,
      serviceTotal: 0,
      total: 0,
      currency: 'EUR',
      ancillaryTotal: 0,
      ancillaryRows: [],
    };

    const basePerPassenger = parseFloat(bookingData.trip.price.total.toString());
    const result = computePricing({
      baseAmount: basePerPassenger,
      passengers: passengerData.length || 1,
      currency: bookingData.trip.price.currency || bookingData.trip.price.breakdown?.currency || 'EUR',
      ancillaryTotal: ancillaryState.total,
    });
    
    // Add ancillary rows to price info
    result.ancillaryRows = ancillaryState.rows;
    
    console.log('🔍 DEBUG - Price calculation with ancillaries:', {
      baseAmount: basePerPassenger,
      passengers: passengerData.length || 1,
      ancillaryTotal: ancillaryState.total,
      result
    });
    
    return result;
  }, [bookingData?.trip, passengerData.length, ancillaryState]);  // Track the entire ancillaryState object // Recalculate when ancillaries change

  // Get list of all countries from world-countries package
  const countries = useMemo(() => {
    try {
      return countriesData
        .map((country: any) => ({
          code: country.cca2,
          name: country.name.common
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error loading countries:', error);
      return [
        { code: 'US', name: 'United States' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'FR', name: 'France' },
        { code: 'DE', name: 'Germany' },
        { code: 'JP', name: 'Japan' },
      ];
    }
  }, [countriesData]);

  // Load saved booking data from storage, checking both sessionStorage and localStorage
  const loadSavedBookingData = () => {
    try {
      // First check sessionStorage (newer data)
      const savedSessionData = sessionStorage.getItem('current_booking_data');
      if (savedSessionData) {
        const parsedSessionData = JSON.parse(savedSessionData);
        // Only load if the data is less than 1 hour old
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        if (new Date(parsedSessionData.timestamp) > oneHourAgo) {
          return parsedSessionData;
        }
      }
      
      // If no valid session data, check localStorage (legacy)
      const savedLocalData = localStorage.getItem('current_booking_offer');
      if (savedLocalData) {
        const parsedLocalData = JSON.parse(savedLocalData);
        // Convert to the format expected by the booking page
        return {
          trip: parsedLocalData.trip,
          searchParams: parsedLocalData.searchParams,
          passengers: [],
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
    }
    return null;
  };

  // Listen for storage events to handle updates from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === 'current_booking_data' || e.key === 'current_booking_offer') && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          
          // Force a complete reload of the booking data
          const savedData = loadSavedBookingData();
          if (savedData) {
            const travelerCount = Number(savedData.searchParams?.travelers) || 1;
            let passengers: BookingPassengerInfo[] = [];
            if (savedData.passengers && savedData.passengers.length > 0) {
              // Copy existing passengers up to travelerCount
              passengers = savedData.passengers.slice(0, travelerCount).map((p: Partial<BookingPassengerInfo>) => ({
                ...defaultPassenger,
                ...p
              }));
            }
            // Add additional default passengers if needed
            while (passengers.length < travelerCount) {
              passengers.push({ ...defaultPassenger });
            }
            setPassengerData(passengers);
            
            setBookingData({
              trip: savedData.trip || {},
              searchParams: savedData.searchParams || {},
              budget: savedData.searchParams?.budget || 0
            });
            
            // Force a re-render of any components that depend on bookingData
            setFlightLoading(false);
          }
        } catch (error) {
          console.error('Error handling storage update:', error);
        }
      }
    };

    // Also check for changes periodically (in case the storage event doesn't fire)
    const interval = setInterval(() => {
      const savedData = loadSavedBookingData();
      if (savedData && bookingData && savedData.trip?.id !== bookingData.trip?.id) {
        setBookingData(prev => ({
          ...prev!,
          trip: savedData.trip,
          searchParams: savedData.searchParams || {}
        }));
      }
    }, 1000);

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [bookingData]);  // Add bookingData to dependency array

  // Initialize booking data and passenger info
  useEffect(() => {
    const initializeBooking = async () => {
      try {
        setFlightLoading(true);
        
        // First, check for data in URL parameters
        const params = new URLSearchParams(window.location.search);
        const bookingDataParam = params.get('bookingData');
        
        let savedData;
        
        if (bookingDataParam) {
          // Use data from URL parameters if available
          savedData = JSON.parse(decodeURIComponent(bookingDataParam));
          // Also save to session storage for persistence
          sessionStorage.setItem('current_booking_data', JSON.stringify(savedData));
        } else {
          // Fall back to saved data if no URL parameter
          savedData = loadSavedBookingData();
        }
        
        if (savedData) {
          // Define default passenger data with proper types
          const defaultPassenger: BookingPassengerInfo = {
            type: 'adult',
            title: 'mr',
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            gender: 'm', // Default to 'm' to satisfy type
            email: '',
            phone: '',
            documentType: 'passport',
            documentNumber: '',
            documentIssuingCountryCode: '',
            documentExpiryDate: '',
            documentNationality: '',
            address: {
              addressLine1: '',
              city: '',
              countryCode: '',
              postalCode: ''
            },
            specialAssistance: false,
            mealPreferences: []
          };
          
          // Set booking data with proper defaults
          const bookingData = {
            trip: savedData.trip || {},
            searchParams: {
              from: savedData.searchParams?.from || '',
              to: savedData.searchParams?.to || '',
              departureDate: savedData.searchParams?.departureDate || '',
              returnDate: savedData.searchParams?.returnDate || '',
              travelers: savedData.searchParams?.travelers || 1,
              tripType: (savedData.searchParams?.tripType as 'oneway' | 'roundtrip') || 'oneway',
              budget: savedData.searchParams?.budget || 0,
              currency: savedData.searchParams?.currency || 'USD'
            },
            budget: savedData.searchParams?.budget || 0
          };
          
          setBookingData(bookingData);
          
          // Build passenger array matching traveler count
          const travelerCount = Number(savedData.searchParams?.travelers) || 1;
          console.log('🔍 DEBUG - Creating passenger forms for', travelerCount, 'travelers');
          
          // Always create the exact number of passengers based on traveler count
          let passengers: BookingPassengerInfo[] = [];
          
          // If we have existing passenger data, use it up to the traveler count
          if (savedData.passengers && savedData.passengers.length > 0) {
            passengers = savedData.passengers.slice(0, travelerCount).map((p: any, index: number) => ({
              ...defaultPassenger,
              ...p,
              // Ensure each passenger has a unique, stable ID
              id: p.id || `passenger_${index + 1}`
            }));
          }
          
          // Add additional default passengers if needed to match traveler count
          while (passengers.length < travelerCount) {
            const index = passengers.length;
            passengers.push({ 
              ...defaultPassenger,
              id: `passenger_${index + 1}` // Ensure each passenger has a unique, stable ID
            });
          }
          
          console.log('🔍 DEBUG - Created', passengers.length, 'passenger forms');
          console.log('🔍 DEBUG - Passenger IDs:', passengers.map(p => p.id));
          setPassengerData(passengers);
          
          // Save the initialized data
          saveBookingData();
        } else {
          setFlightError('No booking data found. Please start a new search.');
        }
      } catch (error) {
        console.error('Error initializing booking data:', error);
        setFlightError('Failed to load booking data. Please try again.');
      } finally {
        setFlightLoading(false);
      }
    };

    initializeBooking();
  }, []);

  // Monitor ancillary state changes and force UI updates
  useEffect(() => {
    console.log('🔍 DEBUG - Ancillary state changed:', {
      rowCount: ancillaryState.rows.length,
      total: ancillaryState.total,
      currency: ancillaryState.currency
    });
    
    // Force a re-render by setting a temporary state
    if (ancillaryState.rows.length > 0) {
      setShowAncillaries(true);
      
      // Force re-render of the booking summary
      const forceUpdate = setTimeout(() => {
        console.log('🔍 DEBUG - Forcing booking summary update');
        // This will trigger a re-render without changing any actual state
        setAncillaryState(prevState => ({
          ...prevState,
          rows: [...prevState.rows]
        }));
      }, 50);
      
      return () => clearTimeout(forceUpdate);
    }
  }, [ancillaryState.rows.length, ancillaryState.total]);

  // Validate passenger data before submission
  const validatePassengerData = (passengers: BookingPassengerInfo[]): string | null => {
    if (passengers.length === 0) {
      return 'Please add at least one passenger.';
    }
    
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.firstName || !p.lastName) {
        return `Please enter first and last name for passenger ${i + 1}.`;
      }
      if (!p.dateOfBirth) {
        return `Please enter date of birth for passenger ${i + 1}.`;
      }
      if (!p.email) {
        return `Please enter email for passenger ${i + 1}.`;
      }
      if (!p.phone) {
        return `Please enter phone number for passenger ${i + 1}.`;
      }
    }
    
    return null; // No validation errors
  };

  // Handle passenger info changes
  const handlePassengerChange = (index: number, field: keyof BookingPassengerInfo, value: any) => {
    setPassengerData(prevPassengers => {
      const updatedPassengers = [...prevPassengers];
      
      // Handle nested address updates
      if (field === 'address' && typeof value === 'object') {
        updatedPassengers[index] = {
          ...updatedPassengers[index],
          address: {
            ...(updatedPassengers[index].address || {}),
            ...value
          }
        };
      } else {
        // Update the current passenger's field
        updatedPassengers[index] = {
          ...updatedPassengers[index],
          [field]: value
        };
        
        // If this is the main passenger (index 0) and the field is email or phone,
        // propagate the value to all other passengers
        if (index === 0 && (field === 'email' || field === 'phone')) {
          // Update all other passengers with the same contact information
          for (let i = 1; i < updatedPassengers.length; i++) {
            updatedPassengers[i] = {
              ...updatedPassengers[i],
              [field]: value
            };
          }
        }
        
        // For backward compatibility, map old field names to new ones
        const fieldMap: Record<string, keyof BookingPassengerInfo> = {
          passportNumber: 'documentNumber',
          nationality: 'documentNationality',
          passportExpiry: 'documentExpiryDate'
        };
        
        const mappedField = fieldMap[field as string] || field;
        
        updatedPassengers[index] = {
          ...updatedPassengers[index],
          [mappedField]: value
        };
      }
      
      return updatedPassengers;
    });
  };

  // Handle booking submission
  // Save booking data to both sessionStorage and localStorage with marked-up price
  // This is the single source of truth for all price calculations
  const saveBookingData = () => {
    if (!bookingData) return;
    
    // Use the exact price from the trip data without recalculating
    // This ensures we maintain the exact decimal values from the trip summary
    let outboundPrice = 0;
    let returnPrice = 0;
    let totalFlightPrice = 0;
    
    const isRoundTrip = bookingData.searchParams?.tripType === 'roundtrip';
    
    if (bookingData.trip?.price) {
      // Use the exact price from the trip data
      if (bookingData.trip.price.breakdown) {
        // If we have a breakdown, use those exact values
        outboundPrice = parseFloat(bookingData.trip.price.breakdown.outbound || '0');
        returnPrice = isRoundTrip ? parseFloat(bookingData.trip.price.breakdown.return || '0') : 0;
        totalFlightPrice = outboundPrice + returnPrice;
      } else {
        // If no breakdown, use the total price directly
        totalFlightPrice = parseFloat(bookingData.trip.price.total || '0');
        outboundPrice = isRoundTrip ? totalFlightPrice * 0.6 : totalFlightPrice;
        returnPrice = isRoundTrip ? totalFlightPrice * 0.4 : 0;
      }
    }
    
    // Calculate hotel price if available, using the exact amount
    const hotelPrice = bookingData.trip.hotels?.[0]?.price?.amount 
      ? parseFloat(bookingData.trip.hotels[0].price.amount) 
      : 0;
    
    // Use the exact base price from the trip data if available, otherwise calculate it
    const basePrice = bookingData.trip.price?.breakdown?.basePrice 
      ? parseFloat(bookingData.trip.price.breakdown.basePrice)
      : totalFlightPrice + hotelPrice;
    const passengerCount = passengerData.length;
    
    // Calculate fees based on number of passengers
    const markupPerPassenger = 1.00; // Fixed €1.00 markup per passenger
    const serviceFeePerPassenger = passengerCount <= 2 ? 2.00 : 1.00; // €2 for 1-2 passengers, €1 for 3+ passengers
    const totalFeesPerPassenger = markupPerPassenger + serviceFeePerPassenger;
    const totalMarkup = totalFeesPerPassenger * passengerCount;
    const totalPrice = basePrice + totalMarkup;

    // Create updated booking data with the correct price information
    // Format numbers to preserve exactly 2 decimal places without rounding
    const formatPrice = (value: number): string => {
      // Convert to string and ensure exactly 2 decimal places
      const str = value.toString();
      const parts = str.split('.');
      if (parts.length === 1) {
        return `${parts[0]}.00`;
      }
      if (parts[1].length === 1) {
        return `${parts[0]}.${parts[1]}0`;
      }
      return str;
    };

    const updatedBookingData = {
      ...bookingData,
      trip: {
        ...bookingData.trip,
        // Ensure we preserve the Duffel offer ID
        id: bookingData.trip.id,
        price: {
          ...bookingData.trip.price,
          // Use the original total price if available, otherwise use the calculated one
          total: bookingData.trip.price?.total || formatPrice(totalPrice),
          breakdown: {
            ...(bookingData.trip.price.breakdown || {}),
            // Preserve original values if they exist, otherwise use calculated ones
            outbound: bookingData.trip.price.breakdown?.outbound || formatPrice(outboundPrice),
            return: isRoundTrip 
              ? (bookingData.trip.price.breakdown?.return || formatPrice(returnPrice))
              : '0.00',
            basePrice: bookingData.trip.price.breakdown?.basePrice || formatPrice(basePrice),
            markup: markupPerPassenger,
            serviceFee: serviceFeePerPassenger,
            totalPassengers: passengerCount,
            totalFees: formatPrice(totalMarkup),
            currency: bookingData.trip.price.currency || 'USD',
            hotel: hotelPrice > 0 
              ? (bookingData.trip.price.breakdown?.hotel || formatPrice(hotelPrice))
              : '0.00'
          }
        }
      },
      passengers: passengerData,
      timestamp: new Date().toISOString()
    };

    // Save to session storage
    sessionStorage.setItem('current_booking_data', JSON.stringify(updatedBookingData));
    
    // Also update local storage for backward compatibility
    localStorage.setItem('current_booking_offer', JSON.stringify({
      trip: updatedBookingData.trip,
      searchParams: bookingData.searchParams,
      budget: bookingData.budget || 0
    }));
    
    // Update the state
    setBookingData(updatedBookingData);
  };

  // Load booking data from session storage
  const loadBookingData = () => {
    try {
      const savedData = sessionStorage.getItem('current_booking_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Only load if the data is less than 1 hour old
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        if (new Date(parsedData.timestamp) > oneHourAgo) {
          // Update both booking data and passenger data
          if (parsedData.trip) {
            setBookingData(prev => ({
              ...prev!,
              trip: parsedData.trip,
              searchParams: parsedData.searchParams || {}
            }));
          }
          if (parsedData.passengers) {
            setPassengerData(parsedData.passengers);
          }
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
    }
    return false;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      // Define all required fields with user-friendly names
      const requiredFields = [
        { key: 'title', name: 'Title' },
        { key: 'firstName', name: 'First Name' },
        { key: 'lastName', name: 'Last Name' },
        { key: 'dateOfBirth', name: 'Date of Birth' },
        { key: 'gender', name: 'Gender' },
        { key: 'email', name: 'Email' },
        { key: 'phone', name: 'Phone Number' },
        { key: 'documentNumber', name: 'Passport/ID Number' },
        { key: 'documentIssuingCountryCode', name: 'Document Issuing Country' },
        { key: 'documentExpiryDate', name: 'Document Expiry Date' },
        { key: 'documentNationality', name: 'Nationality' }
      ] as const;

      // Validate all required fields for each passenger
      for (let i = 0; i < passengerData.length; i++) {
        const passenger = passengerData[i];
        const missingFields = [];
        
        // Check each required field
        for (const { key, name } of requiredFields) {
          const value = passenger[key as keyof typeof passenger];
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            missingFields.push(name);
          }
        }
        
        // If any fields are missing, show a detailed error
        if (missingFields.length > 0) {
          throw new Error(
            `Please fill in the following required fields for passenger ${i + 1}:\n` +
            missingFields.join(', ')
          );
        }
      }

      // Validate passenger data
      const validationError = validatePassengerData(passengerData);
      if (validationError) {
        setError(validationError);
        setSubmitting(false);
        return;
      }

      // Save booking data to session storage
      saveBookingData();
      
      // Save ancillary state to session storage for payment page
      // Following Duffel's guide for adding extra bags
      if (ancillaryState.rows.length > 0) {
        // Calculate pricing breakdown for display in payment page
        const priceInfo = computePricing({
          baseAmount: parseFloat(bookingData?.trip?.price?.total || '0'),
          passengers: passengerData.length,
          currency: bookingData?.trip?.price?.currency || 'EUR',
          ancillaryTotal: ancillaryState.total
        });
        
        const paymentPayload = {
          ancillarySelection: {
            services: ancillaryState.rows.map(row => ({
              id: row.id,
              title: row.title,
              details: row.details,
              amount: row.amount,
              currency: row.currency,
              passenger_id: row.passengerId,
              passengerId: row.passengerId,
              passengerName: row.passengerName,
              segment_ids: row.segmentIds,
              segmentIds: row.segmentIds,
              type: row.type || 'baggage',
              quantity: row.quantity || 1
            })),
            total: ancillaryState.total,
            currency: ancillaryState.currency
          },
          // Include a detailed ancillary breakdown as JSON string
          ancillaryBreakdown: JSON.stringify(ancillaryState.rows),
          // Include pricing information for payment page
          priceInfo: {
            ...priceInfo,
            ancillaryTotal: ancillaryState.total,
            total: priceInfo.total
          }
        };
        
        sessionStorage.setItem('payment_payload', JSON.stringify(paymentPayload));
        console.log('Saved ancillary selection to payment_payload:', paymentPayload);
      }

      // Navigate to payment page
      router.push('/book/payment');
    } catch (error) {
      console.error('Error submitting booking:', error);
      setError('An error occurred while processing your booking. Please try again.');
      setSubmitting(false);
    }
  };

  // Render loading state
  if (flightLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Render error state
  if (flightError || !bookingData) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">✕</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Error</h1>
          <p className="text-gray-600 mb-6">
            {flightError || 'Unable to load booking details. Please try again.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Ensure we have valid trip data before rendering
  const { trip, searchParams } = bookingData;
  
  // Check if we have valid flight data
  const hasValidOutboundFlight = (trip?.outbound?.segments?.length > 0) || (trip?.itineraries?.[0]?.segments?.length > 0);
  const hasValidReturnFlight = searchParams.tripType === 'roundtrip' && 
    ((trip?.return?.segments?.length > 0) || (trip?.itineraries?.[1]?.segments?.length > 0));
    
  // Helper function to get the correct segment data based on the trip structure
  const getFlightSegments = (type: 'outbound' | 'return') => {
    if (trip?.[type]?.segments?.length > 0) {
      return trip[type].segments;
    }
    const index = type === 'outbound' ? 0 : 1;
    return trip?.itineraries?.[index]?.segments || [];
  };
  
  // Get the correct flight data based on the trip structure
  const outboundSegments = getFlightSegments('outbound');
  const returnSegments = hasValidReturnFlight ? getFlightSegments('return') : [];
  
  if (!hasValidOutboundFlight) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <div className="text-orange-500 text-5xl mb-4">✈️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No Flight Selected</h1>
          <p className="text-gray-600 mb-6">
            Please select a flight to continue with your booking.
          </p>
          <button
            onClick={() => router.push('/search')}
            className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Search for Flights
          </button>
        </div>
      </div>
    );
  }
  const hasReturnFlight = hasValidReturnFlight;

 

  // Extract price data from the trip object
  const currency = trip?.price?.currency || 'EUR';
  const outboundPrice = trip?.price?.breakdown?.outbound || '0';
  const returnPrice = trip?.price?.breakdown?.return || '0';
  
  // Log the extracted data for debugging
  console.log('Extracted price data:', {
    currency,
    outboundPrice,
    returnPrice,
    priceBreakdown: trip?.price?.breakdown
  });

  // Get airport data for the flight cards
  const getAirportData = (iataCode: string) => {
    return airports.find((a: any) => a.iata === iataCode) || { iata_code: iataCode };
  };

  // Format price data for the flight cards
  const priceData = {
    currency: trip.currency || 'EUR',
    total: trip.price.total || '0',
    breakdown: trip.price.breakdown
  };

  return (
    <div className="min-h-screen bg-[#FFFDF6] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-orange-500 hover:text-orange-600 transition-colors mb-6"
          >
            <FiArrowLeft className="mr-2" /> Back to results
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Booking</h1>
          <p className="text-gray-600">Review your flight details and enter passenger information</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side - Flight Itinerary */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Your Flight Itinerary</h2>
              
              {/* Outbound Flight */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Outbound Flight</h3>
                  <span className="ml-4 text-sm text-gray-500">
                    {new Date(outboundSegments?.[0]?.departure?.at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <FlightItineraryCard 
                    itinerary={{
                      segments: outboundSegments,
                      duration: trip.outbound?.duration || trip.itineraries?.[0]?.duration || ''
                    }} 
                    type="outbound" 
                    date={outboundSegments?.[0]?.departure?.at || ''}
                    airports={outboundSegments.flatMap((segment: any) => [
                      getAirportData(segment.departure.iataCode),
                      getAirportData(segment.arrival.iataCode)
                    ])}
                  />
                </div>
              </div>

              {/* Return Flight */}
              {hasReturnFlight && returnSegments.length > 0 && (
                <div className="mt-10">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Return Flight</h3>
                    <span className="ml-4 text-sm text-gray-500">
                      {new Date(returnSegments?.[0]?.departure?.at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <FlightItineraryCard 
                      itinerary={{
                        segments: returnSegments,
                        duration: trip.return?.duration || trip.itineraries?.[1]?.duration || ''
                      }} 
                      type="return" 
                      date={returnSegments?.[0]?.departure?.at || ''} 
                     
                      airports={returnSegments.flatMap((segment: any) => [
                        getAirportData(segment.departure.iataCode),
                        getAirportData(segment.arrival.iataCode)
                      ])}
                    />
                  </div>
                </div>
              )}

              {/* Ancillaries Section */}
              {bookingData?.trip?.id && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Services</h2>
                  <p className="text-gray-600 mb-4">Customize your journey with extra services like baggage, seat selection, and more.</p>
                  
                  {passengerData.length > 0 ? (
                    <>
                      <div className="mb-4 p-2 bg-blue-50 rounded">
                        <p className="text-sm text-blue-700">Debug: {passengerData.length} passenger(s)</p>
                      </div>
                      <DuffelAncillariesComponent
                        offerId={bookingData.trip.id}
                        passengers={Array.from({ length: passengerData.length }, (_, index) => {
                          // Get the passenger data for this index
                          const p = passengerData[index];
                          
                          // Ensure consistent passenger IDs that match the offer
                          // Use index-based IDs that are stable and predictable
                          const passengerId = p.id || `passenger_${index + 1}`;
                          
                          console.log(`🔍 DEBUG - Mapping passenger ${index}:`, {
                            id: passengerId,
                            name: `${p.firstName} ${p.lastName}`,
                            type: p.type
                          });
                          
                          // Store the ID back in the passenger data for consistency
                          if (!p.id) {
                            // Update the passenger data with the generated ID
                            setTimeout(() => {
                              setPassengerData(prevData => {
                                const newData = [...prevData];
                                newData[index] = { ...newData[index], id: passengerId };
                                return newData;
                              });
                            }, 0);
                          }
                          
                          // Create a completely new object for each passenger
                          // This ensures each passenger is a unique object reference
                          return {
                            id: passengerId,
                            given_name: p.firstName,
                            family_name: p.lastName,
                            gender: p.gender === 'm' ? 'M' : p.gender === 'f' ? 'F' : 'X',
                            title: p.title,
                            born_on: p.dateOfBirth,
                            email: p.email,
                            phone_number: p.phone
                          };
                        })}
                        onAncillariesSelected={(state: AncillaryState) => {
                        console.log('🔍 DEBUG - BookingPage received ancillaries:', state);
                        console.log('🔍 DEBUG - Ancillary rows count:', state.rows.length);
                        console.log('🔍 DEBUG - Ancillary total:', state.total);
                        console.log('🔍 DEBUG - Previous ancillary state:', ancillaryState);
                        
                        // Following Duffel's guide for adding extra bags
                        // Process the ancillary state to ensure we have all necessary information
                        const processedRows = state.rows.map(row => {
                          // Ensure each row has the required properties for bag services
                          if (row.type === 'baggage') {
                            return {
                              ...row,
                              // Ensure baggage details are properly formatted
                              details: row.details || `${row.title || 'Checked bag'} (${row.quantity || 1}x)`,
                              // Ensure we have passenger association
                              passengerId: row.passengerId || '',
                              // Ensure we have proper pricing
                              amount: row.amount || 0,
                              currency: row.currency || 'EUR'
                            };
                          }
                          return row;
                        });
                        
                        // Force update with new state object
                        setAncillaryState({
                          ...state,
                          rows: processedRows, // Use processed rows
                          total: Number(state.total) // Ensure it's a number
                        });
                        
                        // Log after state update
                        setTimeout(() => {
                          console.log('🔍 DEBUG - Updated ancillary state after timeout');
                          console.log('🔍 DEBUG - Processed ancillary rows:', processedRows);
                        }, 100);
                      }}
                    />
                    </>

                  ) : (
                    <div className="text-center p-4 border border-gray-200 rounded-lg">
                      <p>Please fill in passenger information first to view available ancillaries.</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Passenger Information */}
              <div className="bg-white rounded-3xl shadow-sm p-6 border border-orange-200">
                <h2 className="text-xl font-semibold text-orange-900 mb-6">Passenger Information</h2>
                
                {passengerData.map((passenger, index) => (
                  <div key={index} className="mb-8 last:mb-0 border-b border-orange-100 pb-6 last:border-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-orange-800">
                        {index === 0 ? 'Main Passenger' : `Passenger ${index + 1}`}
                      </h3>
                      <span className="text-sm bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                        {passenger.type === 'adult' ? 'Adult' : 
                         passenger.type === 'child' ? 'Child' : 'Infant'}
                      </span>
                    </div>
                    <PassengerForm
                      key={index}
                      index={index}
                      passenger={passenger}
                      onChange={handlePassengerChange}
                      countries={countries}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Booking Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-3xl shadow-sm p-6 sticky top-6 border border-orange-200">
              <h2 className="text-xl font-semibold text-orange-900 mb-4">Booking Summary</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-orange-900">Passengers:</span>
                  <span className="font-medium text-orange-900">{passengerData.length} {passengerData.length === 1 ? 'Passenger' : 'Passengers'}</span>
                </div>
                
                {priceInfo.total && (
                  <div className="space-y-2">
                    {/* Outbound Flight Price */}
                    {trip.price.breakdown?.outbound && (
                      <div className="flex justify-between">
                        <span className="text-orange-900">Flight:</span>
                        <span className="font-medium">
                          {trip.price.breakdown.currency || '€'}
                          {parseFloat(trip.price.breakdown.outbound.toString()).toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    {/* Base Fare Total */}
                    <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                      <span className="text-orange-900">Base fare (per passenger):</span>
                      <span className="font-medium">
                        {trip.price.breakdown?.currency || '€'}
                        {(priceInfo.base / passengerData.length).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-900">Service fee (per passenger):</span>
                      <span className="font-medium">
                        {trip.price.breakdown?.currency || '€'}
                        {parseFloat(priceInfo.servicePerPassenger.toFixed(2)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-900">Tax (per passenger):</span>
                      <span className="font-medium">
                        {trip.price.breakdown?.currency || '€'}
                        {parseFloat(priceInfo.markupPerPassenger.toFixed(2)).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-orange-900">Subtotal per passenger:</span>
                        <span className="font-medium">
                          {trip.price.breakdown?.currency || '€'}
                          {(
                            parseFloat(priceInfo.base.toString()) / passengerData.length + 
                            (priceInfo.servicePerPassenger ? parseFloat(priceInfo.servicePerPassenger.toString()) : 0) + 
                            (priceInfo.markupPerPassenger ? parseFloat(priceInfo.markupPerPassenger.toString()) : 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Ancillaries */}
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <span className="text-orange-900 font-medium">Additional Services:</span>
                    </div>
                    
                    {ancillaryState.rows.length > 0 ? (
                      <>
                        {ancillaryState.rows.map((row, index) => (
                          <div key={`ancillary-${index}`} className={`flex justify-between py-1 ${index === 0 ? 'animate-pulse-once' : ''}`}>
                            <div className="flex-1 pr-4 truncate">
                              <span className="text-gray-600">{row.title}{row.passengerName ? ` - ${row.passengerName}` : ''}:</span>
                            </div>
                            <span className="font-medium">
                              {typeof row.amount === 'number' ? `${row.amount.toFixed(2)} ${row.currency}` : 'Price unavailable'}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between mt-2 pt-1 border-t border-dashed border-gray-100">
                          <span className="font-medium text-orange-900">Ancillaries Total:</span>
                          <span className="font-medium text-green-600">
                            {typeof ancillaryState.total === 'number' ? `${ancillaryState.total.toFixed(2)} ${ancillaryState.currency}` : '0.00 EUR'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500 py-1">
                        No additional services selected
                      </div>
                    )}
                  </div>
                )}

                {priceInfo.total && (
                  <div className="border-t border-orange-200 mt-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-orange-900">Total Price:</span>
                      <span className="text-xl font-bold text-orange-900">
                        {trip.price.currency || '€'}
                        {(parseFloat(priceInfo.total.toString()) + (ancillaryState.total || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`w-full mt-6 py-3 px-6 rounded-lg font-medium text-white transition-colors ${
                    submitting 
                      ? 'bg-orange-400 cursor-not-allowed' 
                      : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {submitting ? 'Processing...' : 'Complete Booking'}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-500">
                  <p className="flex items-center">
                    <FiCheckCircle className="mr-2 text-green-500" />
                    Free cancellation within 24 hours
                  </p>
                  <p className="flex items-center mt-2">
                    <FiCheckCircle className="mr-2 text-green-500" />
                    No credit card fees
                  </p>
                </div>
              
                <p className="text-sm text-orange-600 mt-2">
                  All prices include taxes and fees
                  {ancillaryState.total > 0 && (
                    <span className="ml-1">+ €{ancillaryState.total.toFixed(2)} in ancillary services</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;