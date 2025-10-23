"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiBriefcase,
  FiHome,
  FiCalendar,
  FiUsers,
  FiMapPin,
  FiStar,
} from 'react-icons/fi';

// Import your existing components
import Footer from './components/Footer';
import AnimatedStepCharacter from './components/AnimatedStepCharacter';
import TrustBadges from './components/TrustBadges';
import FAQSection from './components/FAQSection';
import TravelBlogSection from './components/TravelBlogSection';
import { AirportAutocomplete } from './components/AirportAutocomplete';
import Testimonials from './components/Testimonials';
import Button from './components/Button';

// Import custom hooks
import { useSearchForm } from '../hooks/useSearchForm';
import { useAnimatedWord } from '../hooks/useAnimatedWord';

// Import constants
import { SEARCH_TYPES, HERO_ANIMATION } from '../app/constants/search.constants';

// Import utilities
import { getMinDate, getMinReturnDate, formatCabinClass } from './utils/search.utils';

/**
 * AnimatedWord Component
 * Displays rotating words with fade animation
 */
function AnimatedWord() {
  const { currentWord, currentIndex, fade } = useAnimatedWord({
    words: HERO_ANIMATION.WORDS,
    interval: HERO_ANIMATION.INTERVAL,
  });

  return (
    <span
      className="transition-all duration-300 ease-in-out inline-block px-2 py-2 rounded-2xl font-bold"
      style={{
        color: HERO_ANIMATION.COLORS[currentIndex],
        opacity: fade ? 1 : 0,
        transform: fade ? 'translateY(0)' : 'translateY(20px)',
        background: 'linear-gradient(to right, rgba(245, 228, 198, 0.74), rgba(248, 236, 201, 0.56))',
      }}
    >
      {currentWord}
    </span>
  );
}

/**
 * ErrorDisplay Component
 * Shows validation errors
 */
function ErrorDisplay({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {errors.length === 1 ? 'Please fix the following error:' : 'Please fix the following errors:'}
          </h3>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Landing Page Component
 */
export default function LandingPage() {
  const [activeSearchType, setActiveSearchType] = useState<string>(SEARCH_TYPES.ALL);
  const [tripType, setTripType] = useState<'roundtrip' | 'oneway'>('roundtrip');

  const {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleFlightSearch,
    handleHotelSearch,
  } = useSearchForm();

  const onFlightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFlightSearch(tripType);
  };

  const onHotelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleHotelSearch();
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-orange-100/50 to-orange-50 flex flex-col">
      {/* Hero Section */}
      <section className="section-lg p-4 m-0 relative overflow-hidden sm:p-8">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 sm:p-4 p-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          >
            <source src="/images/hero-vid.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="container-slim relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full text-center"
          >
            {/* Hero Content */}
            <div className="flex flex-col items-center">
              <div className="mt-5 sm:p-4 p-0">
                {/* Product Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md border border-indigo-200/50 rounded-full px-8 py-4 shadow-2xl ring-1 ring-white/20"
                >
                  <div className="w-3 h-2 bg-green-500 rounded-full animate-pulse p-0 sm:p-4" />
                  <span className="text-gray-700 font-semibold">SOON • AI-Powered Travel Planning</span>
                  <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">BETA</div>
                </motion.div>

                {/* Hero Title */}
                <h1 className="text-5xl md:text-6xl font-black mb-0 text-gray-800 mt-5 p-4">
                  Your Next
                  <span className="relative h-16 md:h-20 inline-block ml-2 align-middle">
                    <AnimatedWord />
                  </span>
                </h1>

                {/* Key Benefits */}
                <div className="flex flex-wrap justify-center mb-8 gap-4">
                  {[
                    { icon: '⚡', text: 'AI-powered matching', color: 'from-amber-400 to-orange-500' },
                    { icon: '🛡️', text: 'Secure & reliable', color: 'from-emerald-400 to-teal-500' },
                    { icon: '⏱️', text: 'Book in minutes', color: 'from-indigo-400 to-purple-500' },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 + idx * 0.1 }}
                      className="flex items-center gap-3 text-white bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
                    >
                      <span className={`bg-gradient-to-r ${item.color} p-2 rounded-full text-xl`}>
                        {item.icon}
                      </span>
                      <span className="font-semibold">{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Search Section */}
                <div className="mt-0 w-full max-w-2xl mx-auto px-4 sm:px-6">
                  {/* Search Type Selector */}
                  <div className="flex gap-4 sm:gap-10 mb-8 p-3 rounded-full justify-center bg-black/20 backdrop-blur-lg border border-white/10 shadow-2xl mx-8 sm:mx-8">
                    {[
                      { icon: <FiBriefcase className="w-5 h-5" />, label: 'TRIP', type: SEARCH_TYPES.ALL },
                      { icon: <FiArrowRight className="w-5 h-5" />, label: 'FLIGHT', type: SEARCH_TYPES.FLIGHTS },
                      { icon: <FiHome className="w-5 h-5" />, label: 'HOTEL', type: SEARCH_TYPES.HOTELS },
                    ].map((item) => (
                      <motion.button
                        key={item.type}
                        onClick={() => setActiveSearchType(item.type)}
                        className={`flex items-center px-3 sm:px-5 py-2 sm:py-3 rounded-full transition-all ${
                          activeSearchType === item.type
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg ring-2 ring-white/20'
                            : 'text-white/90 bg-white/10 hover:bg-white/20'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {item.icon}
                        <span className="ml-2 font-medium">{item.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Error Display */}
                  <ErrorDisplay errors={errors} />

                  {/* Search Forms */}
                  <motion.div
                    className="rounded-2xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeSearchType === SEARCH_TYPES.ALL && (
                      <Link href="/search" className="block text-center">
                        <Button
                          text="Plan Your Perfect Trip"
                          href="/search"
                          icon={true}
                          noLink={true}
                        />
                        <p className="mt-10 p-4 text-white font-medium tracking-wide backdrop-blur-sm bg-black/10 inline-block rounded-full px-8 shadow-lg">
                          Find the best flight & hotel combinations
                        </p>
                      </Link>
                    )}

                    {activeSearchType === SEARCH_TYPES.FLIGHTS && (
                      <form onSubmit={onFlightSubmit} className="space-y-6">
                        {/* Trip Type Selection */}
                        <div className="flex gap-4 p-1 rounded-lg w-fit mb-2">
                          {(['roundtrip', 'oneway'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              className={`px-4 py-2 rounded-lg transition-all ${
                                tripType === type
                                  ? 'bg-white/100 text-black font-medium border border-white/30'
                                  : 'bg-white/10 text-white/100 border border-white/10 hover:bg-white/15'
                              }`}
                              onClick={() => setTripType(type)}
                            >
                              {type === 'roundtrip' ? 'Round Trip' : 'One Way'}
                            </button>
                          ))}
                        </div>

                        {/* Flight Search Fields */}
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Origin */}
                            <div className="col-span-2 md:col-span-1">
                              <label className="block text-md font-bold text-white mb-1">From</label>
                              <div className="relative z-10">
                                <AirportAutocomplete
                                  value={formData.origin}
                                  onChange={(value) => handleInputChange('origin', value)}
                                  label="Origin"
                                  required
                                />
                              </div>
                            </div>

                            {/* Destination */}
                            <div className="col-span-2 md:col-span-1">
                              <label className="block text-md font-bold text-white mb-1">To</label>
                              <div className="relative z-10">
                                <AirportAutocomplete
                                  value={formData.destination}
                                  onChange={(value) => handleInputChange('destination', value)}
                                  label="Destination"
                                  required
                                />
                              </div>
                            </div>

                            {/* Departure Date */}
                            <div>
                              <label className="block text-md font-bold text-white mb-1">Departure</label>
                              <div className="relative">
                                <input
                                  type="date"
                                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                  value={formData.departureDate}
                                  onChange={(e) => handleInputChange('departureDate', e.target.value)}
                                  min={getMinDate()}
                                  required
                                />
                                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              </div>
                            </div>

                            {/* Return Date */}
                            {tripType === 'roundtrip' && (
                              <div>
                                <label className="block text-md font-bold text-white mb-1">Return</label>
                                <div className="relative">
                                  <input
                                    type="date"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    value={formData.returnDate}
                                    onChange={(e) => handleInputChange('returnDate', e.target.value)}
                                    min={getMinReturnDate(formData.departureDate)}
                                    required
                                  />
                                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Passengers and Class */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-1">
                              <label className="block text-md font-bold text-white mb-1">Passengers</label>
                              <div className="relative">
                                <select
                                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
                                  value={formData.travelers}
                                  onChange={(e) => handleInputChange('travelers', parseInt(e.target.value))}
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <option key={num} value={num}>
                                      {num} {num === 1 ? 'passenger' : 'passengers'}
                                    </option>
                                  ))}
                                </select>
                                <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              </div>
                            </div>

                            <div className="col-span-2 md:col-span-1">
                              <label className="block text-md font-bold text-white mb-1">Class</label>
                              <div className="relative">
                                <select
                                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
                                  value={formData.cabinClass}
                                  onChange={(e) => handleInputChange('cabinClass', e.target.value)}
                                >
                                  <option value="economy">Economy</option>
                                  <option value="premium_economy">Premium Economy</option>
                                  <option value="business">Business</option>
                                  <option value="first">First Class</option>
                                </select>
                                <FiStar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              </div>
                            </div>
                          </div>

                          {/* Submit Button */}
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg shadow-xl hover:shadow-2xl hover:from-amber-400 hover:to-orange-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Searching...' : 'Search Flights'}
                            <FiArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </form>
                    )}

                    {activeSearchType === SEARCH_TYPES.HOTELS && (
                      <form onSubmit={onHotelSubmit} className="space-y-6">
                        {/* Hotel Search Fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Destination */}
                          <div className="col-span-2">
                            <label className="block text-md font-bold text-white mb-1">Destination</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="City or hotel name"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                value={formData.destination?.city || ''}
                                onChange={(e) => handleInputChange('destination', { city: e.target.value } as any)}
                                required
                              />
                              <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </div>

                          {/* Check-in Date */}
                          <div>
                            <label className="block text-md font-bold text-white mb-1">Check-in</label>
                            <div className="relative">
                              <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                value={formData.departureDate}
                                onChange={(e) => handleInputChange('departureDate', e.target.value)}
                                min={getMinDate()}
                                required
                              />
                              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </div>

                          {/* Check-out Date */}
                          <div>
                            <label className="block text-md font-bold text-white mb-1">Check-out</label>
                            <div className="relative">
                              <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                value={formData.returnDate}
                                onChange={(e) => handleInputChange('returnDate', e.target.value)}
                                min={getMinReturnDate(formData.departureDate)}
                                required
                              />
                              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        {/* Rooms, Guests, and Room Type */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-1">
                            <label className="block text-md font-bold text-white mb-1">Rooms</label>
                            <select
                              className="w-full pl-4 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
                              value={formData.roomCount}
                              onChange={(e) => handleInputChange('roomCount', parseInt(e.target.value))}
                            >
                              {[1, 2, 3, 4, 5].map((num) => (
                                <option key={num} value={num}>
                                  {num} {num === 1 ? 'room' : 'rooms'}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-1">
                            <label className="block text-md font-bold text-white mb-1">Guests</label>
                            <select
                              className="w-full pl-4 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
                              value={formData.guestCount}
                              onChange={(e) => handleInputChange('guestCount', parseInt(e.target.value))}
                            >
                              {[1, 2, 3, 4, 5, 6].map((num) => (
                                <option key={num} value={num}>
                                  {num} {num === 1 ? 'guest' : 'guests'}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-md font-bold text-white mb-1">Room Type</label>
                            <select
                              className="w-full pl-4 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
                              value={formData.roomType}
                              onChange={(e) => handleInputChange('roomType', e.target.value)}
                            >
                              <option value="any">Any Type</option>
                              <option value="standard">Standard</option>
                              <option value="deluxe">Deluxe</option>
                              <option value="suite">Suite</option>
                              <option value="family_room">Family Room</option>
                              <option value="villa">Villa</option>
                            </select>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg shadow-xl hover:shadow-2xl hover:from-amber-400 hover:to-orange-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Searching...' : 'Search Hotels'}
                          <FiArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </form>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Remaining sections - keeping your existing ones */}
      <Testimonials />
      <FAQSection />
      <TravelBlogSection />
      <Footer />
    </div>
  );
}