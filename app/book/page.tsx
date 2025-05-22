"use client";

import React, { useState, useEffect } from "react";
import { getAirlineLogoUrl } from "../components/getAirlineLogoUrl";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiArrowRight, 
  FiArrowLeft, 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiCheckCircle, 
  FiGlobe, 
  FiCreditCard,
  FiCalendar,
  FiInfo,
  FiChevronDown
} from "react-icons/fi";
import { MdFlight, MdOutlineTransgender, MdOutlineTitle } from "react-icons/md";
import { FaPassport, FaUserTie, FaUser, FaUserAlt, FaWheelchair, FaPlane } from "react-icons/fa";
import { GiMeal } from "react-icons/gi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getData } from 'country-list';
import BookingSummary from "../components/BookingSummary";
const airports = require('airports-json').airports;

// Get country list for nationality selection
const countries = getData().map(country => ({
  code: country.code,
  name: country.name
}));

// Title options
const titleOptions = [
  { value: 'mr', label: 'Mr.' },
  { value: 'mrs', label: 'Mrs.' },
  { value: 'ms', label: 'Ms.' },
  { value: 'dr', label: 'Dr.' }
];

// Gender options
const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
];

// Removed meal preferences as per request

// Booking form types
interface PassengerInfo {
  // Personal Information
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  
  // Contact Information
  email: string;
  phone: string;
  
  // Travel Documents
  passportNumber: string;
  nationality: string;
  passportExpiry: string;
  
  // Additional Information
  frequentFlyerNumber?: string;
  specialAssistance?: boolean;
  mealPreference?: string;
}

const initialPassenger: PassengerInfo = {
  title: 'mr',
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: '',
  email: "",
  phone: "",
  passportNumber: "",
  nationality: "",
  passportExpiry: "",
  frequentFlyerNumber: "",
  specialAssistance: false,
};

const BookingPage: React.FC = () => {
  // Load the full trip object for booking from localStorage
  const [bookingData, setBookingData] = useState<{ trip: any, searchParams: any, budget: any } | null>(null);
  const [flightLoading, setFlightLoading] = useState(true);
  const [flightError, setFlightError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('current_booking_offer');
      if (stored) {
        setBookingData(JSON.parse(stored));
        setFlightLoading(false);
      } else {
        setFlightError('No booking data found. Please restart your booking.');
        setFlightLoading(false);
      }
    } catch (e) {
      setFlightError('Failed to load booking data.');
      setFlightLoading(false);
    }
  }, []);

  // Extract values from bookingData if present
  const trip = bookingData?.trip;
  const searchParams = bookingData?.searchParams || {};
  const budget = bookingData?.budget || "";
  const travelers = searchParams?.travelers || "1";

  // Debug log to check the data
  useEffect(() => {
    console.log('=== DEBUGGING FLIGHT DATA ===');
    console.log('Booking data:', bookingData);
    console.log('Trip data:', trip);
    console.log('Itineraries count:', trip?.itineraries?.length || 0);
    console.log('Itineraries data:', trip?.itineraries);
    console.log('Search params:', searchParams);
    
    // Check if we have a return flight
    if (trip?.itineraries?.[1]) {
      console.log('Return flight found:', trip.itineraries[1]);
    } else {
      console.log('No return flight found in itineraries');
    }
  }, [bookingData, trip, searchParams]);

  const [step, setStep] = useState<number>(0);
  const [passengerData, setPassengerData] = useState<PassengerInfo[]>(
    Array(Number(travelers)).fill({ ...initialPassenger })
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  // Helper function to calculate layover time
  const formatDuration = (duration: string) => {
    if (!duration) return '';
    // Handle ISO 8601 duration format (e.g., 'P1DT4H35M')
    const matches = duration.match(/P(?:([0-9]*)D)?T?(?:([0-9]*)H)?(?:([0-9]*)M)?/);
    if (!matches) return duration;
    
    const days = parseInt(matches[1]) || 0;
    const hours = parseInt(matches[2]) || 0;
    const minutes = parseInt(matches[3]) || 0;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if ((minutes > 0 || (days === 0 && hours === 0)) && parts.length < 2) {
      parts.push(`${minutes}m`);
    }
    
    return parts.join(' ') || '0m';
  };

  const calculateLayover = (arrivalTime: string, nextDepartureTime: string) => {
    if (!arrivalTime || !nextDepartureTime) return '';
    const arrival = new Date(arrivalTime);
    const departure = new Date(nextDepartureTime);
    const diffMs = departure.getTime() - arrival.getTime();
    
    // Calculate days, hours, minutes
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if ((minutes > 0 || (days === 0 && hours === 0)) && parts.length < 2) {
      parts.push(`${minutes}m`);
    }
    
    return parts.join(' ');
  };

  const [error, setError] = useState<string | null>(null);

  // Check if we have the required flight data (note: tripType is 'roundtrip' not 'round-trip')
  const hasReturnFlight = searchParams?.tripType === 'roundtrip' && trip?.itineraries?.[1];
  
  // Log flight data for debugging
  console.log('Flight data:', {
    hasReturnFlight,
    outboundItinerary: trip?.itineraries?.[0],
    returnItinerary: trip?.itineraries?.[1],
    searchParams
  });
  
  // All old flight/cached offer logic removed. Use only bookingData/trip.

  // Handle input change for a passenger
  const handleInputChange = (idx: number, field: keyof PassengerInfo, value: string | boolean | Date | null) => {
    setPassengerData((prev) => {
      const updated = [...prev];
      // Handle Date objects for date fields
      if (value instanceof Date) {
        updated[idx] = { ...updated[idx], [field]: value.toISOString().split('T')[0] };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  // Handle booking submission
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // TODO: Replace with actual booking API call
      await new Promise((res) => setTimeout(res, 1200));
      setConfirmation("Your booking has been received! Check your email for details.");
      setStep(2); // Move to confirmation step on success
    } catch (err) {
      setError("Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Render form for each passenger with enhanced UI
  const renderPassengerForm = (idx: number) => {
    const isFirstPassenger = idx === 0;
    const passenger = passengerData[idx] || { ...initialPassenger };
    
    // Check if field has a value
    const hasValue = (field: keyof PassengerInfo) => {
      const value = passenger[field];
      return value !== undefined && value !== null && String(value).trim() !== '';
    };

    return (
      <div key={idx} className="mb-8 p-6 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300">
        {/* Passenger Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFA500] to-[#FF8C00] flex items-center justify-center text-white font-medium">
              {idx + 1}
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Passenger {idx + 1} 
              {isFirstPassenger && (
                <span className="ml-2 text-sm font-normal bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
                  Primary Passenger
                </span>
              )}
            </h3>
          </div>
          <div className="text-sm text-gray-500">
            {isFirstPassenger ? 'Account Holder' : 'Additional Passenger'}
          </div>
        </div>
        
        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <MdOutlineTitle className="mr-1.5 text-gray-500 text-[15px]" />
              Title
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                value={passenger.title}
                onChange={(e) => handleInputChange(idx, "title", e.target.value)}
                className="w-full p-3.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent appearance-none"
                required
              >
                <option value="">Select title</option>
                {titleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FiUser className="mr-1.5 text-gray-500 text-[15px]" />
              First Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={passenger.firstName}
                onChange={(e) => handleInputChange(idx, "firstName", e.target.value)}
                className={`w-full p-3.5 pr-10 border ${hasValue('firstName') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent transition-all duration-200`}
                placeholder="John"
                required
              />
              {hasValue('firstName') && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Last Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Last Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={passenger.lastName}
                onChange={(e) => handleInputChange(idx, "lastName", e.target.value)}
                className={`w-full p-3.5 pr-10 border ${hasValue('lastName') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent transition-all duration-200`}
                placeholder="Doe"
                required
              />
              {hasValue('lastName') && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Email */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FiMail className="mr-1.5 text-gray-500 text-[15px]" />
              Email Address
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={passenger.email}
                onChange={(e) => handleInputChange(idx, "email", e.target.value)}
                className={`w-full p-3.5 pl-10 pr-10 border ${hasValue('email') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent transition-all duration-200`}
                placeholder="john.doe@example.com"
                required
              />
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {hasValue('email') && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Phone Number */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FiPhone className="mr-1.5 text-gray-500 text-[15px]" />
              Phone Number
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={passenger.phone}
                onChange={(e) => handleInputChange(idx, "phone", e.target.value)}
                className={`w-full p-3.5 pl-10 pr-10 border ${hasValue('phone') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent transition-all duration-200`}
                placeholder="+1 (555) 123-4567"
                required
              />
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {hasValue('phone') && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Passport Number */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FaPassport className="mr-1.5 text-gray-500 text-[15px]" />
              Passport Number
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={passenger.passportNumber}
                onChange={(e) => handleInputChange(idx, "passportNumber", e.target.value)}
                className={`w-full p-3.5 pl-10 pr-10 border ${hasValue('passportNumber') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent transition-all duration-200`}
                placeholder="e.g., A12345678"
                required
              />
              <FaPassport className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {hasValue('passportNumber') && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Nationality */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FiGlobe className="mr-1.5 text-gray-500 text-[15px]" />
              Nationality
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                value={passenger.nationality}
                onChange={(e) => handleInputChange(idx, "nationality", e.target.value)}
                className={`w-full p-3.5 pr-10 border ${hasValue('nationality') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent appearance-none`}
                required
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Passport Expiry Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FiCalendar className="mr-1.5 text-gray-500 text-[15px]" />
              Passport Expiry Date
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <DatePicker
                selected={passenger.passportExpiry ? new Date(passenger.passportExpiry) : null}
                onChange={(date) => handleInputChange(idx, "passportExpiry", date)}
                dateFormat="yyyy-MM-dd"
                className={`w-full p-3.5 pl-10 border ${hasValue('passportExpiry') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent`}
                placeholderText="YYYY-MM-DD"
                minDate={new Date()}
                required
              />
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Date of Birth and Passport Expiry in one row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <FiCalendar className="mr-1.5 text-gray-500 text-[15px]" />
                Date of Birth
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <DatePicker
                  selected={passenger.dateOfBirth ? new Date(passenger.dateOfBirth) : null}
                  onChange={(date) => handleInputChange(idx, "dateOfBirth", date)}
                  dateFormat="yyyy-MM-dd"
                  className={`w-full p-3.5 pl-10 border ${hasValue('dateOfBirth') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent`}
                  placeholderText="YYYY-MM-DD"
                  maxDate={new Date()}
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  required
                />
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Passport Expiry Date */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <FiCalendar className="mr-1.5 text-gray-500 text-[15px]" />
                Passport Expiry Date
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <DatePicker
                  selected={passenger.passportExpiry ? new Date(passenger.passportExpiry) : null}
                  onChange={(date) => handleInputChange(idx, "passportExpiry", date)}
                  dateFormat="yyyy-MM-dd"
                  className={`w-full p-3.5 pl-10 border ${hasValue('passportExpiry') ? 'border-green-300' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent`}
                  placeholderText="YYYY-MM-DD"
                  minDate={new Date()}
                  required
                />
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Special Assistance */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FaWheelchair className="mr-1.5 text-gray-500 text-[15px]" />
              Special Assistance
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`special-assistance-${idx}`}
                checked={!!passenger.specialAssistance}
                onChange={(e) => handleInputChange(idx, "specialAssistance", e.target.checked)}
                className="h-4 w-4 text-[#FFA500] focus:ring-[#FFA500] border-gray-300 rounded"
              />
              <label htmlFor={`special-assistance-${idx}`} className="ml-2 text-sm text-gray-700">
                I require special assistance
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Begin restored UI with updated logic ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
      <div className="max-w-2xl mx-auto py-10 px-4">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
            Book Your Flight Package
          </h1>
          <p className="text-gray-600">Fill in your details to complete your booking.</p>
        </header>
        {/* Flight summary section */}
        <div className="mb-8">
          {flightLoading ? (
            <div className="text-center text-gray-400">Loading flight summary...</div>
          ) : flightError ? (
            <div className="text-center text-red-500">{flightError}</div>
          ) : !trip ? (
            <div className="text-center text-gray-400">No trip data found. Please restart your booking.</div>
          ) : (
            <div>
              <div className="rounded-3xl shadow-xl border border-yellow-100 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Flight Summary</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-yellow-100 text-yellow-800 font-medium px-3 py-1 rounded-full text-sm">
                        {typeof trip.itineraries?.[0]?.segments?.[0]?.carrierCode === "object" 
                          ? trip.itineraries[0].segments[0].carrierCode.code 
                          : trip.itineraries?.[0]?.segments?.[0]?.carrierCode}
                        {trip.itineraries?.[0]?.segments?.[0]?.number}
                      </span>
                      <span className="text-sm text-gray-600">
                        {searchParams.travelers} {searchParams.travelers === '1' ? 'passenger' : 'passengers'} • {searchParams.cabinClass || 'Economy'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {trip?.price?.total || '--'} <span className="text-lg font-normal">{trip?.price?.currency || 'EUR'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Total for {trip.travelerPricings?.length || travelers} {trip.travelerPricings?.length === 1 ? 'passenger' : 'passengers'}
                    </div>
                  </div>
                </div>
                {/* Flight Legs - Outbound and Return */}
                 <div className="space-y-6">
                  {/* Outbound Flight */}
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    {trip.price?.breakdown?.outbound && (
                      <div className="absolute top-4 right-4 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-full border border-green-100">
                        {trip.price.currency} {trip.price.breakdown.outbound}
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                          <div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-gray-900">Outbound Flight</span>
                                {trip.price?.breakdown?.outbound && (
                                  <span className="text-sm font-medium text-green-600">
                                    {trip.price.breakdown.outbound} {trip.price.currency}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 ml-4">
                                {new Date(searchParams?.departureDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          trip.itineraries?.[0]?.segments?.length - 1 === 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {trip.itineraries?.[0]?.segments?.length - 1 === 0 ? 'Direct' : 
                           `${trip.itineraries?.[0]?.segments?.length - 1} Stop${trip.itineraries?.[0]?.segments?.length - 1 > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    <div className="flex items-center justify-between">
                      {(() => {
                        const outboundItinerary = trip.itineraries?.[0];
                        const dep = outboundItinerary?.segments?.[0]?.departure;
                        const arr = outboundItinerary?.segments?.[outboundItinerary.segments.length - 1]?.arrival;
                        const depInfo = airports.find((a: any) => a.iata_code === dep?.iataCode);
                        const arrInfo = airports.find((a: any) => a.iata_code === arr?.iataCode);
                        const hasStops = (outboundItinerary?.segments?.length || 0) > 1;
                        
                        return (
                          <>
                            <div className="flex-1">
                              <div className="text-2xl font-extrabold text-gray-800">{dep?.iataCode}</div>
                              <div className="text-sm text-gray-600">
                                {dep?.at ? new Date(dep.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{depInfo?.city || dep?.iataCode}</div>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center flex-1 px-4">
                              <div className="w-full flex items-center mb-1">
                                <div className="flex-1 h-px bg-gray-300"></div>
                                <MdFlight className="mx-2 text-gray-400 text-xl transform rotate-90" />
                                <div className="flex-1 h-px bg-gray-300"></div>
                              </div>
                              <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                                {formatDuration(outboundItinerary?.duration)}
                              </div>
                              {hasStops && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    {outboundItinerary.segments.length - 1} {outboundItinerary.segments.length === 2 ? 'Stop' : 'Stops'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 text-right">
                              <div className="text-2xl font-extrabold text-gray-800">{arr?.iataCode}</div>
                              <div className="text-sm text-gray-600">
                                {arr?.at ? new Date(arr.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{arrInfo?.city || arr?.iataCode}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* Show stop details if the flight has stops */}
                    {(trip.itineraries?.[0]?.segments?.length || 0) > 1 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-semibold text-gray-800">Outbound Flight Details</h4>
                          <span className="text-sm text-gray-500">
                            {new Date(searchParams?.departureDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {trip.itineraries?.[0]?.segments.map((segment: any, idx: number) => {
                            const depInfo = airports.find((a: any) => a.iata_code === segment.departure?.iataCode);
                            const arrInfo = airports.find((a: any) => a.iata_code === segment.arrival?.iataCode);
                            const layover = idx < (trip.itineraries?.[0]?.segments?.length || 0) - 1 ? 
                              calculateLayover(
                                segment.arrival?.at, 
                                trip.itineraries?.[0]?.segments?.[idx + 1]?.departure?.at
                              ) : null;
                            
                            return (
                              <div key={idx} className="relative pl-6">
                                {/* Flight segment */}
                                <div className="flex items-start">
                                  <div className="absolute left-0 top-2 w-5 h-5 flex items-center justify-center bg-blue-100 rounded-full text-blue-600 text-xs font-medium">
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="font-medium">{segment.departure?.iataCode}</span>
                                        <span className="text-xs text-gray-500 ml-1">
                                          {depInfo?.city || ''}
                                        </span>
                                      </div>
                                      <div className="text-sm">
                                        {new Date(segment.departure?.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="text-xs">
                                        <span className="font-medium text-gray-700">Flight:</span>{' '}
                                        <span className="text-gray-600">{segment.carrierCode} {segment.number}</span>
                                      </div>
                                      {segment.aircraft?.code && (
                                        <div className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                          {segment.aircraft.code}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Layover information */}
                                {layover && (
                                  <div className="mt-2 mb-2 ml-5 pl-4 border-l-2 border-gray-200">
                                    <div className="flex items-center text-xs text-gray-500">
                                      <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Layover: {layover}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500 flex items-center">
                                      <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {segment.arrival?.iataCode} • {arrInfo?.name || arrInfo?.city || 'Airport'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Flight details */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <img
                          src={getAirlineLogoUrl(trip.itineraries?.[0]?.segments?.[0]?.carrierCode || '')}
                          alt="Airline"
                          className="h-5 w-auto"
                          onError={e => (e.currentTarget.style.display = 'none')}
                        />
                        <span>{trip.itineraries?.[0]?.segments?.[0]?.carrierName || 'Flight'}</span>
                        <span>•</span>
                        <span>Flight {trip.itineraries?.[0]?.segments?.[0]?.number || '--'}</span>
                        <span>•</span>
                        <span>{trip.itineraries?.[0]?.segments?.[0]?.aircraft?.code || '--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Return Flight - Only show if it exists */}
                  {hasReturnFlight && (
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      {trip.price?.breakdown?.return && (
                        <div className="absolute top-4 right-4 bg-orange-50 text-orange-700 text-xs font-medium px-2 py-1 rounded-full border border-orange-100">
                          {trip.price.currency} {trip.price.breakdown.return}
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5"></div>
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-gray-900">Return Flight</span>
                                {trip.price?.breakdown?.return && (
                                  <span className="text-sm font-medium text-orange-600">
                                    {trip.price.breakdown.return} {trip.price.currency}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 ml-4">
                                {new Date(searchParams?.returnDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          trip.itineraries?.[1]?.segments?.length - 1 === 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {trip.itineraries?.[1]?.segments?.length - 1 === 0 ? 'Direct' : 
                           `${trip.itineraries?.[1]?.segments?.length - 1} Stop${trip.itineraries?.[1]?.segments?.length - 1 > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {(() => {
                          const returnItinerary = trip.itineraries?.[1];
                          const dep = returnItinerary?.segments?.[0]?.departure;
                          const arr = returnItinerary?.segments?.[returnItinerary.segments.length - 1]?.arrival;
                          const depInfo = airports.find((a: any) => a.iata_code === dep?.iataCode);
                          const arrInfo = airports.find((a: any) => a.iata_code === arr?.iataCode);
                          const hasStops = (returnItinerary?.segments?.length || 0) > 1;
                          
                          return (
                            <>
                              <div className="flex-1">
                                <div className="text-2xl font-extrabold text-gray-800">{dep?.iataCode}</div>
                                <div className="text-sm text-gray-600">
                                  {dep?.at ? new Date(dep.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{depInfo?.city || dep?.iataCode}</div>
                              </div>
                              
                              <div className="flex flex-col items-center justify-center flex-1 px-4">
                                <div className="w-full flex items-center mb-1">
                                  <div className="flex-1 h-px bg-gray-300"></div>
                                  <MdFlight className="mx-2 text-orange-400 text-xl transform rotate-90" />
                                  <div className="flex-1 h-px bg-gray-300"></div>
                                </div>
                                <div className="text-xs text-gray-500 bg-orange-50 px-2 py-1 rounded-full">
                                  {formatDuration(returnItinerary?.duration)}
                                </div>
                                {hasStops && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      {returnItinerary.segments.length - 1} {returnItinerary.segments.length === 2 ? 'Stop' : 'Stops'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 text-right">
                                <div className="text-2xl font-extrabold text-gray-800">{arr?.iataCode}</div>
                                <div className="text-sm text-gray-600">
                                  {arr?.at ? new Date(arr.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{arrInfo?.city || arr?.iataCode}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      
                      {/* Show stop details for return flight if it has stops */}
                      {(trip.itineraries?.[1]?.segments?.length || 0) > 1 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-base font-semibold text-gray-800">Return Flight Details</h4>
                            <span className="text-sm text-gray-500">
                              {new Date(searchParams?.returnDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="space-y-4">
                            {trip.itineraries?.[1]?.segments.map((segment: any, idx: number) => {
                              const depInfo = airports.find((a: any) => a.iata_code === segment.departure?.iataCode);
                              const arrInfo = airports.find((a: any) => a.iata_code === segment.arrival?.iataCode);
                              const layover = idx < (trip.itineraries?.[1]?.segments?.length || 0) - 1 ? 
                                calculateLayover(
                                  segment.arrival?.at, 
                                  trip.itineraries?.[1]?.segments?.[idx + 1]?.departure?.at
                                ) : null;
                              
                              return (
                                <div key={`return-${idx}`} className="relative pl-6">
                                  <div className="flex items-start">
                                    <div className="absolute left-0 top-2 w-5 h-5 flex items-center justify-center bg-blue-100 rounded-full text-blue-600 text-xs font-medium">
                                      {String.fromCharCode(65 + idx)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className="font-medium">{segment.departure?.iataCode}</span>
                                          <span className="text-xs text-gray-500 ml-1">
                                            {depInfo?.city || ''}
                                          </span>
                                        </div>
                                        <div className="text-sm">
                                          {new Date(segment.departure?.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <div className="text-xs text-gray-500">
                                          {segment.carrierCode} {segment.number}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {segment.aircraft?.code}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {layover && (
                                    <div className="mt-2 mb-2 ml-5 pl-4 border-l-2 border-gray-200">
                                      <div className="flex items-center text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                                        <svg className="w-3 h-3 mr-1 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Layover: {layover}</span>
                                        {parseInt(layover) > 3 && (
                                          <span className="ml-2 px-1.5 py-0.5 text-xxs bg-amber-100 text-amber-800 rounded">Long layover</span>
                                        )}
                                      </div>
                                      <div className="mt-1 text-xs text-gray-500 flex items-center">
                                        <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {segment.arrival?.iataCode} • {arrInfo?.name || arrInfo?.city || 'Airport'}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Flight details */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <img
                            src={getAirlineLogoUrl(trip.itineraries?.[1]?.segments?.[0]?.carrierCode || '')}
                            alt="Airline"
                            className="h-5 w-auto"
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                          <span>{trip.itineraries?.[1]?.segments?.[0]?.carrierName || 'Flight'}</span>
                          <span>•</span>
                          <span>Flight {trip.itineraries?.[1]?.segments?.[0]?.number || '--'}</span>
                          <span>•</span>
                          <span>{trip.itineraries?.[1]?.segments?.[0]?.aircraft?.code || '--'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <hr className="my-4 border-t border-gray-200" />
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {/* Airline & Aircraft */}
                  <div className="space-y-3">
                    {/* Show return flight info if exists */}
                    {trip.itineraries?.[1] && searchParams?.tripType === 'round-trip' && (
                      <div className="flex items-center gap-3 ml-8">
                        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full shadow">
                          {trip.itineraries?.[1]?.segments?.[0]?.carrierCode || '--'}
                        </span>
                        <div className="flex items-center">
                          <img
                            src={getAirlineLogoUrl(trip.itineraries?.[1]?.segments?.[0]?.carrierCode || '')}
                            alt="Airline Logo"
                            className="h-5 w-auto mr-2"
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {trip.itineraries?.[1]?.segments?.[0]?.carrierName || 'Airline'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {trip.itineraries?.[1]?.segments?.[0]?.aircraft?.code || ''}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Price and Passengers */}
                  <div className="text-right">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-[#FFA500]">
                        {trip.price?.currency} {trip.price?.total}
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          {trip.oneWay ? 'one-way' : 'round-trip'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {trip.travelerPricings?.length || travelers} passenger{trip.travelerPricings?.length !== 1 ? 's' : ''} • {trip.travelerPricings?.[0]?.fareOption || 'Economy'}
                      </div>
                      {trip.price?.breakdown?.base && (
                        <div className="text-xs text-gray-500">
                          Base: {trip.price.breakdown.base} {trip.price.currency}
                        </div>
                      )}
                      {!trip.oneWay && (
                        <div className="text-xs text-green-600 font-medium">
                          Includes {trip.itineraries?.length || 2} flights
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {step === 0 && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl shadow-md"
          >
            <form
              onSubmit={e => {
                e.preventDefault();
                setStep(1);
              }}
            >
              {Array.from({ length: Number(travelers) }).map((_, idx) => renderPassengerForm(idx))}
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  className="bg-gray-200 text-gray-600 px-5 py-2 rounded-xl font-medium hover:bg-gray-300"
                  onClick={() => window.history.back()}                >
                  <FiArrowLeft className="inline-block mr-2" /> Back
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-8 py-2 rounded-xl font-medium shadow-md hover:shadow-lg"
                >
                  Next <FiArrowRight className="inline-block ml-2" />
                </button>
              </div>
              {error && <div className="text-red-600 mt-4">{error}</div>}
            </form>
          </motion.div>
        )}
        {step === 1 && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl shadow-md"
          >
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><FiCheckCircle className="text-[#FFA500]" /> Review & Confirm</h2>
            {/* Add review details here if desired */}
            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="bg-gray-200 text-gray-600 px-5 py-2 rounded-xl font-medium hover:bg-gray-300"
                onClick={() => setStep(0)}
              >
                <FiArrowLeft className="inline-block mr-2" /> Back
              </button>
              <button
                type="button"
                className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-8 py-2 rounded-xl font-medium shadow-md hover:shadow-lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Booking..." : "Book Now"}
              </button>
            </div>
            {error && <div className="text-red-600 mt-4">{error}</div>}
          </motion.div>
        )}
        {step === 2 && confirmation && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-8 rounded-xl shadow-md text-center"
          >
            <FiCheckCircle className="text-4xl text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-4">{confirmation}</p>
            <button
              className="bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-8 py-2 rounded-xl font-medium shadow-md hover:shadow-lg"
              onClick={() => window.location.href = "/"}
            >
              Back to Home
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    );  
};

export default BookingPage;