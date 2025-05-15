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
                <div className="flex items-center justify-between">
                  {/* Origin */}
                  {(() => {
                    const dep = trip.itineraries?.[0]?.segments?.[0]?.departure;
                    const arr = trip.itineraries?.[0]?.segments?.[trip.itineraries[0].segments.length - 1]?.arrival;
                    const depInfo = airports.find((a: any) => a.iata_code === dep?.iataCode);
                    const arrInfo = airports.find((a: any) => a.iata_code === arr?.iataCode);
                    return <>
                      <div className="flex-1 text-left">
                        <div className="text-3xl font-extrabold text-gray-800">{typeof dep?.iataCode === "object" ? dep?.iataCode.code : dep?.iataCode}</div>
                        <div className="text-base font-semibold text-gray-700">{depInfo?.name || ''}</div>
                        <div className="text-sm text-gray-600">{depInfo?.municipality || ''}</div>
                        <div className="text-lg font-bold text-yellow-700 leading-tight">{dep?.at ? new Date(dep.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</div>
                        <div className="text-xs text-gray-500">{dep?.at ? new Date(dep.at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</div>
                      </div>
                      {/* Center with airplane icon and duration */}
                      <div className="flex flex-col items-center justify-center flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-20 h-1 bg-yellow-400 rounded-full inline-block"></span>
                          <span className="text-yellow-500 text-2xl flex items-center justify-center">
                            <MdFlight style={{ display: 'inline', verticalAlign: 'middle' }} />
                          </span>
                          <span className="w-20 h-1 bg-yellow-400 rounded-full inline-block"></span>
                        </div>
                        <div className="text-gray-500 text-sm font-medium">
                          {/* Duration + stops */}
                          {trip.itineraries?.[0]?.duration?.replace('PT', '').toLowerCase().replace('h', 'h ').replace('m', 'm')} • {trip.itineraries?.[0]?.segments?.length - 1 === 0 ? 'Direct' : `${trip.itineraries[0].segments.length - 1} Stop${trip.itineraries[0].segments.length - 1 > 1 ? 's' : ''}`}
                        </div>
                      </div>
                      {/* Destination */}
                      <div className="flex-1 text-right">
                        <div className="text-3xl font-extrabold text-gray-800">{typeof arr?.iataCode === "object" ? arr?.iataCode.code : arr?.iataCode}</div>
                        <div className="text-base font-semibold text-gray-700">{arrInfo?.name || ''}</div>
                        <div className="text-sm text-gray-600">{arrInfo?.municipality || ''}</div>
                        <div className="text-lg font-bold text-yellow-700 leading-tight">{arr?.at ? new Date(arr.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</div>
                        <div className="text-xs text-gray-500">{arr?.at ? new Date(arr.at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</div>
                      </div>
                    </>;
                  })()}
                </div>
                <hr className="my-4 border-t border-gray-200" />
                <div className="flex items-center justify-between">
                  {/* Airline & Aircraft */}
                  <div className="flex items-center gap-3">
                    <span className="bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-full text-sm shadow">{typeof trip.itineraries?.[0]?.segments?.[0]?.carrierCode === "object" ? trip.itineraries[0].segments[0].carrierCode.code : trip.itineraries?.[0]?.segments?.[0]?.carrierCode}</span>
                    <span className="flex items-center font-semibold text-gray-700">
                      <span className="bg-gray-100 p-1 rounded-md shadow-sm flex items-center mr-2">
                        <img
                          src={getAirlineLogoUrl(
                            typeof trip.itineraries?.[0]?.segments?.[0]?.carrierCode === "object"
                              ? trip.itineraries[0].segments[0].carrierCode.code
                              : trip.itineraries?.[0]?.segments?.[0]?.carrierCode
                          )}
                          alt="Airline Logo"
                          style={{ height: 24, width: 'auto', display: 'block' }}
                          onError={e => (e.currentTarget.style.display = 'none')}
                        />
                      </span>
                      {typeof trip.itineraries?.[0]?.segments?.[0]?.carrierName === "object"
                        ? (trip.itineraries[0].segments[0].carrierName.name || trip.itineraries[0].segments[0].carrierName.code || JSON.stringify(trip.itineraries[0].segments[0].carrierName))
                        : (trip.itineraries[0].segments[0].carrierName || 'Airline')}
                    </span>
                    <span className="text-xs text-gray-500">{typeof trip.itineraries?.[0]?.segments?.[0]?.aircraft === "object" ? (trip.itineraries[0].segments[0].aircraft.code || trip.itineraries[0].segments[0].aircraft.name || JSON.stringify(trip.itineraries[0].segments[0].aircraft)) : (trip.itineraries[0].segments[0].aircraft || '')}</span>
                  </div>
                  {/* Cabin/Class & Passengers */}
                  <div className="text-right">
                    <div className="font-semibold text-gray-700">{trip.class || 'Economy Class'}</div>
                    <div className="text-xs text-gray-500">{travelers} passenger{Number(travelers) > 1 ? 's' : ''}</div>
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