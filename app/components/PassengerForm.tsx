"use client";

import React, { useState, useEffect } from "react";
import { FiUser, FiMail, FiPhone, FiCalendar, FiGlobe, FiChevronDown, FiInfo, FiCheck, FiX } from "react-icons/fi";
import { FaPassport, FaUserTie, FaUser, FaWheelchair, FaFlag } from "react-icons/fa";
import { GiMeal } from "react-icons/gi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode, formatIncompletePhoneNumber, AsYouType, CountryCode, getExampleNumber } from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

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

interface FieldError {
  field: string;
  message: string;
}

interface PassengerFormProps {
  passenger: PassengerInfo;
  index: number;
  onChange: (index: number, field: keyof PassengerInfo, value: any) => void;
  onValidationChange?: (index: number, isValid: boolean, errors: FieldError[]) => void;
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

const PassengerForm: React.FC<PassengerFormProps> = ({ passenger, index, onChange, onValidationChange, countries }) => {
  const [errors, setErrors] = useState<FieldError[]>([]);
  
  // Validate all fields and update parent
  const validateFields = () => {
    const newErrors: FieldError[] = [];
    
    // Required fields validation - base fields required for all passengers
    const baseRequiredFields: Array<{field: keyof PassengerInfo; label: string}> = [
      { field: 'title', label: 'Title' },
      { field: 'firstName', label: 'First Name' },
      { field: 'lastName', label: 'Last Name' },
      { field: 'gender', label: 'Gender' },
      { field: 'dateOfBirth', label: 'Date of Birth' },
      { field: 'documentType', label: 'Document Type' },
      { field: 'documentNumber', label: 'Document Number' },
      { field: 'documentIssuingCountryCode', label: 'Document Issuing Country' },
      { field: 'documentExpiryDate', label: 'Document Expiry Date' },
      { field: 'documentNationality', label: 'Nationality' },
    ];
    
    // Contact fields only required for main passenger (index 0)
    const mainPassengerFields: Array<{field: keyof PassengerInfo; label: string}> = [
      { field: 'email', label: 'Email' },
      { field: 'phone', label: 'Phone' }
    ];
    
    // Combine required fields based on passenger index
    const requiredFields = [...baseRequiredFields];
    if (index === 0) {
      requiredFields.push(...mainPassengerFields);
    }

    requiredFields.forEach(({ field, label }) => {
      if (!passenger[field]) {
        newErrors.push({
          field,
          message: `${label} is required`
        });
      }
    });

    // Date of Birth validation
    if (passenger.dateOfBirth) {
      const birthDate = new Date(passenger.dateOfBirth);
      const now = new Date();
      
      if (birthDate > now) {
        newErrors.push({
          field: 'dateOfBirth',
          message: 'Date of birth cannot be in the future'
        });
      }

      // Age validation based on passenger type
      const ageInYears = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      if (passenger.type === 'adult' && ageInYears < 12) {
        newErrors.push({
          field: 'dateOfBirth',
          message: 'Adult passengers must be at least 12 years old'
        });
      } else if (passenger.type === 'child' && (ageInYears < 2 || ageInYears >= 12)) {
        newErrors.push({
          field: 'dateOfBirth',
          message: 'Child passengers must be between 2 and 11 years old'
        });
      } else if (passenger.type.startsWith('infant') && ageInYears >= 2) {
        newErrors.push({
          field: 'dateOfBirth',
          message: 'Infant passengers must be under 2 years old'
        });
      }
    }

    // Document expiry validation
    if (passenger.documentExpiryDate) {
      const expiryDate = new Date(passenger.documentExpiryDate);
      const now = new Date();
      
      if (expiryDate <= now) {
        newErrors.push({
          field: 'documentExpiryDate',
          message: 'Document must not be expired'
        });
      }
    }

    // Email validation
    if (passenger.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passenger.email)) {
      newErrors.push({
        field: 'email',
        message: 'Invalid email format'
      });
    }

    // Enhanced phone validation using libphonenumber-js
    if (passenger.phone) {
      try {
        // Try to parse the phone number
        const phoneInput = passenger.phone.trim();
        
        // Check if the phone number is valid
        if (!isValidPhoneNumber(phoneInput)) {
          // If not valid, try to determine what's wrong
          if (!phoneInput.startsWith('+')) {
            newErrors.push({
              field: 'phone',
              message: 'Phone number must include country code starting with + (e.g., +44)'
            });
          } else {
            // Try to parse it anyway to get more specific error
            try {
              const parsedNumber = parsePhoneNumber(phoneInput);
              if (!parsedNumber.isValid()) {
                if (parsedNumber.country && !parsedNumber.isPossible()) {
                  newErrors.push({
                    field: 'phone',
                    message: `Invalid phone number length for ${parsedNumber.country}. Please check the number of digits.`
                  });
                } else {
                  newErrors.push({
                    field: 'phone',
                    message: 'Invalid phone number format. Please check the country code and number.'
                  });
                }
              }
            } catch (e) {
              newErrors.push({
                field: 'phone',
                message: 'Invalid phone number format. Please use international format with country code.'
              });
            }
          }
        } else {
          // Valid phone number, but check if it's a possible mobile number
          const parsedNumber = parsePhoneNumber(phoneInput);
          if (parsedNumber.country && !parsedNumber.isPossible()) {
            newErrors.push({
              field: 'phone',
              message: `This appears to be a valid format but may not be a real phone number in ${parsedNumber.country}.`
            });
          }
        }
      } catch (e) {
        newErrors.push({
          field: 'phone',
          message: 'Invalid phone number format. Please use international format with country code.'
        });
      }
    }

    setErrors(newErrors);
    onValidationChange?.(index, newErrors.length === 0, newErrors);
    return newErrors.length === 0;
  };

  // Validate on field change
  useEffect(() => {
    validateFields();
  }, [passenger]);

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
        phone: '+447958370033',
        documentType: 'passport',
        documentNumber: 'AB123456',
        documentIssuingCountryCode: 'GB',
        documentExpiryDate: '2030-12-31',
        documentNationality: 'GB',
        address: {
          addressLine1: '123 Test St',
          city: 'London',
          countryCode: 'GB',
          postalCode: 'SW1A 1AA'
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
    // Clear error for this field when user makes a change
    setErrors(errors.filter(error => error.field !== field));

    // If nationality changes, update the document issuing country to match
    if (field === 'documentNationality' && value) {
      const selectedCountry = countries.find(c => c.name === value);
      if (selectedCountry) {
        onChange(index, 'documentIssuingCountryCode', selectedCountry.code);
      }
    }
    onChange(index, field, value);
  };

  // Get error message for a field
  const getFieldError = (field: string) => {
    const error = errors.find(e => e.field === field);
    return error ? error.message : '';
  };

  // Helper to add error styling
  const getInputClassName = (field: string) => {
    const baseClasses = 'w-full p-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 focus:border-transparent';
    return `${baseClasses} ${getFieldError(field) ? 'border-red-500' : 'border-gray-300'}`;
  };

  const hasValue = (field: keyof PassengerInfo) => {
    const value = passenger[field];
    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  return (
    <div className="mb-8 p-2 rounded-2xl bg-white transition-all duration-300">
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
                className={getInputClassName('title')}
                aria-invalid={!!getFieldError('title')}
              >
                <option value="">Select Title</option>
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
              <div>
                <input
                  type="text"
                  value={passenger.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={getInputClassName('firstName')}
                  placeholder="John"
                  required
                  aria-invalid={!!getFieldError('firstName')}
                />
                {getFieldError('firstName') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('firstName')}</p>
                )}
              </div>
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <div>
                <input
                  type="text"
                  value={passenger.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={getInputClassName('lastName')}
                  placeholder="Doe"
                  required
                  aria-invalid={!!getFieldError('lastName')}
                />
                {getFieldError('lastName') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('lastName')}</p>
                )}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <div>
                <select
                  value={passenger.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className={getInputClassName('gender')}
                  required
                  aria-invalid={!!getFieldError('gender')}
                >
                  <option value="">Select Gender</option>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {getFieldError('gender') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('gender')}</p>
                )}
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <div className="relative">
                <div>
                  <DatePicker
                    selected={passenger.dateOfBirth ? new Date(passenger.dateOfBirth) : null}
                    onChange={(date) => handleInputChange('dateOfBirth', date?.toISOString().split('T')[0] || '')}
                    dateFormat="yyyy-MM-dd"
                    className={`pl-10 ${getInputClassName('dateOfBirth')}`}
                    placeholderText="YYYY-MM-DD"
                    maxDate={new Date()}
                    required
                    aria-invalid={!!getFieldError('dateOfBirth')}
                  />
                  {getFieldError('dateOfBirth') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('dateOfBirth')}</p>
                  )}
                </div>
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Nationality */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nationality</label>
              <div className="relative">
                <div>
                  <select
                    value={passenger.documentNationality}
                    onChange={(e) => handleInputChange('documentNationality', e.target.value)}
                    className={`pr-10 appearance-none ${getInputClassName('documentNationality')}`}
                    required
                    aria-invalid={!!getFieldError('documentNationality')}
                  >
                    <option value="">Select Nationality</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {getFieldError('documentNationality') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('documentNationality')}</p>
                  )}
                </div>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Document Issuing Country */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Document Issuing Country</label>
              <div className="relative">
                <div>
                  <select
                    value={passenger.documentIssuingCountryCode}
                    onChange={(e) => handleInputChange('documentIssuingCountryCode', e.target.value)}
                    className={`pr-10 appearance-none ${getInputClassName('documentIssuingCountryCode')}`}
                    required
                    aria-invalid={!!getFieldError('documentIssuingCountryCode')}
                  >
                    <option value="">Select Issuing Country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {getFieldError('documentIssuingCountryCode') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('documentIssuingCountryCode')}</p>
                  )}
                </div>
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
                  <div>
                    <input
                      type="email"
                      value={passenger.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`pl-10 ${getInputClassName('email')}`}
                      placeholder="your.email@example.com"
                      required
                      aria-invalid={!!getFieldError('email')}
                    />
                    {getFieldError('email') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                    )}
                  </div>
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Phone - Enhanced with libphonenumber-js */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="relative">
                  <div>
                    <div className="flex items-center">
                      <div className="relative flex-grow">
                        <input
                          type="tel"
                          value={passenger.phone}
                          onChange={(e) => {
                            // Format the phone number as the user types
                            const formatter = new AsYouType();
                            const formattedInput = formatter.input(e.target.value);
                            handleInputChange('phone', formattedInput);
                          }}
                          className={`pl-10 pr-10 ${getInputClassName('phone')}`}
                          placeholder="+1 555 123 4567"
                          required
                          aria-invalid={!!getFieldError('phone')}
                        />
                        <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        
                        {/* Show validation status icon */}
                        {passenger.phone && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isValidPhoneNumber(passenger.phone) ? (
                              <FiCheck className="text-green-500" />
                            ) : (
                              <FiX className="text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Show detailed error message */}
                    {getFieldError('phone') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('phone')}</p>
                    )}
                    
                    {/* Show phone number info if valid */}
                    {passenger.phone && isValidPhoneNumber(passenger.phone) && (
                      <div className="mt-1 text-xs text-green-600 flex items-center">
                        {(() => {
                          try {
                            const parsedNumber = parsePhoneNumber(passenger.phone);
                            return (
                              <>
                                <FaFlag className="mr-1" />
                                {parsedNumber.country} · {parsedNumber.getType()} · {parsedNumber.formatInternational()}
                              </>
                            );
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </div>
                    )}
                    
                    {/* Show helpful example */}
                    {getFieldError('phone') && passenger.documentIssuingCountryCode && (
                      <div className="mt-1 text-xs text-gray-500">
                        {(() => {
                          try {
                            // Convert country code to CountryCode type
                            const countryCode = passenger.documentIssuingCountryCode as CountryCode;
                            // Only proceed if it's a valid country code
                            if (countryCode && countryCode.length === 2) {
                              const exampleNumber = getExampleNumber(countryCode, examples);
                              return exampleNumber ? 
                                `Example for ${countryCode}: ${exampleNumber.formatInternational()}` : 
                                `Include country code (e.g., +1 for US, +44 for UK)`;
                            }
                            return "Include country code (e.g., +1 for US, +44 for UK)";
                          } catch (e) {
                            return "Include country code (e.g., +1 for US, +44 for UK)";
                          }
                        })()}
                      </div>
                    )}
                  </div>
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
                  <div>
                    <input
                      type="text"
                      value={passenger.documentNumber}
                      onChange={(e) => handleInputChange('documentNumber', e.target.value)}
                      className={`pl-10 ${getInputClassName('documentNumber')}`}
                      placeholder="Enter passport number"
                      required
                      aria-invalid={!!getFieldError('documentNumber')}
                    />
                    {getFieldError('documentNumber') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('documentNumber')}</p>
                    )}
                  </div>
                  <FaPassport className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Passport Expiry Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Passport Expiry Date</label>
                <div className="relative">
                  <div>
                    <DatePicker
                      selected={passenger.documentExpiryDate ? new Date(passenger.documentExpiryDate) : null}
                      onChange={(date) => handleInputChange('documentExpiryDate', date?.toISOString().split('T')[0] || '')}
                      dateFormat="yyyy-MM-dd"
                      className={`pl-10 ${getInputClassName('documentExpiryDate')}`}
                      placeholderText="YYYY-MM-DD"
                      minDate={new Date()}
                      required
                      aria-invalid={!!getFieldError('documentExpiryDate')}
                    />
                    {getFieldError('documentExpiryDate') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('documentExpiryDate')}</p>
                    )}
                  </div>
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
