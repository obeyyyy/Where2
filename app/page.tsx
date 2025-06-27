"use client";

import React, { useState, useEffect } from 'react';
import Footer from './components/Footer';
import { 
  FiArrowRight, 
  FiArrowLeft, 
  FiCalendar, 
  FiUsers,
  FiMapPin,
  FiDollarSign,
  FiGlobe,
  FiFilter,
  FiSearch,
  FiRefreshCw,
  FiCheckCircle,
  FiBriefcase,
  FiHome,
  FiShield,
  FiZap,
  FiClock,
  FiSmartphone
} from 'react-icons/fi';
import { motion } from "framer-motion";
import AnimatedStepCharacter from "./components/AnimatedStepCharacter";
import TrustBadges from "./components/TrustBadges";
import FAQSection from "./components/FAQSection";
import TravelBlogSection from "./components/TravelBlogSection";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { FeatureCard } from './components/FeatureCard';
import { AirportAutocomplete, type AirportOption } from './components/AirportAutocomplete';

// AnimatedWord component for hero title
function AnimatedWord({ words, colors, interval = 2000 }: { words: string[]; colors: string[]; interval?: number }) {
  const [index, setIndex] = useState<number>(0);
  const [fade, setFade] = useState<boolean>(true);

  useEffect(() => {
    const fadeOut = setTimeout(() => setFade(false), interval - 300);
    const timer = setTimeout(() => {
      setIndex((prev: number) => (prev + 1) % words.length);
      setFade(true);
    }, interval);
    return () => {
      clearTimeout(timer);
      clearTimeout(fadeOut);
    };
  }, [index, interval, words.length]);

  return (
    <span
      className={`transition-all duration-300 ease-in-out inline-block px-2 rounded font-bold`}
      style={{
        color: colors[index],
        opacity: fade ? 1 : 0,
        transform: fade ? 'translateY(0)' : 'translateY(20px)',
        background: 'linear-gradient(to right, #fff7e6, #fffbe6)',
      }}
    >
      {words[index]}
    </span>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [activeSearchType, setActiveSearchType] = useState('all');
  const [tripType, setTripType] = useState('Round Trip');
  
  // Form state
  const [formData, setFormData] = useState({
    origin: null as AirportOption | null,
    destination: null as AirportOption | null,
    departureDate: '',
    returnDate: '',
    travelers: 1,
    roomCount: 1,
    guestCount: 1,
    roomType: 'any',
    cabinClass: 'economy'
  });

  const handleFlightSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Skip if required fields are missing
    if (!formData.origin?.iata || !formData.destination?.iata || !formData.departureDate) {
      return;
    }

    // Prepare search parameters
    const searchParams = new URLSearchParams({
      origin: formData.origin.iata,
      destination: formData.destination.iata,
      departureDate: formData.departureDate,
      returnDate: tripType === 'Round Trip' ? formData.returnDate : '',
      tripType: tripType.toLowerCase().replace(' ', '') as 'roundtrip' | 'oneway',
      travelers: formData.travelers.toString(),
      currency: 'USD',
      budget: '1000',
      includeHotels: 'false',
      useDuffel: 'true',
      nights: '7' // Add nights parameter
    });

    // Log search parameters for debugging
    console.log('Search parameters:', Object.fromEntries(searchParams.entries()));

    router.push(`/search?${searchParams.toString()}`);
  };

  const handleHotelSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement hotel search route when ready
    router.push(`/hotels/search?destination=${formData.destination}&checkIn=${formData.departureDate}&checkOut=${formData.returnDate}&rooms=${formData.roomCount}&guests=${formData.guestCount}&type=${formData.roomType}`);
  };

  const handleInputChange = (field: string, value: string | number | AirportOption | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Testimonials data
  const testimonials = [
    {
      name: "Sarah M.",
      text: "Where2 made planning my last vacation so easy and affordable! I loved booking my flight and hotel together.",
      country: "🇫🇷 France"
    },
    {
      name: "James K.",
      text: "Best value for money and the smoothest booking process I've tried. Highly recommend!",
      country: "🇬🇧 UK"
    },
    {
      name: "Ana R.",
      text: "I saved over $200 on my trip by bundling my flight and hotel. The site is beautiful and simple to use!",
      country: "🇪🇸 Spain"
    },
  ];

  // Simple carousel state (auto-rotate)
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Animation variants
  const widgetVariants = {
    offscreen: { opacity: 0, y: 40 },
    onscreen: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.3, duration: 0.8 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl w-full text-center"
        >
          {/* Enhanced Hero Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-8">
              <h1 className="text-4xl md:text-6xl font-black mb-4 text-gray-800">
                Your Next
                <span className="relative h-16 md:h-20 inline-block ml-2 align-middle">
                  {/* Animated word will be rendered here */}
                  <AnimatedWord words={["Trip", "Getaway", "Escape", "Journey"]} colors={["#FF8C00", "#FFA500", "#FF6B35", "#FF8C00"]} interval={2000} />
                </span>
                <br className="md:hidden" /> Awaits
              </h1>
              {/* Hero Search Section */}
              <div className="mt-8 w-full max-w-4xl mx-auto">
                {/* Search Type Selector */}
                <div className="flex gap-2 mb-6 p-1 rounded-full justify-center">
                  {[
                    { icon: <FiBriefcase className="w-5 h-5" />, label: 'All-in-One Trip', type: 'all' },
                    { icon: <FiArrowRight className="w-5 h-5" />, label: 'Flight Only', type: 'flights' },
                    { icon: <FiHome className="w-5 h-5" />, label: 'Hotel Only', type: 'hotels' }
                  ].map((item) => (
                    <motion.button
                      key={item.type}
                      onClick={() => setActiveSearchType(item.type)}
                      className={`flex items-center px-4 py-2 rounded-full transition-all ${activeSearchType === item.type 
                        ? 'bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white shadow-md' 
                        : 'text-gray-600 hover:bg-orange-50'}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {item.icon}
                      <span className="ml-2 font-medium">{item.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Search Forms */}
                <motion.div 
                  className=" rounded-2xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeSearchType === 'all' ? (
                    <Link href="/search" className="block text-center py-4">
                      <motion.button
                        className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#FF8C00] to-[#FFA500] text-white shadow-lg text-xl font-bold rounded-full group"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Plan Your Perfect Trip
                        <FiArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </motion.button>
                      <p className="mt-4 text-gray-600">Find the best flight + hotel combinations</p>
                    </Link>
                  ) : activeSearchType === 'flights' ? (
                    <div className="space-y-6">
                      {/* Trip Type Selection */}
                      <div className="flex gap-4 p-1 rounded-lg w-fit">
                        {['Round Trip', 'One Way'].map((type) => (
                          <button
                            key={type}
                            className={`px-4 py-2 rounded-lg transition-all ${tripType === type 
                              ? 'text-orange-500 font-medium' 
                              : 'text-gray-600 hover:bg-white/50'}`}
                            onClick={() => setTripType(type)}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      {/* Flight Search Fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                          <div className="relative z-20">
                            <AirportAutocomplete
                              value={formData.origin}
                              onChange={(value) => handleInputChange('origin', value)}
                              label="Origin"
                              required
                            />
                          </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                          <div className="relative z-10">
                            <AirportAutocomplete
                              value={formData.destination}
                              onChange={(value) => handleInputChange('destination', value)}
                              label="Destination"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Departure</label>
                          <div className="relative">
                            <input 
                              type="date" 
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              value={formData.departureDate}
                              onChange={(e) => handleInputChange('departureDate', e.target.value)}
                              required
                            />
                            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>
                        </div>
                        {tripType === 'Round Trip' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Return</label>
                            <div className="relative">
                              <input 
                                type="date" 
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                value={formData.returnDate}
                                onChange={(e) => handleInputChange('returnDate', e.target.value)}
                              />
                              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Passenger Selection */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
                          <select 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                            value={formData.travelers}
                            onChange={(e) => handleInputChange('travelers', parseInt(e.target.value))}
                          >
                            {[1,2,3,4,5,6].map(num => (
                              <option key={num} value={num}>{num} {num === 1 ? 'passenger' : 'passengers'}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                          <select 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                            value={formData.cabinClass}
                            onChange={(e) => handleInputChange('cabinClass', e.target.value)}
                          >
                            {['Economy', 'Premium Economy', 'Business', 'First'].map(cls => (
                              <option key={cls} value={cls.toLowerCase()}>{cls}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        onClick={handleFlightSearch}
                        className="w-full py-3 bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-shadow group disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!formData.origin?.iata || !formData.destination?.iata || !formData.departureDate}
                      >
                        Search Flights <FiArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Hotel Search Fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="City or hotel name"
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                            <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                          <div className="relative">
                            <input 
                              type="date" 
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                          <div className="relative">
                            <input 
                              type="date" 
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>
                        </div>
                      </div>

                      {/* Room and Guest Selection */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rooms</label>
                          <select className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none">
                            {[1,2,3,4].map(num => (
                              <option key={num} value={num}>{num} {num === 1 ? 'room' : 'rooms'}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                          <select className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none">
                            {[1,2,3,4,5,6].map(num => (
                              <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                          <select className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none">
                            {['Any Type', 'Standard', 'Deluxe', 'Suite', 'Family Room', 'Villa'].map(type => (
                              <option key={type} value={type.toLowerCase()}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button 
                        onClick={handleHotelSearch}
                        className="w-full py-3 bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-shadow group"
                      >
                        Search Hotels <FiArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
            <p className="max-w-2xl text-xl md:text-2xl text-gray-700 mb-10 font-medium mx-auto">
              Find and book the perfect <span className="text-[#FF8C00] font-semibold">flights</span> & <span className="text-[#FFA500] font-semibold">hotels</span> All in one place.
              Save up to <span className="font-bold text-[#FF6B35]">40% and Time</span> when you bundle your travel essentials.<br className="hidden md:inline" />
              <span className="inline-block mt-3 text-lg md:text-xl font-semibold bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
                Where will you go next?
              </span>
            </p>

          </div>
          
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-8 text-center">
          <span className="block bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
            How It Works
          </span>
        </h2>
          
          {/* How it works section - horizontal scroll animation */}
          <motion.div
            className="mb-24 max-w-4xl mx-auto flex flex-col items-center relative px-4"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1 }}
          >
           
            <div className="flex flex-col gap-16 w-full">
              {/* Step 1 */}
              <motion.div
                className="flex flex-col md:flex-row items-center gap-8 group"
                initial={{ opacity: 0, x: -100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7 }}
              >
                <div className="relative flex flex-col items-center">
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FF8C00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold border-2 border-white z-10">1</span>
                  <AnimatedStepCharacter lottieUrl="https://lottie.host/729a30a8-1262-4232-8d66-4e87208ef457/I7JbwosoaA.json" alt="Set Your Budget Character" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <span className="font-semibold text-2xl text-[#FF8C00]">Set Your Budget</span>
                  <p className="text-gray-600 mt-2 text-lg">Tell us your total trip budget. We'll instantly filter the best packages for you—no surprises.</p>
                </div>
              </motion.div>
              {/* Step 2 */}
              <motion.div
                className="flex flex-col md:flex-row-reverse items-center gap-8 group"
                initial={{ opacity: 0, x: 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, delay: 0.15 }}
              >
                <div className="relative flex flex-col items-center">
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FFA500] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold border-2 border-white z-10">2</span>
                  <AnimatedStepCharacter lottieUrl="https://lottie.host/a64ed254-83f8-47ad-9514-0b5209327090/8I3AoRgYZE.json" alt="Pick Your Destination Character" />
                </div>
                <div className="flex-1 text-center md:text-right">
                  <span className="font-semibold text-2xl text-[#FFA500]">Pick Your Destination</span>
                  <p className="text-gray-600 mt-2 text-lg">Explore a world of possibilities—just pick a city or country and let us do the rest.</p>
                </div>
              </motion.div>
              {/* Step 3 */}
              <motion.div
                className="flex flex-col md:flex-row items-center gap-8 group"
                initial={{ opacity: 0, x: -100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <div className="relative flex flex-col items-center">
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FF8C00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold border-2 border-white z-10">3</span>
                  <AnimatedStepCharacter lottieUrl="https://lottie.host/989cdfb3-3cc9-4dcc-b046-0b7a763fbe8f/RU2HndI7KD.json" alt="Choose Your Dates Character" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <span className="font-semibold text-2xl text-[#FF8C00]">Choose Your Dates</span>
                  <p className="text-gray-600 mt-2 text-lg">Tell us when you want to travel. We'll match you with the best deals for your schedule.</p>
                </div>
              </motion.div>
              {/* Step 4 */}
              <motion.div
                className="flex flex-col md:flex-row-reverse items-center gap-8 group"
                initial={{ opacity: 0, x: 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, delay: 0.45 }}
              >
                <div className="relative flex flex-col items-center">
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FFA500] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold border-2 border-white z-10">4</span>
                  <AnimatedStepCharacter lottieUrl="https://lottie.host/debd1f55-4862-4559-8829-9daa93e1c9b7/L1e1WecQV3.json" alt="Select Hotel & Flight Character" />
                </div>
                <div className="flex-1 text-center md:text-right">
                  <span className="font-semibold text-2xl text-[#FFA500]">Select Hotel & Flight</span>
                  <p className="text-gray-600 mt-2 text-lg">Hand-pick your favorite hotels and flights—mix, match, and create your perfect trip.</p>
                </div>
              </motion.div>
              {/* Step 5 */}
              <motion.div
                className="flex flex-col md:flex-row items-center gap-8 group"
                initial={{ opacity: 0, x: -100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, delay: 0.6 }}
              > 
                <div className="relative flex flex-col items-center">
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FF8C00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold border-2 border-white z-10">5</span>
                  <AnimatedStepCharacter lottieUrl="https://lottie.host/ebde747a-6ed6-4502-8b16-e0e272dda9d4/1Ech6zWI4Z.json" alt="Review & Book Character" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <span className="font-semibold text-2xl text-[#FF8C00]">Review & Book</span>
                  <p className="text-gray-600 mt-2 text-lg">Double-check your package details. When you're ready, book everything in one click—secure and simple.</p>
                </div>
              </motion.div>
              {/* Step 6 */}
              <motion.div
                className="flex flex-col md:flex-row-reverse items-center gap-8 group"
                initial={{ opacity: 0, x: 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, delay: 0.75 }}
              > 
                <div className="relative flex flex-col items-center">
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FFA500] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold border-2 border-white z-10">6</span>
                  <AnimatedStepCharacter lottieUrl="https://lottie.host/c6ab46c7-8573-409d-85b8-093b284087ee/cU0hmmGLXq.json" alt="Get Instant Confirmation Character" />
                </div>
                <div className="flex-1 text-center md:text-right">
                  <span className="font-semibold text-2xl text-[#FFA500]">Get Instant Confirmation</span>
                  <p className="text-gray-600 mt-2 text-lg">Your booking is confirmed instantly—no waiting, no stress. Start packing!</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Mobile Experience Section */}
          <section className="py-5">
            <div className="max-w-7xl mx-auto">
              <div className="text-center">
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mt-5">
                <span className="block bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent py-1">
                  Seamless Mobile Experience
                </span>
              </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Book and manage trips effortlessly from your phone
                </p>
              </div>
              
              <div className="flex w-full px-4 flex-col lg:flex-row items-center justify-center gap-5">
                {/* Phone Mockup Carousel */}
                <div className="relative w-72 md:w-96 h-[400px] md:h-[500px] overflow-hidden rounded-[30px] md:rounded-[50px] ">
                  <div className="absolute inset-0 flex animate-[slide_30s_linear_infinite] w-[400%]">
                    {[
                      './images/mock33-left.png',
                      './images/mock4-left.png',
                      './images/mock3-left.png',
                      './images/mokc5-left.png',
                      './images/mock2-left.png'
                    ].map((src, index) => (
                      <div key={index} className="flex-shrink-0 w-1/4 h-full px-1 md:px-2 transition-transform duration-300 hover:scale-105">
                        <img 
                          src={src}
                          alt={`Mobile screen ${index + 1}`}
                          className="w-full h-auto rounded-lg md:rounded-xl object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Features */}
                <div className="max-w-lg mb-20">
                  <ul className="space-y-5">
                    {[
                      {icon: <FiCheckCircle className="text-orange-500 text-xl" />, text: "Mobile-first booking flow – optimized for phones and tablets"},
                      {icon: <FiClock className="text-orange-500 text-xl" />, text: "View your itinerary and passenger details at any time"},
                      {icon: <FiCalendar className="text-orange-500 text-xl" />, text: "Secure payment and instant booking confirmation"},
                      {icon: <FiSmartphone className="text-orange-500 text-xl" />, text: "Retrieve bookings with your reference number"},
                      
                    ].map((item, i) => (
                      <motion.li 
                        key={i} 
                        className="flex items-start gap-4 p-3 bg-white/50 backdrop-blur-sm rounded-xl shadow-sm"
                        whileHover={{ scale: 1.02 }}
                      >
                        <span className="mt-0.5">{item.icon}</span>
                        <span className="text-gray-800 font-medium">{item.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Widgets */}
          <div className="w-full px-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-10 text-center">
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mt-5">
                <span className="block bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent py-1">
                  Why Choose Where2?
                </span>
              </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-5">
                  Our unique features make travel planning effortless and enjoyable
                </p>
              </div>
              
              <div className="space-y-8 mb-10">
                <FeatureCard
                  title="Best Value Packages"
                  description="Save up to 40% with our Duffel API-powered flight deals and hotel bundles"
                  features={[
                    "Duffel API integration for real-time pricing",
                    "Smart hotel pairing algorithm",
                    "Price match guarantee",
                    "No hidden fees"
                  ]}
                  icon={FiDollarSign}
                />
                <FeatureCard
                  title="Secure Payments"
                  description="Stripe-powered checkout with bank-level encryption and fraud protection"
                  features={[
                    "PCI compliant payments",
                    "Instant booking confirmation",
                    "Free cancellation and refund options",
                    "24/7 customer support"
                  ]}
                  icon={FiShield}
                />
                <FeatureCard
                  title="Smart Filters"
                  description="We automatically find the best combination of price and flight duration"
                  features={[
                    "Best value trips",
                    "Price/duration optimization",
                    "Layover minimization",
                    "Airline quality ratings"
                  ]}
                  icon={FiZap}
                />
              </div>
            </div>
          </div>

            {/* Testimonials Section */}
            <div className="w-full bg-gradient-to-b from-gray-50 to-white py-16">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl text-center mb-12">
                  <span className="block bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
                    What Our Travelers Say
                  </span>
                </h2>
                
                <motion.div
                  className="max-w-4xl mx-auto"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7 }}
                >
                  <div className="relative">
                    <motion.div
                      key={currentTestimonial}
                      className="bg-white rounded-2xl shadow-lg p-8 md:p-10"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      {/* Quote Icon */}
                      <div className="absolute -top-4 left-8 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                        </svg>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1 mb-6">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>

                      {/* Testimonial Content */}
                      <p className="text-xl text-gray-700 leading-relaxed mb-8">"{testimonials[currentTestimonial].text}"</p>
                      
                      {/* Author Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                          {testimonials[currentTestimonial].name[0]}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{testimonials[currentTestimonial].name}</h4>
                          <p className="text-gray-500 flex items-center gap-1">
                            <span>{testimonials[currentTestimonial].country}</span>
                            <span className="text-orange-500">✈</span>
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Navigation Dots */}
                    <div className="flex justify-center gap-3 mt-8">
                      {testimonials.map((_, idx) => (
                        <button
                          key={idx}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            idx === currentTestimonial 
                              ? 'bg-orange-500 scale-110' 
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                          onClick={() => setCurrentTestimonial(idx)}
                          aria-label={`Show testimonial ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Call to Action */}
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <Link href="/search" legacyBehavior>
                <a className="inline-flex items-center px-10 py-5 bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white text-xl font-bold rounded-full shadow-lg hover:scale-105 transition-transform">
                  Book Your Package Now <FiArrowRight className="ml-3 w-7 h-7" />
                </a>
              </Link>
            </motion.div>
                      {/* Trust Badges */}
                      <TrustBadges />
                      {/* FAQ Section */}
                      <FAQSection />
                      {/* Travel Blog Section */}
                      <TravelBlogSection />
                    </motion.div>
                  </main>
                  {/* Footer */}
                  <Footer/>
                </div>
              );
            }
