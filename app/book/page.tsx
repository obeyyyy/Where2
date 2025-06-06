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
import PassengerForm, { PassengerInfo } from "@/app/components/PassengerForm";

// Extend the PassengerInfo interface with additional properties
interface BookingPassengerInfo extends PassengerInfo {
  // Personal Information
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
            setBookingData({
              trip: savedData.trip || {},
              searchParams: savedData.searchParams || {},
              budget: savedData.searchParams?.budget || 0
            });
            
            if (savedData.passengers && savedData.passengers.length > 0) {
              setPassengerData(savedData.passengers);
            }
            
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
          
          // Set passenger data or use default if none exists
          if (savedData.passengers && savedData.passengers.length > 0) {
            // Ensure all passengers have required fields
            const validPassengers = savedData.passengers.map((p: Partial<BookingPassengerInfo>) => ({
              ...defaultPassenger,
              ...p,
              gender: (['m', 'f', 'x'].includes(p.gender || '') ? p.gender : 'm') as 'm' | 'f' | 'x',
              type: p.type || 'adult',
              title: p.title || 'mr',
              documentType: p.documentType || 'passport',
              specialAssistance: p.specialAssistance || false,
              mealPreferences: p.mealPreferences || [],
              address: {
                ...defaultPassenger.address,
                ...(p.address || {})
              }
            }));
            setPassengerData(validPassengers);
          } else {
            setPassengerData([defaultPassenger]);
          }
          
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

      // Save booking data to session storage
      saveBookingData();
      
      // Navigate to payment page with booking data
      router.push(`/book/payment?bookingData=${encodeURIComponent(JSON.stringify(bookingData))}`);
    } catch (err: any) {
      setError(err.message || 'Failed to complete booking. Please try again.');
    } finally {
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
                    {new Date(searchParams.departureDate).toLocaleDateString('en-US', {
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
                    date={searchParams.departureDate}
                    price={priceData}
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
                      {new Date(searchParams.returnDate || '').toLocaleDateString('en-US', {
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
                      date={searchParams.returnDate || ''} 
                      price={priceData}
                      airports={returnSegments.flatMap((segment: any) => [
                        getAirportData(segment.departure.iataCode),
                        getAirportData(segment.arrival.iataCode)
                      ])}
                    />
                  </div>
                </div>
              )}

              {/* Passenger Information */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Passenger Information</h2>
                
                {passengerData.map((passenger, index) => (
                  <div key={index} className="mb-8 last:mb-0 border-b border-gray-100 pb-6 last:border-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        {index === 0 ? 'Main Passenger' : `Passenger ${index + 1}`}
                      </h3>
                      <span className="text-sm text-gray-500">
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
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Booking Summary</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Passengers:</span>
                  <span className="font-medium">{passengerData.length} {passengerData.length === 1 ? 'Passenger' : 'Passengers'}</span>
                </div>
                
                {trip?.price?.total && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base fare (per passenger):</span>
                      <span className="font-medium">
                        {trip.price.breakdown?.currency || '€'}
                        {parseFloat(trip.price.total.toString()).toFixed(2)}
                      </span>
                    </div>
                    {trip.price.breakdown?.serviceFee && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service fee (per passenger):</span>
                        <span className="font-medium">
                          {trip.price.breakdown.currency || '€'}
                          {parseFloat(trip.price.breakdown.serviceFee.toString()).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {trip.price.breakdown?.markup && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Markup (per passenger):</span>
                        <span className="font-medium">
                          {trip.price.breakdown.currency || '€'}
                          {parseFloat(trip.price.breakdown.markup.toString()).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Subtotal per passenger:</span>
                        <span className="font-medium">
                          {trip.price.breakdown?.currency || '€'}
                          {(
                            parseFloat(trip.price.total.toString()) + 
                            (trip.price.breakdown?.serviceFee ? parseFloat(trip.price.breakdown.serviceFee.toString()) : 0) + 
                            (trip.price.breakdown?.markup ? parseFloat(trip.price.breakdown.markup.toString()) : 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {trip?.price?.total && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total for {passengerData.length} {passengerData.length === 1 ? 'passenger' : 'passengers'}:</span>
                      <span className="text-orange-500">
                        €{((parseFloat(trip.price.total) + 4.00) * passengerData.length).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      Includes €3.00 markup + €1.00 service fee per passenger
                    </p>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
