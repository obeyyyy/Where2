"use client";

import React, { useState, useEffect } from 'react';
import Footer from './components/Footer';
import { motion } from "framer-motion";
import { FiGlobe, FiMapPin, FiDollarSign, FiArrowRight, FiCalendar } from "react-icons/fi";
import AnimatedStepCharacter from "./components/AnimatedStepCharacter";
import TrustBadges from "./components/TrustBadges";
import FAQSection from "./components/FAQSection";
import TravelBlogSection from "./components/TravelBlogSection";
import Link from "next/link";

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
  // ...PASTE THE FULL CONTENT OF YOUR LandingPageClient HERE...

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
              {/* Hero CTA Button */}
              <div className="mt-6">
                <Link href="/search" legacyBehavior>
                  <a className="inline-flex items-center px-8 py-4 bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white text-lg md:text-xl font-bold rounded-full shadow-lg hover:scale-105 focus:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-[#FF8C00]" aria-label="Start Searching for Trips">
                    Find My Trip <FiArrowRight className="ml-2 w-6 h-6" />
                  </a>
                </Link>
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

          {/* Feature Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <motion.div
              className="flex flex-col items-center bg-orange-50 rounded-xl px-6 py-6 shadow-md"
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 2 }}
              variants={widgetVariants}
            >
              <FiDollarSign className="w-8 h-8 text-[#FF8C00] mb-2" />
              <span className="font-semibold text-[#FF8C00] text-lg">Best Value Packages</span>
              <span className="text-gray-500 text-sm mt-1">Save more by bundling flights and hotels</span>
            </motion.div>
            <motion.div
              className="flex flex-col items-center bg-orange-50 rounded-xl px-6 py-6 shadow-md"
              initial="offscreen"
              whileInView="onscreen"
              transition={{ duration: 2}}
              viewport={{ once: true, amount: 0.1 }}
              variants={widgetVariants}
            >
              <FiGlobe className="w-8 h-8 text-[#FFA500] mb-2" />
              <span className="font-semibold text-[#FFA500] text-lg">All-in-One Booking</span>
              <span className="text-gray-500 text-sm mt-1">Flights, hotels & more in one place</span>
            </motion.div>
            <motion.div
              className="flex flex-col items-center bg-orange-50 rounded-xl px-6 py-6 shadow-md"
              initial="offscreen"
              whileInView="onscreen"
              transition={{ duration: 2 }}
              viewport={{ once: true, amount: 0.1 }}
              variants={widgetVariants}
            >
              <FiMapPin className="w-8 h-8 text-[#FF8C00] mb-2" />
              <span className="font-semibold text-[#FF8C00] text-lg">Global Destinations</span>
              <span className="text-gray-500 text-sm mt-1">Explore cities worldwide</span>
            </motion.div>
          </div>

          {/* How it works section - vertical, immersive, scrollable */}
    <motion.div
      className="bg-white/90 rounded-3xl shadow-2xl px-8 py-16 mb-24 max-w-2xl mx-auto flex flex-col items-center border border-orange-100 relative"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1 }}
    >
      
  <h3 className="text-4xl font-extrabold mb-12 mt-6 text-center bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent tracking-tight">
    How It Works
  </h3>
  <div className="flex flex-col gap-16 w-full">
    {/* Step 1 */}
    <motion.div
      className="flex flex-col md:flex-row items-center gap-8 group"
      initial={{ opacity: 0, x: -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 0.1 }}
    >
      <div className="relative flex flex-col items-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FF8C00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-lg border-2 border-white z-10">1</span>
        <AnimatedStepCharacter lottieUrl="https://lottie.host/729a30a8-1262-4232-8d66-4e87208ef457/I7JbwosoaA.json" alt="Set Your Budget Character" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <span className="font-semibold text-2xl text-[#FF8C00]">Set Your Budget</span>
        <p className="text-gray-600 mt-2 text-lg">Tell us your total trip budget. We'll instantly filter the best packages for you—no surprises.</p>
      </div>
    </motion.div>
    {/* Step 2 */}
    <motion.div
      className="flex flex-col md:flex-row items-center gap-8 group"
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 0.7, delay: 0.15 }}
    >
      <div className="relative flex flex-col items-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FFA500] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-lg border-2 border-white z-10">2</span>
        <AnimatedStepCharacter lottieUrl="https://lottie.host/a64ed254-83f8-47ad-9514-0b5209327090/8I3AoRgYZE.json" alt="Pick Your Destination Character" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <span className="font-semibold text-2xl text-[#FFA500]">Pick Your Destination</span>
        <p className="text-gray-600 mt-2 text-lg">Explore a world of possibilities—just pick a city or country and let us do the rest.</p>
      </div>
    </motion.div>
    {/* Step 3 */}
    <motion.div
      className="flex flex-col md:flex-row items-center gap-8 group"
      initial={{ opacity: 0, x: -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 0.7, delay: 0.3 }}
    >
      <div className="relative flex flex-col items-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FF8C00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-lg border-2 border-white z-10">3</span>
        <AnimatedStepCharacter lottieUrl="https://lottie.host/989cdfb3-3cc9-4dcc-b046-0b7a763fbe8f/RU2HndI7KD.json" alt="Choose Your Dates Character" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <span className="font-semibold text-2xl text-[#FF8C00]">Choose Your Dates</span>
        <p className="text-gray-600 mt-2 text-lg">Tell us when you want to travel. We'll match you with the best deals for your schedule.</p>
      </div>
    </motion.div>
    {/* Step 4 */}
    <motion.div
      className="flex flex-col md:flex-row items-center gap-8 group"
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 0.7, delay: 0.45 }}
    >
      <div className="relative flex flex-col items-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FFA500] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-lg border-2 border-white z-10">4</span>
        <AnimatedStepCharacter lottieUrl="https://lottie.host/debd1f55-4862-4559-8829-9daa93e1c9b7/L1e1WecQV3.json" alt="Select Hotel & Flight Character" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <span className="font-semibold text-2xl text-[#FFA500]">Select Hotel & Flight</span>
        <p className="text-gray-600 mt-2 text-lg">Hand-pick your favorite hotels and flights—mix, match, and create your perfect trip.</p>
      </div>
    </motion.div>
    {/* Step 5 */}
    <motion.div
      className="flex flex-col md:flex-row items-center gap-8 group"
      initial={{ opacity: 0, x: -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 0.7, delay: 0.6 }}
    > 
      <div className="relative flex flex-col items-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FF8C00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-lg border-2 border-white z-10">5</span>
        <AnimatedStepCharacter lottieUrl="https://lottie.host/ebde747a-6ed6-4502-8b16-e0e272dda9d4/1Ech6zWI4Z.json" alt="Review & Book Character" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <span className="font-semibold text-2xl text-[#FF8C00]">Review & Book</span>
        <p className="text-gray-600 mt-2 text-lg">Double-check your package details. When you’re ready, book everything in one click—secure and simple.</p>
      </div>
    </motion.div>
    {/* Step 6 */}
    <motion.div
      className="flex flex-col md:flex-row items-center gap-8 group"
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 0.7, delay: 0.75 }}
    > 
      <div className="relative flex flex-col items-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FFA500] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-lg border-2 border-white z-10">6</span>
        <AnimatedStepCharacter lottieUrl="https://lottie.host/c6ab46c7-8573-409d-85b8-093b284087ee/cU0hmmGLXq.json" alt="Get Instant Confirmation Character" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <span className="font-semibold text-2xl text-[#FFA500]">Get Instant Confirmation</span>
        <p className="text-gray-600 mt-2 text-lg">Your booking is confirmed instantly—no waiting, no stress. Start packing!</p>
      </div>
    </motion.div>
  </div>
</motion.div>


          {/* Testimonials Carousel */}
          <motion.div
            className="max-w-xl mx-auto bg-white/90 rounded-2xl shadow-lg px-8 py-8 mb-12 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
          >
            <h3 className="text-xl font-bold mb-4 text-[#FF8C00]">What Travelers Say</h3>
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-lg text-gray-700 italic mb-2">"{testimonials[currentTestimonial].text}"</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-semibold text-[#FF8C00]">{testimonials[currentTestimonial].name}</span>
                <span className="text-xl">{testimonials[currentTestimonial].country}</span>
              </div>
            </motion.div>
            <div className="flex justify-center gap-2 mt-4">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentTestimonial ? 'bg-[#FF8C00]' : 'bg-gray-300'}`}
                  onClick={() => setCurrentTestimonial(idx)}
                  aria-label={`Show testimonial ${idx+1}`}
                />
              ))}
            </div>
          </motion.div>
          {/* Call to Action */}
          <motion.div
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

