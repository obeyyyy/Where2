"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiArrowLeft, FiUser, FiMail, FiPhone, FiCheckCircle } from "react-icons/fi";
import BookingSummary from "../components/BookingSummary";

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
  const searchParams = useSearchParams();
  const offerId = searchParams.get("offerId") || "";
  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";
  const departureDate = searchParams.get("departureDate") || "";
  const returnDate = searchParams.get("returnDate") || "";
  const tripType = searchParams.get("tripType") || "roundtrip";
  const nights = searchParams.get("nights") || "7";
  const travelers = searchParams.get("travelers") || "1";
  const currency = searchParams.get("currency") || "USD";
  const budget = searchParams.get("budget") || "";
  const includeHotels = searchParams.get("includeHotels") || "false";
  const useKiwi = searchParams.get("useKiwi") || "false";
  const useDuffel = searchParams.get("useDuffel") || "true";

  const [step, setStep] = useState<number>(0);
  const [passengerData, setPassengerData] = useState<PassengerInfo[]>(
    Array(Number(travelers)).fill({ ...initialPassenger })
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Flight offer summary state
  const [flight, setFlight] = useState<any | null>(null);
  const [flightLoading, setFlightLoading] = useState(true);
  const [flightError, setFlightError] = useState<string | null>(null);

  useEffect(() => {
    if (!offerId || !origin || !destination || !departureDate) return;
    setFlightLoading(true);

    // Construct cache key (must match search page)
    const cacheKey = `flight_search_${origin}_${destination}_${departureDate}_${returnDate}_${tripType}_${nights}_${travelers}_${currency}_${budget}_${includeHotels}_${useKiwi}_${useDuffel}`;
    console.log('BookingPage cacheKey:', cacheKey);
    let cachedOffers: any[] | null = null;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        cachedOffers = JSON.parse(cached);
        console.log('Cache found for key:', cacheKey);
      } else {
        console.log('No cache found for key:', cacheKey);
      }
    } catch (e) {
      console.log('Error reading cache for key:', cacheKey, e);
      cachedOffers = null;
    }

    if (cachedOffers && Array.isArray(cachedOffers) && cachedOffers.length > 0) {
      console.log('Loaded offers from cache:', cachedOffers);
      console.log('Offer IDs in cache:', cachedOffers.map((o: any) => o.id));
      const offer = cachedOffers.find((o: any) => o.id === offerId);
      if (offer) {
        setFlight(offer);
        setFlightError(null);
        setFlightLoading(false);
        return;
      } else {
        console.error('Offer ID not found in cache:', offerId);
        setFlight(null);
        setFlightError("Flight offer not found.");
        setFlightLoading(false);
        return;
      }
    }

    // Fallback: fetch from API if no cache
    const params = new URLSearchParams({
      origin,
      destination,
      departureDate,
      returnDate,
      tripType,
      nights,
      travelers,
      currency,
      budget,
      includeHotels,
      useKiwi,
      useDuffel
    });
    fetch(`/api/trips?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        console.log('Fetched trip data:', data);
        console.log('Searching for offerId:', offerId);
        if (data && data.data) {
          console.log('Available offer IDs:', data.data.map((o: any) => o.id));
          const offer = Array.isArray(data.data)
            ? data.data.find((o: any) => o.id === offerId)
            : data.data.id === offerId
              ? data.data
              : null;
          if (offer) {
            setFlight(offer);
            setFlightError(null);
          } else {
            console.error('Offer ID not found:', offerId);
            setFlight(null);
            setFlightError("Flight offer not found.");
          }
        } else {
          setFlight(null);
          setFlightError("Flight offer not found.");
        }
      })
      .catch(() => {
        setFlight(null);
        setFlightError("Failed to fetch flight data.");
      })
      .finally(() => setFlightLoading(false));
  }, [offerId, origin, destination, departureDate, returnDate, tripType, nights, travelers, currency, budget, includeHotels, useKiwi, useDuffel]);

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

  // Render form for each passenger
  const renderPassengerForm = (idx: number) => (
    <div key={idx} className="mb-6 p-4 border rounded-xl bg-white shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FiUser /> Passenger {idx + 1}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="First Name"
          value={passengerData[idx].firstName}
          onChange={(e) => handleInputChange(idx, "firstName", e.target.value)}
          className="p-3 border rounded-xl focus:ring-2 focus:ring-[#FFA500]"
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={passengerData[idx].lastName}
          onChange={(e) => handleInputChange(idx, "lastName", e.target.value)}
          className="p-3 border rounded-xl focus:ring-2 focus:ring-[#FFA500]"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={passengerData[idx].email}
          onChange={(e) => handleInputChange(idx, "email", e.target.value)}
          className="p-3 border rounded-xl focus:ring-2 focus:ring-[#FFA500]"
          required
        />
        <input
          type="tel"
          placeholder="Phone"
          value={passengerData[idx].phone}
          onChange={(e) => handleInputChange(idx, "phone", e.target.value)}
          className="p-3 border rounded-xl focus:ring-2 focus:ring-[#FFA500]"
          required
        />
      </div>
    </div>
  );

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
          ) : flight ? (
            <div className="rounded-3xl shadow-xl border border-yellow-100 bg-white p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {/* Airline Logo */}
                <div className="w-16 h-16 bg-white rounded-xl shadow border flex items-center justify-center">
                  {flight.itineraries?.[0]?.segments?.[0]?.carrierCode && (
                    <img
                      src={`https://content.airhex.com/content/logos/airlines_${flight.itineraries[0].segments[0].carrierCode}_100_50_r.png`}
                      alt={flight.itineraries[0].segments[0].carrierCode}
                      className="object-contain w-12 h-12"
                      style={{ background: '#fff' }}
                    />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xl text-gray-800">
                    {flight.itineraries?.[0]?.segments?.[0]?.departure?.iataCode} → {flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.iataCode}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {new Date(flight.itineraries[0].segments[0].departure.at).toLocaleDateString()} | {flight.itineraries[0].segments[0].departure.iataCode} to {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-2xl font-bold text-[#FFA500]">
                    {flight.price.currency} {parseFloat(flight.price.total).toFixed(0)}
                  </span>
                  <div className="text-xs text-gray-500">Total Price</div>
                </div>
              </div>
              <div className="flex gap-8 items-center mt-4 justify-center">
                {/* Departure Time & Origin */}
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-extrabold bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-3 py-1 rounded-xl shadow">
                    {new Date(flight.itineraries[0].segments[0].departure.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  <span className="mt-2 inline-block bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-lg tracking-wide shadow">
  {flight.itineraries[0].segments[0].departure.iataCode}
  {flight.itineraries[0].segments[0].departure.airportName && (
    <span className="ml-2 text-xs font-normal text-blue-800">{flight.itineraries[0].segments[0].departure.airportName}</span>
  )}
</span>
                  <span className="text-xs text-gray-500 mt-1">Depart</span>
                </div>
                {/* Stops/Nonstop */}
                <div className="flex flex-col items-center">
                  <span className={
                    flight.itineraries[0].segments.length - 1 === 0
                      ? "px-4 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 shadow"
                      : "px-4 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 shadow"
                  }>
                    {flight.itineraries[0].segments.length - 1 === 0
                      ? 'Nonstop'
                      : `${flight.itineraries[0].segments.length - 1} Stop${flight.itineraries[0].segments.length - 1 > 1 ? 's' : ''}`}
                  </span>
                  <span className="text-xs text-gray-400 mt-2">
                    {flight.itineraries[0].duration?.replace('PT', '').toLowerCase().replace('h', 'h ').replace('m', 'm')}
                  </span>
                </div>
                {/* Arrival Time & Destination */}
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-extrabold bg-gradient-to-br from-[#FFA500] to-[#FF8C00] text-white px-3 py-1 rounded-xl shadow">
                    {new Date(flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  <span className="mt-2 inline-block bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full text-lg tracking-wide shadow">
  {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}
  {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.airportName && (
    <span className="ml-2 text-xs font-normal text-purple-800">{flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.airportName}</span>
  )}
</span>
                  <span className="text-xs text-gray-500 mt-1">Arrive</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-bold">From:</span> {flight.itineraries[0].segments[0].departure.iataCode}
                  <span className="mx-2">→</span>
                  <span className="font-bold">To:</span> {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}
                </div>
                <div>
                  <span className="font-bold">Departure:</span> {new Date(flight.itineraries[0].segments[0].departure.at).toLocaleString()}
                </div>
              </div>
              {flight.itineraries && flight.itineraries.length > 0 && (
                <ul className="text-xs text-gray-600 mt-2">
                  {flight.itineraries[0].segments.map((seg: any, idx: number) => (
  <li key={idx}>
    {seg.departure.iataCode}
    {seg.departure.airportName && (
      <span className="ml-1 text-gray-500">({seg.departure.airportName})</span>
    )}
    {" "}{new Date(seg.departure.at).toLocaleTimeString()} → {seg.arrival.iataCode}
    {seg.arrival.airportName && (
      <span className="ml-1 text-gray-500">({seg.arrival.airportName})</span>
    )}
    {" "}{new Date(seg.arrival.at).toLocaleTimeString()} | {seg.carrierCode} {seg.number}
  </li>
))}
                </ul>
              )}
            </div>
          ) : null}
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
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <FiCheckCircle className="text-[#FFA500]" /> Review & Confirm
              </h2>
              {/* Booking summary could show selected flight, hotel, price, etc. */}
              <BookingSummary offerId={offerId} passengerData={passengerData} />
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
      </div>
    );
  };
  
  export default BookingPage;