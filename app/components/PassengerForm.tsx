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
    
    // Check required fields
    baseRequiredFields.forEach(({ field, label }) => {
      if (!passenger[field]) {
        newErrors.push({
          field,
          message: `${label} is required`
        });
      }
    });
    
    // Email validation
    if (passenger.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passenger.email)) {
      newErrors.push({
        field: 'email',
        message: 'Please enter a valid email address'
      });
    }
    
    // Phone validation
    if (passenger.phone) {
      try {
        const phoneNumber = parsePhoneNumber(passenger.phone);
        if (!phoneNumber.isValid()) {
          newErrors.push({
            field: 'phone',
            message: 'Please enter a valid phone number'
          });
        }
      } catch (e) {
        newErrors.push({
          field: 'phone',
          message: 'Please enter a valid phone number'
        });
      }
    }
    
    // Date of birth validation
    if (passenger.dateOfBirth) {
      const dob = new Date(passenger.dateOfBirth);
      const today = new Date();
      
      if (dob > today) {
        newErrors.push({
          field: 'dateOfBirth',
          message: 'Date of birth cannot be in the future'
        });
      }
      
      // Age validation based on passenger type
      const ageInYears = (today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
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
      const expiry = new Date(passenger.documentExpiryDate);
      const today = new Date();
      
      if (expiry < today) {
        newErrors.push({
          field: 'documentExpiryDate',
          message: 'Document has expired'
        });
      }
    }
    
    setErrors(newErrors);
    
    // Notify parent of validation status
    if (onValidationChange) {
      onValidationChange(index, newErrors.length === 0, newErrors);
    }
    
    return newErrors.length === 0;
  };
  
  // Validate on mount and when passenger data changes
  useEffect(() => {
    validateFields();
  }, [passenger]);
  
  // Handle field changes
  const handleChange = (field: keyof PassengerInfo, value: any) => {
    onChange(index, field, value);
  };
  
  // Handle nested address field changes
  const handleAddressChange = (field: keyof PassengerInfo['address'], value: string) => {
    const updatedAddress = { ...passenger.address, [field]: value };
    handleChange('address', updatedAddress);
  };
  
  // Get error message for a field
  const getErrorMessage = (field: string): string => {
    const error = errors.find(e => e.field === field);
    return error ? error.message : '';
  };
  
  // Check if a field has an error
  const hasError = (field: string): boolean => {
    return errors.some(e => e.field === field);
  };
  
  return (
    <div className="space-y-6">
      {/* Personal Information Section */}
      <div>
        <h4 className="text-orange-800 font-medium mb-4">Personal Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Title</label>
            <select
              value={passenger.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('title') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
            >
              <option value="">Select title</option>
              {titleOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {hasError('title') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('title')}</p>
            )}
          </div>
          
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Gender</label>
            <select
              value={passenger.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('gender') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
            >
              <option value="">Select gender</option>
              <option value="m">Male</option>
              <option value="f">Female</option>
              <option value="x">Other</option>
            </select>
            {hasError('gender') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('gender')}</p>
            )}
          </div>
          
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">First Name</label>
            <input
              type="text"
              value={passenger.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('firstName') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
              placeholder="Enter first name"
            />
            {hasError('firstName') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('firstName')}</p>
            )}
          </div>
          
          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Last Name</label>
            <input
              type="text"
              value={passenger.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('lastName') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
              placeholder="Enter last name"
            />
            {hasError('lastName') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('lastName')}</p>
            )}
          </div>
          
          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={passenger.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('dateOfBirth') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
            />
            {hasError('dateOfBirth') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('dateOfBirth')}</p>
            )}
          </div>
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="text-orange-500" />
              </div>
              <input
                type="email"
                value={passenger.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  hasError('email') 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-orange-200 bg-white'
                }`}
                placeholder="email@example.com"
              />
            </div>
            {hasError('email') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('email')}</p>
            )}
          </div>
          
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Phone</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiPhone className="text-orange-500" />
              </div>
              <input
                type="tel"
                value={passenger.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  hasError('phone') 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-orange-200 bg-white'
                }`}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            {hasError('phone') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('phone')}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Travel Document Section */}
      <div className="pt-4 border-t border-orange-100">
        <h4 className="text-orange-800 font-medium mb-4">Travel Document</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Document Type</label>
            <select
              value={passenger.documentType}
              onChange={(e) => handleChange('documentType', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('documentType') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
            >
              <option value="">Select document type</option>
              <option value="passport">Passport</option>
              <option value="passport_card">Passport Card</option>
              <option value="national_identity_card">National ID Card</option>
              <option value="driving_licence">Driving License</option>
              <option value="other">Other</option>
            </select>
            {hasError('documentType') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('documentType')}</p>
            )}
          </div>
          
          {/* Document Number */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Document Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaPassport className="text-orange-500" />
              </div>
              <input
                type="text"
                value={passenger.documentNumber}
                onChange={(e) => handleChange('documentNumber', e.target.value)}
                className={`w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  hasError('documentNumber') 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-orange-200 bg-white'
                }`}
                placeholder="Enter document number"
              />
            </div>
            {hasError('documentNumber') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('documentNumber')}</p>
            )}
          </div>
          
          {/* Document Issuing Country */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Issuing Country</label>
            <select
              value={passenger.documentIssuingCountryCode}
              onChange={(e) => handleChange('documentIssuingCountryCode', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('documentIssuingCountryCode') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
            >
              <option value="">Select country</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
            {hasError('documentIssuingCountryCode') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('documentIssuingCountryCode')}</p>
            )}
          </div>
          
          {/* Document Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Expiry Date</label>
            <input
              type="date"
              value={passenger.documentExpiryDate}
              onChange={(e) => handleChange('documentExpiryDate', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('documentExpiryDate') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
            />
            {hasError('documentExpiryDate') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('documentExpiryDate')}</p>
            )}
          </div>
          
          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">Nationality</label>
            <select
              value={passenger.documentNationality}
              onChange={(e) => handleChange('documentNationality', e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                hasError('documentNationality') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-orange-200 bg-white'
              }`}
            >
              <option value="">Select nationality</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
            {hasError('documentNationality') && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage('documentNationality')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassengerForm;
