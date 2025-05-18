"use client";

import React, { useState, useEffect } from "react";
import { getAirlineLogoUrl } from "../components/getAirlineLogoUrl";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiArrowLeft, FiUser, FiMail, FiPhone, FiCheckCircle } from "react-icons/fi";
import { MdFlight } from "react-icons/md";
import BookingSummary from "../components/BookingSummary";
const airports = require('airports-json').airports;

// Booking form types
interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const initialPassenger: PassengerInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
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

  const [step, setStep] = useState<number>(0);
  const [passengerData, setPassengerData] = useState<PassengerInfo[]>(
    Array(Number(travelers)).fill({ ...initialPassenger })
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // All old flight/cached offer logic removed. Use only bookingData/trip.

  // Handle input change for a passenger
  const handleInputChange = (idx: number, field: keyof PassengerInfo, value: string) => {
    setPassengerData((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
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

  // Render form for each passenger with improved UI
  const renderPassengerForm = (idx: number) => (
    <div key={idx} className="mb-6 p-6 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-6 pb-3 border-b border-gray-100 flex items-center gap-2 text-gray-800">
        <FiUser className="text-[#FFA500]" /> 
        <span>Passenger {idx + 1} <span className="text-sm font-normal text-gray-500 ml-2">(Adult)</span></span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input
            type="text"
            value={passengerData[idx].firstName}
            onChange={(e) => handleInputChange(idx, "firstName", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent transition-all"
            placeholder="John"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input
            type="text"
            value={passengerData[idx].lastName}
            onChange={(e) => handleInputChange(idx, "lastName", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent transition-all"
            placeholder="Doe"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <div className="relative">
            <input
              type="email"
              value={passengerData[idx].email}
              onChange={(e) => handleInputChange(idx, "email", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent transition-all pl-10"
              placeholder="john@example.com"
              required
            />
            <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <div className="relative">
            <input
              type="tel"
              value={passengerData[idx].phone}
              onChange={(e) => handleInputChange(idx, "phone", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FFA500] focus:border-transparent transition-all pl-10"
              placeholder="+1 (___) ___-____"
              required
            />
            <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );

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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-700">Flight Summary</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-2xl font-extrabold text-[#FFA500] bg-yellow-100 px-2 py-1 rounded-xl shadow-sm border border-yellow-200">
                      {trip.price?.currency} {trip.price?.total}
                    </span>
                    <span className="bg-yellow-200 text-yellow-800 font-bold px-3 py-1 rounded-full text-sm tracking-wide shadow">
                      {typeof trip.itineraries?.[0]?.segments?.[0]?.carrierCode === "object" ? trip.itineraries[0].segments[0].carrierCode.code : trip.itineraries?.[0]?.segments?.[0]?.carrierCode}-{trip.itineraries?.[0]?.segments?.[0]?.number}
                    </span>
                  </div>
                </div>
                {/* Flight Legs - Outbound and Return */}
                <div className="space-y-6">
                  {/* Outbound Flight */}
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Outbound Flight • {searchParams?.departureDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {(() => {
                        const outboundItinerary = trip.itineraries?.[0];
                        const dep = outboundItinerary?.segments?.[0]?.departure;
                        const arr = outboundItinerary?.segments?.[outboundItinerary.segments.length - 1]?.arrival;
                        const depInfo = airports.find((a: any) => a.iata_code === dep?.iataCode);
                        const arrInfo = airports.find((a: any) => a.iata_code === arr?.iataCode);
                        
                        return (
                          <>
                            <div className="flex-1 text-left">
                              <div className="text-2xl font-extrabold text-gray-800">{dep?.iataCode}</div>
                              <div className="text-sm text-gray-600">{dep?.at ? new Date(dep.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</div>
                            </div>
                            <div className="flex flex-col items-center justify-center flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-16 h-1 bg-gray-300 rounded-full"></span>
                                <MdFlight className="text-gray-400 text-xl" />
                                <span className="w-16 h-1 bg-gray-300 rounded-full"></span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {outboundItinerary?.duration?.replace('PT', '').toLowerCase().replace('h', 'h ').replace('m', 'm')} • 
                                {outboundItinerary?.segments?.length - 1 === 0 ? 'Direct' : 
                                 `${outboundItinerary.segments.length - 1} Stop${outboundItinerary.segments.length - 1 > 1 ? 's' : ''}`}
                              </div>
                            </div>
                            <div className="flex-1 text-right">
                              <div className="text-2xl font-extrabold text-gray-800">{arr?.iataCode}</div>
                              <div className="text-sm text-gray-600">{arr?.at ? new Date(arr.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Return Flight - Only show if it exists */}
                  {trip.itineraries?.[1] && searchParams?.tripType === 'round-trip' && (
                    <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Return Flight • {searchParams?.returnDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        {(() => {
                          const returnItinerary = trip.itineraries?.[1];
                          const dep = returnItinerary?.segments?.[0]?.departure;
                          const arr = returnItinerary?.segments?.[returnItinerary.segments.length - 1]?.arrival;
                          const depInfo = airports.find((a: any) => a.iata_code === dep?.iataCode);
                          const arrInfo = airports.find((a: any) => a.iata_code === arr?.iataCode);
                          
                          return (
                            <>
                              <div className="flex-1 text-left">
                                <div className="text-2xl font-extrabold text-gray-800">{dep?.iataCode}</div>
                                <div className="text-sm text-gray-600">{dep?.at ? new Date(dep.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</div>
                              </div>
                              <div className="flex flex-col items-center justify-center flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-16 h-1 bg-gray-300 rounded-full"></span>
                                  <MdFlight className="text-orange-400 text-xl" />
                                  <span className="w-16 h-1 bg-gray-300 rounded-full"></span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {returnItinerary?.duration?.replace('PT', '').toLowerCase().replace('h', 'h ').replace('m', 'm')} • 
                                  {returnItinerary?.segments?.length - 1 === 0 ? 'Direct' : 
                                   `${returnItinerary.segments.length - 1} Stop${returnItinerary.segments.length - 1 > 1 ? 's' : ''}`}
                                </div>
                              </div>
                              <div className="flex-1 text-right">
                                <div className="text-2xl font-extrabold text-gray-800">{arr?.iataCode}</div>
                                <div className="text-sm text-gray-600">{arr?.at ? new Date(arr.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                <hr className="my-4 border-t border-gray-200" />
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {/* Airline & Aircraft */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full shadow">
                        {trip.itineraries?.[0]?.segments?.[0]?.carrierCode || '--'}
                      </span>
                      <div className="flex items-center">
                        <img
                          src={getAirlineLogoUrl(trip.itineraries?.[0]?.segments?.[0]?.carrierCode || '')}
                          alt="Airline Logo"
                          className="h-5 w-auto mr-2"
                          onError={e => (e.currentTarget.style.display = 'none')}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {trip.itineraries?.[0]?.segments?.[0]?.carrierName || 'Airline'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {trip.itineraries?.[0]?.segments?.[0]?.aircraft?.code || ''}
                      </span>
                    </div>
                    
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
                          {searchParams?.tripType === 'round-trip' ? 'round-trip' : 'one-way'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {travelers} passenger{Number(travelers) !== 1 ? 's' : ''} • {trip.class || 'Economy'}
                      </div>
                      {searchParams?.tripType === 'round-trip' && (
                        <div className="text-xs text-green-600 font-medium">
                          Includes return flight
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
                  onClick={() => window.history.back()}
                >
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