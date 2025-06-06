"use client";

import React, { useState, useEffect } from "react";
import { FiUser, FiMail, FiPhone, FiCalendar, FiGlobe, FiChevronDown, FiInfo } from "react-icons/fi";
import { FaPassport, FaUserTie, FaUser, FaWheelchair } from "react-icons/fa";
import { GiMeal } from "react-icons/gi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export interface PassengerInfo {
  // Personal Information
  type: 'adult' | 'child' | 'infant_with_seat' | 'infant_without_seat';
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
}

interface PassengerFormProps {
  passenger: PassengerInfo;
  index: number;
  onChange: (index: number, field: keyof PassengerInfo, value: any) => void;
  countries: Array<{ code: string; name: string }>;
}

const titleOptions = [
  { value: 'mr', label: 'Mr.' },
  { value: 'mrs', label: 'Mrs.' },
  { value: 'ms', label: 'Ms.' },
  { value: 'dr', label: 'Dr.' }
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
];

const PassengerForm: React.FC<PassengerFormProps> = ({ passenger, index, onChange, countries }) => {
  // Prefill with test data in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !passenger.firstName) {
      const testData = {
        type: 'adult',
        title: 'mr',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        gender: 'm' as const,
        email: 'test@example.com',
        phone: '+1234567890',
        documentType: 'passport',
        documentNumber: 'AB123456',
        documentIssuingCountryCode: 'US',
        documentExpiryDate: '2030-12-31',
        documentNationality: 'US',
        address: {
          addressLine1: '123 Test St',
          city: 'New York',
          countryCode: 'US',
          postalCode: '10001'
        }
      };

      // Apply test data to all fields
      Object.entries(testData).forEach(([key, value]) => {
        onChange(index, key as keyof PassengerInfo, value);
      });

      console.log('Prefilled passenger form with test data');
    }
  }, []); // Empty dependency array ensures this runs once on mount
  const [isExpanded, setIsExpanded] = useState(true);

  const handleInputChange = (field: keyof PassengerInfo, value: any) => {
    // If nationality changes, update the document issuing country to match
    if (field === 'documentNationality' && value) {
      const selectedCountry = countries.find(c => c.name === value);
      if (selectedCountry) {
        onChange(index, 'documentIssuingCountryCode', selectedCountry.code);
      }
    }
    onChange(index, field, value);
  };

  const hasValue = (field: keyof PassengerInfo) => {
    const value = passenger[field];
    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  return (
    <div className="mb-8 p-6 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold flex items-center">
          <FiUser className="mr-2 text-[#FFA500]" />
          Passenger {index + 1} - {passenger.title ? `${passenger.title}. ` : ''}{passenger.firstName} {passenger.lastName}
        </h3>
        <FiChevronDown 
          className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <select
                value={passenger.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full p-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
              >
                {titleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                value={passenger.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full p-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                placeholder="John"
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={passenger.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full p-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                placeholder="Doe"
                required
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                value={passenger.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full p-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                required
              >
                <option value="">Select Gender</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <div className="relative">
                <DatePicker
                  selected={passenger.dateOfBirth ? new Date(passenger.dateOfBirth) : null}
                  onChange={(date) => handleInputChange('dateOfBirth', date?.toISOString().split('T')[0] || '')}
                  dateFormat="yyyy-MM-dd"
                  className="w-full p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                  placeholderText="YYYY-MM-DD"
                  maxDate={new Date()}
                  required
                />
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Nationality */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nationality</label>
              <div className="relative">
                <select
                  value={passenger.documentNationality}
                  onChange={(e) => handleInputChange('documentNationality', e.target.value)}
                  className="w-full p-3.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent appearance-none"
                  required
                >
                  <option value="">Select Nationality</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Document Issuing Country */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Document Issuing Country</label>
              <div className="relative">
                <select
                  value={passenger.documentIssuingCountryCode}
                  onChange={(e) => handleInputChange('documentIssuingCountryCode', e.target.value)}
                  className="w-full p-3.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent appearance-none"
                  required
                >
                  <option value="">Select Issuing Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-md font-semibold mb-4 flex items-center">
              <FiMail className="mr-2 text-[#FFA500]" />
              Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={passenger.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                    placeholder="your.email@example.com"
                    required
                  />
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={passenger.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Travel Documents */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-md font-semibold mb-4 flex items-center">
              <FaPassport className="mr-2 text-[#FFA500]" />
              Travel Documents
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Passport Number */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Passport Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={passenger.documentNumber}
                    onChange={(e) => handleInputChange('documentNumber', e.target.value)}
                    className="w-full p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                    placeholder="Enter passport number"
                    required
                  />
                  <FaPassport className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Passport Expiry Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Passport Expiry Date</label>
                <div className="relative">
                  <DatePicker
                    selected={passenger.documentExpiryDate ? new Date(passenger.documentExpiryDate) : null}
                    onChange={(date) => handleInputChange('documentExpiryDate', date?.toISOString().split('T')[0] || '')}
                    dateFormat="yyyy-MM-dd"
                    className="w-full p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                    placeholderText="YYYY-MM-DD"
                    minDate={new Date()}
                    required
                  />
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-md font-semibold mb-4 flex items-center">
              <FiInfo className="mr-2 text-[#FFA500]" />
              Additional Information
            </h4>
            <div className="space-y-4">
              {/* Frequent Flyer Number */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Frequent Flyer Number (Optional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={passenger.frequentFlyerNumber || ''}
                    onChange={(e) => handleInputChange('frequentFlyerNumber', e.target.value)}
                    className="w-full p-3.5 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent"
                    placeholder="Enter frequent flyer number"
                  />
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Special Assistance */}
              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id={`special-assistance-${index}`}
                  checked={passenger.specialAssistance || false}
                  onChange={(e) => handleInputChange('specialAssistance', e.target.checked)}
                  className="h-4 w-4 text-[#FFA500] focus:ring-[#FFA500] border-gray-300 rounded"
                />
                <label htmlFor={`special-assistance-${index}`} className="text-sm text-gray-700">
                  I require special assistance
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerForm;
