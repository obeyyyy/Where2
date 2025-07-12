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
  FiStar,
  FiClock,
  FiSmartphone,
  FiThumbsUp,
  FiBell,
  FiHeadphones,
  FiMap
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
import Testimonials from './components/Testimonials';
import Button from './components/Button';
import Where2Button from './components/Button';

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
      className={`transition-all duration-300 ease-in-out inline-block px-2 py-2 rounded font-bold`}
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
    // Use the correct API endpoint
    router.push(`/hotel?destination=${formData.destination}&checkIn=${formData.departureDate}&checkOut=${formData.returnDate}&rooms=${formData.roomCount}&guests=${formData.guestCount}&type=${formData.roomType}`);
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
    <div className="w-full min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col mb-8 overflow-hidden">
  
      {/* Hero Section */}
      <section className="section-lg p-4 m-0 relative overflow-hidden sm:p-8 p-4"> {/* Enhanced hero section */}
        {/* Video with overlay gradient */}
        <div className="absolute inset-0 z-0 sm:p-4 p-0">
          <video autoPlay loop muted className="absolute inset-0 w-full h-full object-cover">
            <source src="/images/hero-vid.mp4" type="video/mp4" />
          </video>
          
        </div>
  
        <div className="container-slim relative z-10"> {/* Content above video */}
  
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full text-center"
          >
  
            {/* Enhanced Hero Section */}
            <div className="flex flex-col items-center">
              <div className="mt-5 sm:p-4 p-0">
                {/* Product Badge - Enhanced */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md border border-indigo-200/50 rounded-full px-8 py-4 shadow-2xl ring-1 ring-white/20"
                >
                  <div className="w-3 h-2 bg-green-500 rounded-full animate-pulse p-0 sm:p-4" />
                  <span className="text-gray-700 font-semibold">Now Live • AI-Powered Travel Planning</span>
                  <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">BETA</div>
                </motion.div>
                <h1 className="text-5xl md:text-6xl font-black mb-0 text-gray-800 mt-5 p-4 ">
                  Your Next
                  <span className="relative h-16 md:h-20 inline-block ml-2 align-middle">
                    {/* Animated word will be rendered here */}
                    <AnimatedWord words={["Trip....", "Getaway", "Escape", "Journey"]} colors={["#FF8C00", "#FFA500", "#FF6B35", "#FF8C00"]} interval={2500} />
                  </span>
                </h1>
                {/* Key Benefits - Enhanced */}
                <div className="flex flex-wrap justify-center mb-8 gap-4">
                  {[
                    { icon: <FiZap className="w-5 h-5" />, text: "AI-powered matching", color: "from-amber-400 to-orange-500" },
                    { icon: <FiShield className="w-5 h-5" />, text: "Secure & reliable", color: "from-emerald-400 to-teal-500" },
                    { icon: <FiClock className="w-5 h-5" />, text: "Book in minutes", color: "from-indigo-400 to-purple-500" },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 + idx * 0.1 }}
                      className="flex items-center gap-3 text-white bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
                    >
                      <span className={`bg-gradient-to-r ${item.color} p-2 rounded-full`}>{item.icon}</span>
                      <span className="font-semibold">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
  
                {/* Hero Search Section */}
                <div className="mt-0 w-full max-w-4xl mx-auto">
                  {/* Search Type Selector - Enhanced */}
                  <div className="flex gap-3 mb-8 p-2 rounded-full justify-center bg-black/20 backdrop-blur-lg border border-white/10 shadow-2xl">
                    {[
                      { icon: <FiBriefcase className="w-5 h-5" />, label: 'All-in-One Trip', type: 'all' },
                      { icon: <FiArrowRight className="w-5 h-5" />, label: 'Flight Only', type: 'flights' },
                      { icon: <FiHome className="w-5 h-5" />, label: 'Hotel Only', type: 'hotels' }
                    ].map((item) => (
                      <motion.button
                        key={item.type}
                        onClick={() => setActiveSearchType(item.type)}
                        className={`flex items-center px-5 py-3 rounded-full transition-all ${activeSearchType === item.type
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg ring-2 ring-white/20'
                          : 'text-white/90 bg-white/10 hover:bg-white/20'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {item.icon}
                        <span className="ml-2 font-medium">{item.label}</span>
                      </motion.button>
                    ))}
                  </div>
  
                  {/* Search Forms */}
                  <motion.div
                    className=" rounded-2xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeSearchType === 'all' ? (
                      <Link href="/search" className="block text-center">
                        <Button
                          text="Plan Your Perfect Trip"
                          href="/search"
                          icon={true}
                        />
                        <p className="mt-20 p-4 text-white font-medium tracking-wide backdrop-blur-sm bg-black/10 inline-block rounded-full px-8 shadow-lg">Find the best flight & hotel combinations</p>
                      </Link>
                    ) : activeSearchType === 'flights' ? (
                      <div className="space-y-6">
                        {/* Trip Type Selection */}
                        <div className="flex gap-4 p-1 rounded-lg w-fit mb-2">
                          {['Round Trip', 'One Way'].map((type) => (
                            <button
                              key={type}
                              className={`px-4 py-2 rounded-lg transition-all ${tripType === type
                                ? 'bg-white/100 text-black font-medium border border-white/30'
                                : 'bg-white/10 text-white/100 border border-white/10 hover:bg-white/15'}`}
                              onClick={() => setTripType(type)}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
  
                        {/* Flight Search Fields - Enhanced */}
                        <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                          <div>
                            <label className="block text-md font-bold text-white mb-1">Departure</label>
                            <div className="relative">
                              <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                value={formData.departureDate}
                                onChange={(e) => handleInputChange('departureDate', e.target.value)}
                                required
                              />
                              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                            </div>
                          </div>
                          {tripType === 'Round Trip' && (
                            <div>
                              <label className="block text-md font-bold text-white mb-1">Return</label>
                              <div className="relative">
                                <input
                                  type="date"
                                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                  value={formData.returnDate}
                                  onChange={(e) => handleInputChange('returnDate', e.target.value)}
                                />
                                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Passenger Selection */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-md font-bold text-white mb-1">Passengers</label>
                            <div className="relative">
                              <select
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/100 text-black focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
                                value={formData.travelers}
                                onChange={(e) => handleInputChange('travelers', parseInt(e.target.value))}
                              >
                                {[1, 2, 3, 4, 5, 6].map(num => (
                                  <option key={num} value={num}>{num} {num === 1 ? 'passenger' : 'passengers'}</option>
                                ))}
                              </select>
                              <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
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
                                {['Economy', 'Premium Economy', 'Business', 'First'].map(cls => (
                                  <option key={cls} value={cls.toLowerCase()}>{cls}</option>
                                ))}
                              </select>
                              <FiStar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                            </div>
                          </div>
                        </div>
  
                        <button
                          type="submit"
                          onClick={handleFlightSearch}
                          className="w-full py-4 mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg shadow-xl hover:shadow-2xl hover:from-amber-400 hover:to-orange-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!formData.origin?.iata || !formData.destination?.iata || !formData.departureDate}
                        >
                          Search Flights <FiArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Hotel Search Fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2">
                            <label className="block text-md font-bold text-white mb-1">Destination</label>
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
                            <label className="block text-md font-bold text-white mb-1">Check-in</label>
                            <div className="relative">
                              <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-md font-bold text-white mb-1">Check-out</label>
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
                            <label className="block text-md font-bold text-white mb-1">Rooms</label>
                            <select className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none">
                              {[1, 2, 3, 4].map(num => (
                                <option key={num} value={num}>{num} {num === 1 ? 'room' : 'rooms'}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-1">
                            <label className="block text-md font-bold text-white mb-1">Guests</label>
                            <select className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none">
                              {[1, 2, 3, 4, 5, 6].map(num => (
                                <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-md font-bold text-white mb-1">Room Type</label>
                            <select className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none">
                              {['Any Type', 'Standard', 'Deluxe', 'Suite', 'Family Room', 'Villa'].map(type => (
                                <option key={type} value={type.toLowerCase()}>{type}</option>
                              ))}
                            </select>
                          </div>
                        </div>
  
                        <button
                          onClick={handleHotelSearch}
                          className="w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg shadow-xl hover:shadow-2xl hover:from-amber-400 hover:to-orange-400 transition-all group"
                        >
                          Search Hotels <FiArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
              
  
            </div>
          </motion.div>
        </div>
      </section>
    
  
      
        {/* How It Works Section */}
        <section className="py-32 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
              How It{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Six simple steps to your perfect trip. We've streamlined the entire process so you can focus on what
              matters most—your adventure.
            </p>
          </motion.div>

          <div className="space-y-24">
            {[
              {
                step: 1,
                title: "Set Your Budget",
                description:
                  "Tell us your total trip budget. We'll instantly filter the best packages for you—no surprises, no hidden fees.",
                color: "from-orange-500 to-orange-600",
                direction: "left",  
                lottieUrl: "https://lottie.host/21e3efcb-81c4-4370-8ab8-aafe48ea52b8/QjYBNDDXy7.json",
              },
              {
                step: 2,
                title: "Pick Your Destination",
                description:
                  "Explore a world of possibilities—just pick a city or country and let our smart algorithms do the rest.",
                color: "from-orange-400 to-orange-500",
                direction: "right",
                lottieUrl: "https://lottie.host/a64ed254-83f8-47ad-9514-0b5209327090/8I3AoRgYZE.json",
              },
              {
                step: 3,
                title: "Choose Your Dates",
                description:
                  "Tell us when you want to travel. We'll match you with the best deals for your exact schedule.",
                color: "from-orange-500 to-orange-600",
                direction: "left",
                lottieUrl: "https://lottie.host/f700a726-6aa6-4218-b8b7-529b0f0810d9/hrcPylRORJ.json",
              },
              {
                step: 4,
                title: "Select Hotel & Flight",
                description:
                  "Hand-pick your favorite hotels and flights—mix, match, and create your perfect travel combination.",
                color: "from-orange-400 to-orange-500",
                direction: "right",
                lottieUrl: "https://lottie.host/debd1f55-4862-4559-8829-9daa93e1c9b7/L1e1WecQV3.json",
              },
              {
                step: 5,
                title: "Review & Book",
                description:
                  "Double-check your package details. When you're ready, book everything in one click—secure and simple.",
                color: "from-orange-500 to-orange-600",
                direction: "left",
                lottieUrl: "https://lottie.host/ebde747a-6ed6-4502-8b16-e0e272dda9d4/1Ech6zWI4Z.json",
              },
              {
                step: 6,
                title: "Get Instant Confirmation",
                description:
                  "Your booking is confirmed instantly—no waiting, no stress. Start packing for your adventure!",
                color: "from-orange-400 to-orange-500",
                direction: "right",
                lottieUrl: "https://lottie.host/c6ab46c7-8573-409d-85b8-093b284087ee/cU0hmmGLXq.json",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className={`flex flex-col ${item.direction === "right" ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-20`}
                initial={{ opacity: 0, x: item.direction === "left" ? -100 : 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-r ${item.color} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg z-10`}
                  >
                    {item.step}
                  </div>
                  <div className="w-32 h-32 bg-gradient-to-br from-orange-100 to-orange-50 rounded-3xl flex items-center justify-center shadow-lg">
                    <AnimatedStepCharacter lottieUrl={item.lottieUrl} alt={`${item.title} Character`} />
                  </div>
                </div>
                <div className={`flex-1 ${item.direction === "right" ? "lg:text-right" : "lg:text-left"} text-center`}>
                  <h3
                    className={`text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Mobile Experience Section */}
      <section className="section-lg bg-gradient-to-br from-orange-50/30 to-white">
        <div className="container-base">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
                Seamless{" "}
                <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  Mobile
                </span>
                <br />
                Experience
              </h2>
              <p className="text-xl text-gray-600 mb-12 leading-relaxed">
                Book and manage trips effortlessly from your phone with our award-winning mobile experience.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: <FiCheckCircle className="text-orange-500 text-2xl" />,
                    text: "Mobile-first booking flow optimized for phones and tablets",
                  },
                  {
                    icon: <FiClock className="text-orange-500 text-2xl" />,
                    text: "View your itinerary and passenger details anytime, anywhere",
                  },
                  {
                    icon: <FiCalendar className="text-orange-500 text-2xl" />,
                    text: "Secure payment processing with instant booking confirmation",
                  },
                  {
                    icon: <FiSmartphone className="text-orange-500 text-2xl" />,
                    text: "Retrieve bookings instantly with your reference number",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="mt-1 flex-shrink-0">{item.icon}</span>
                    <span className="text-gray-800 font-medium text-lg">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative w-80 h-[600px] mx-auto overflow-hidden">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                  <div className="animate-[slide_30s_linear_infinite] flex w-[500%] h-full">
                    {[
                      "./images/mock33-left.png",
                      "./images/mock4-left.png",
                      "./images/mock3-left.png",
                      "./images/mokc5-left.png",
                      "./images/mock2-left.png",
                    ].map((src, index) => (
                      <div key={index} className="flex-shrink-0 w-1/5 h-full">
                        <img
                          src={src || "/placeholder.svg"}
                          alt={`Mobile screen ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section
        className="relative py-36 overflow-hidden text-white"
        style={{
          backgroundImage:
            'linear-gradient(to bottom right, rgba(15,15,15,0.75), rgba(255,115,67,0.75)), url("/images/adventure.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
              Why Travelers Trust{' '}
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Where2
              </span>
            </h2>
            <p className="mt-4 text-lg md:text-xl text-orange-100 max-w-2xl mx-auto leading-relaxed">
              Where2 eliminates the stress of planning. Get affordable, visa-friendly, ready-to-book trips — matched to your exact budget and timing.
            </p>
          </motion.div>

          <div className="grid gap-10 sm:grid-cols-1 lg:grid-cols-3">
            {[
              {
                title: 'Built Around Your Budget & Nationality',
                description:
                  'Filter only visa-free countries. Get real-time flight + hotel packages tailored to your wallet and travel window — no manual searching.',
                benefits: [
                  'Visa-free destinations based on nationality',
                  'Live pricing under your set budget',
                  'Instant trip suggestions — no effort',
                  'Flight + hotel packages built automatically',
                ],
                icon: <FiMap className="w-6 h-6 text-white" />,
                color: 'bg-gradient-to-tr from-yellow-500 to-orange-500',
              },
              {
                title: 'Book Smarter, Not Harder',
                description:
                  'Ditch the chaos of jumping between sites. Where2 bundles it all in seconds — with 1-click secure checkout, optimized for deals.',
                benefits: [
                  'Smart matching of flights and hotels',
                  'One-click checkout with Stripe',
                  'Up to 40% cheaper vs separate bookings',
                  'AI-backed deal finder',
                ],
                icon: <FiZap className="w-6 h-6 text-white" />,
                color: 'bg-gradient-to-tr from-blue-500 to-cyan-500',
              },
              {
                title: 'Travel Confidence, Not Chaos',
                description:
                  'One confirmation, 24/7 assistance, and unified policies. If flights change — we rebook you automatically. No stress.',
                benefits: [
                  'One confirmation for all bookings',
                  '24/7 chat support for your trip',
                  'Unified cancellation & refunds',
                  'Free rebooking for changes',
                ],
                icon: <FiShield className="w-6 h-6 text-white" />,
                color: 'bg-gradient-to-tr from-green-500 to-emerald-500',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/10 transition-all duration-300 hover:shadow-3xl hover:-translate-y-1"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center shadow-md`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-orange-100 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-base font-semibold text-white mb-3">What You Get:</h4>
                  <ul className="space-y-2 text-sm text-orange-100">
                    {feature.benefits.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2">
                        <FiCheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Testimonials />

     

        {/* Final CTA + Trust Section */}
        <section  className="relative py-36 overflow-hidden text-white"
        style={{
          backgroundImage:
            'linear-gradient(to bottom right, rgba(15,15,15,0.75), rgba(255,115,67,0.75)), url("/images/adventure2.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}>
        <div className="absolute inset-1 bg-black/10 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-5 ">
              Ready for Your Next Adventure?
            </h2>
            <p className="text-lg md:text-xl text-orange-100 mb-10 leading-relaxed max-w-2xl mx-auto">
              Join thousands of travelers using Where2 to save time, money, and guesswork on every trip.
            </p>

            <Button text="Plan Your Trip" href="/search" icon={true}/>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            className="mt-8 w-full"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <TrustBadges />
          </motion.div>
        </div>
      </section>
        
      <FAQSection />
      
      {/* Travel Blog Section */}
      <section className="bg-gradient-to-b from-white to-orange-50">
        <div className="container-base">
          <TravelBlogSection />
        </div>
      </section>
     
      {/* Footer */}
      <Footer/>
    </div>
  );
}