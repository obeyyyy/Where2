'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FlightItineraryCard } from '@/app/components/FlightItineraryCard';
import airportsJson from 'airports-json';
import Image from 'next/image';
import { FaBaby, FaBuilding, FaChild, FaLaptop, FaSuitcase, FaTicketAlt } from 'react-icons/fa';
import { FaPassport, FaSuitcaseRolling, FaPlaneDeparture, FaMapMarkedAlt, FaPlane, FaSearch, FaUserFriends, FaCreditCard, FaExternalLinkAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface Segment {
  departure: { iataCode: string; at: string; terminal: string };
  arrival: { iataCode: string; at: string; terminal: string };
  carrierCode: string;
  carrierName: string;
  number: string;
  aircraft: { code: string };
  baggage: string;
  seats: string;
}

interface BookingData {
  itinerary: {
    segments: Segment[];
    duration: string;
  };
  passengers: {
    type: string;
    title: any;
    born_on: any;
    email: any;
    phone_number: any;
    given_name: string;
    family_name: string;
  }[];
  payment: {
    amount: string;
    currency: string;
  };
  bookingReference: string;
  orderId: string;
  cabinClass: string;
  createdAt: string;
}

const getCityPhotoRef = async (iataCode: string) => {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${iataCode} city&per_page=1`,
    {
      headers: {
        Authorization: process.env.NEXT_PUBLIC_PEXELS_ACCESS_KEY || '',
      },
    }
  );

  if (!response.ok) {
    console.error(`Failed to fetch photo for ${iataCode}`);
    return null;
  }

  const data = await response.json();
  return data.photos?.[0]?.src?.landscape || null;
};

const getCityName = (iataCode: string) => {
  const airport = Object.values(airportsJson).find(a => a.iata_code === iataCode);
  return airport?.city || iataCode;
};

export default function RetrieveBooking() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('/images/fallback-travel.jpg');
  const router = useRouter();

  useEffect(() => {
    const fetchImage = async () => {
      if (bookingData?.itinerary?.segments?.[0]?.arrival?.iataCode && imageUrl === '/images/fallback-travel.jpg') {
        try {
          const url = await getCityPhotoRef(
            bookingData.itinerary.segments[0].arrival.iataCode
          );
          if (url) setImageUrl(url);
        } catch (error) {
          console.error('Failed to load image:', error);
        }
      }
    };
    fetchImage();
  }, [bookingData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      setError('Please enter a valid order ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Booking not found');
      }

      const data = await response.json();
      
      if (!data?.itinerary?.segments) {
        throw new Error('Invalid booking data format');
      }

      setBookingData({
        ...data,
        itinerary: {
          ...data.itinerary,
          segments: data.itinerary.segments.map((segment: any) => ({
            ...segment,
            carrierCode: segment.airlineCode,
            carrierName: segment.airline,
            number: segment.flightNumber,
            departure: {
              ...segment.departure,
              terminal: segment.departureTerminal
            },
            arrival: {
              ...segment.arrival,
              terminal: segment.arrivalTerminal
            },
            baggage: segment.baggageAllowance,
            seats: segment.seatAssignments
          }))
        }
      });
    } catch (err) {
      console.error('Error fetching booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-2xl  overflow-hidden p-2 mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#FFA500] p-2 rounded-lg text-white">
            <FaSearch className="text-3xl" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-4xl text-center mb-3">
            <span className="block bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent py-1">
              Retrieve Your Booking
            </span>
          </h2>
        </div>
        <p className="text-gray-600 mb-8 text-lg">Enter your booking reference to view your itinerary and travel details.</p>

        {!bookingData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="orderId" className="block text-sm font-semibold text-gray-700 mb-1">
                Booking Reference
              </label>
              <div className="relative">
                <input
                  id="orderId"
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. W2B-123456"
                />
                {loading && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Retrieve Booking'}
            </button>
          </form>
        ) : (
          <div className="space-y-10">
            <div className="bg-white rounded-xl overflow-hidden mt-6 ">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className=" p-2 rounded-lg text-red-600">
                    <FaPlane className="text-orange-600 text-2xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Check-In Information</h2>
                </div>
                
                <div className="mt-8 space-y-8">
                  <div className="relative w-full p-6 bg-white border-4 border-gradient-to-r from-green-500 to-green-600 rounded-none h-full
                          shadow-[8px_8px_0_-2.5px_#FF8C00,8px_8px_0_0_#FFA500]
                          hover:shadow-[12px_12px_0_-2.5px_#fff,12px_12px_0_0_#FF8C00]
                          transition-all duration-300 group flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-gray-800">⏱️ Flight Countdown</h3>
                      <p className="text-gray-600 text-sm">
                        Departure: {new Date(bookingData.itinerary.segments[0].departure.at).toLocaleString('en-US', {
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                      <div className="text-3xl font-bold text-gray-800 tabular-nums tracking-tight">
                        <CountdownTimer departureTime={bookingData.itinerary.segments[0].departure.at} />
                      </div>
                    </div>
                  </div>
                  <motion.div
              className="relative w-full p-6 bg-white border-4 border-gradient-to-r from-orange-500 to-orange-600 rounded-none mb-8
                shadow-[8px_8px_0_-2.5px_#FF8C00,8px_8px_0_0_#FFA500]
                hover:shadow-[12px_12px_0_-2.5px_#fff,12px_12px_0_0_#FF8C00]
                transition-all duration-300 group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-bold text-2xl text-gray-800 mb-4 flex items-center gap-3">
                <FaTicketAlt className="text-orange-600" />
                Booking Summary
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Booking Reference</p>
                  <p className="font-mono text-lg font-medium text-gray-900">{bookingData.bookingReference || 'N/A'}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Booked On</p>
                  <p className="text-lg font-medium text-gray-900">
                    {bookingData.createdAt ? new Date(bookingData.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Total Passengers</p>
                  <p className="text-lg font-medium text-gray-900">{bookingData.passengers.length || 'N/A'}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
                    className="relative w-full p-6 bg-white border-4 border-gradient-to-r from-orange-500 to-orange-600 rounded-none mb-8
                shadow-[8px_8px_0_-2.5px_#FF8C00,8px_8px_0_0_#FFA500]
                hover:shadow-[12px_12px_0_-2.5px_#fff,12px_12px_0_0_#FF8C00]
                transition-all duration-300 group"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center gap-2">
                      <FaUserFriends className="text-orange-600" />
                      Passenger Details
                    </h3>
                    <div className="space-y-4">
                      {bookingData.passengers.map((passenger, index) => (
                        <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                          <div className="flex items-start gap-4">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                              {passenger.type === 'adult' ? <FaUserFriends /> : 
                               passenger.type === 'child' ? <FaChild /> : <FaBaby />}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {passenger.title ? `${passenger.title} ` : ''}
                                {passenger.given_name} {passenger.family_name}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                                {passenger.born_on && (
                                  <div>
                                    <span className="font-medium">DOB: </span>
                                    {new Date(passenger.born_on).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </div>
                                )}
                                {passenger.email && (
                                  <div>
                                    <span className="font-medium">Email: </span>
                                    {passenger.email}
                                  </div>
                                )}
                                {passenger.phone_number && (
                                  <div>
                                    <span className="font-medium">Phone: </span>
                                    {passenger.phone_number}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>


                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-8 flex flex-col">
                      <motion.div 
                        className="relative w-full p-6 bg-white border-4 border-gradient-to-r from-orange-500 to-orange-600 rounded-none h-full
                          shadow-[8px_8px_0_-2.5px_#FF8C00,8px_8px_0_0_#FFA500]
                          hover:shadow-[12px_12px_0_-2.5px_#fff,12px_12px_0_0_#FF8C00]
                          transition-all duration-300 group flex flex-col"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-800 mb-3.5 flex items-center gap-2">
                            <FaPlane className="text-orange-600 text-xl" />
                            Flight Details
                          </h3>
                          <div className="space-y-3">
                            <p className="flex justify-between py-2 border-b border-gray-100">
                              <span className="font-medium text-gray-700">Airline:</span>
                              <span className="text-gray-900">{bookingData.itinerary.segments[0].carrierName} ({bookingData.itinerary.segments[0].carrierCode})</span>
                            </p>
                            <p className="flex justify-between py-2 border-b border-gray-100">
                              <span className="font-medium text-gray-700">Flight Number:</span>
                              <span className="text-gray-900">{bookingData.itinerary?.segments[0]?.number || 'N/A'}</span>
                            </p>
                            <p className="flex justify-between py-2 border-b border-gray-100">
                              <span className="font-medium text-gray-700">Departure Terminal:</span>
                              <span className="text-gray-900">{bookingData.itinerary?.segments[0]?.departure?.terminal || 'N/A'}</span>
                            </p>
                            <p className="flex justify-between py-2 border-b border-gray-100">
                              <span className="font-medium text-gray-700">Arrival Terminal:</span>
                              <span className="text-gray-900">{bookingData.itinerary?.segments[0]?.arrival?.terminal || 'N/A'}</span>
                            </p>
                            <p className="flex justify-between py-2 border-b border-gray-100">
                              <span className="font-medium text-gray-700">Baggage Allowance:</span>
                              <span className="text-gray-900">{bookingData.itinerary?.segments[0]?.baggage || 'N/A'}</span>
                            </p>
                            <p className="flex justify-between py-2">
                              <span className="font-medium text-gray-700">Seat Assignment:</span>
                              <span className="text-gray-900">{bookingData.itinerary?.segments[0]?.seats || 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                        
                        {bookingData.itinerary?.segments[0]?.carrierName && (
                          <a 
                            href={`https://www.google.com/search?q=${encodeURIComponent(bookingData.itinerary.segments[0].carrierName + ' check in')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 mt-4"
                          >
                            Go to {bookingData.itinerary.segments[0].carrierName} check-in
                            <FaExternalLinkAlt className="ml-1 w-3 h-3" />
                          </a>
                        )}
                      </motion.div>

                      <motion.div 
                        className="relative w-full p-6 bg-white border-4 border-gradient-to-r from-orange-500 to-orange-600 rounded-none h-full
                          shadow-[8px_8px_0_-2.5px_#FF8C00,8px_8px_0_0_#FFA500]
                          hover:shadow-[12px_12px_0_-2.5px_#fff,12px_12px_0_0_#FF8C00]
                          transition-all duration-300 group flex flex-col"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-800 mb-3.5 flex items-center gap-2">
                            <FaSuitcaseRolling className="text-orange-600 text-xl" />
                            Baggage Allowance
                          </h3>
                          <div className="space-y-3">
                            <p className="text-gray-700">
                              <span className="font-medium">Cabin Baggage:</span>
                            </p>
                            <p className="text-gray-700">
                              <span className="font-medium">Checked Baggage:</span> Varies by airline
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                              * Verify exact limits with your airline
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    <div className="space-y-8 flex flex-col">
                      <motion.div 
                        className="relative w-full p-6 bg-white border-4 border-gradient-to-r from-orange-500 to-orange-600 rounded-none h-full
                          shadow-[8px_8px_0_-2.5px_#FF8C00,8px_8px_0_0_#FFA500]
                          hover:shadow-[12px_12px_0_-2.5px_#fff,12px_12px_0_0_#FF8C00]
                          transition-all duration-300 group flex flex-col"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-800 mb-3.5 flex items-center gap-2">
                            <FaLaptop className="text-orange-600 text-xl" />
                            Online Check-In
                          </h3>
                          <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>Opens 24-48 hours before departure</li>
                            <li>Enter booking reference and last name</li>
                            <li>Select seats and add baggage if needed</li>
                            <li>Download or print boarding pass</li>
                          </ul>
                        </div>
                      </motion.div>

                      <motion.div 
                        className="relative w-full p-6 bg-white border-4 border-gradient-to-r from-orange-400 to-orange-500 rounded-none h-full
                          shadow-[8px_8px_0_-2.5px_#FF8C00,8px_8px_0_0_#FFA500]
                          hover:shadow-[12px_12px_0_-2.5px_#fff,12px_12px_0_0_#FF8C00]
                          transition-all duration-300 group flex flex-col"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-800 mb-3.5 flex items-center gap-2">
                            <FaBuilding className="text-orange-600 text-xl" />
                            Airport Check-In
                          </h3>
                          <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>Arrive 2-3 hours before departure</li>
                            <li>Have passport/ID ready</li>
                            <li>Check baggage at airline counter</li>
                            <li>Security may require removing liquids/laptops</li>
                          </ul>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="space-y-8 flex flex-col">
                <div className="flex items-center gap-2">
                  <FaPlane className="text-2xl font-bold text-orange-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Flight Itinerary</h2>
                </div>
                <motion.div 
                  className="relative w-full p-4 bg-white 
                  flex flex-col"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <FlightItineraryCard 
                    itinerary={bookingData.itinerary}
                    date={bookingData.itinerary.segments[0].departure.at}
                    type="outbound"
                    className="text-sm md:text-base"
                    airports={[
                      { iata_code: bookingData.itinerary.segments[0].departure.iataCode },
                      { iata_code: bookingData.itinerary.segments[bookingData.itinerary.segments.length-1].arrival.iataCode }
                    ]}
                  />
                  
                </motion.div>

                {bookingData.itinerary.segments.length > 1 && (
                  <motion.div 
                    className="relative w-full p-4 bg-white flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <FlightItineraryCard 
                      itinerary={{
                        segments: bookingData.itinerary.segments.slice(1),
                        duration: bookingData.itinerary.duration
                      }}
                      date={bookingData.itinerary.segments[1].departure.at}
                      type="return"
                      className="text-sm md:text-base"
                      airports={[
                        { iata_code: bookingData.itinerary.segments[1].departure.iataCode },
                        { iata_code: bookingData.itinerary.segments[bookingData.itinerary.segments.length-1].arrival.iataCode }
                      ]}
                    />
                  </motion.div>
                  
                )}
                {bookingData.itinerary?.segments[0]?.carrierName && (
                  <a 
                    href={`https://www.google.com/search?q=${encodeURIComponent(bookingData.itinerary.segments[0].carrierName + ' check in')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 mt-4"
                  >
                    Go to {bookingData.itinerary.segments[0].carrierName} check-in
                    <FaExternalLinkAlt className="ml-1 w-3 h-3" />
                  </a>
                )}
              </div>
            </div>



            <div className="bg-white rounded-xl overflow-hidden">
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl text-center mb-12">
                <span className="block bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent py-1">
                  Travel Tips for {getCityName(bookingData.itinerary.segments[0].arrival.iataCode)}
                </span>
              </h2>
              <div className="relative h-64 w-full bg-gray-100">
                <Image
                  src={imageUrl}
                  alt={getCityName(bookingData.itinerary.segments[0].arrival.iataCode)}
                  fill
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/images/fallback-travel.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <div className="text-center p-6">
                    <FaSuitcase className="mx-auto text-4xl text-white mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">Packed your bags yet?</h2>
                    <p className="text-lg text-white">
                      Your adventure to {getCityName(bookingData.itinerary.segments[0].arrival.iataCode)} starts soon!
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-50 p-3 rounded-full text-blue-600 mt-1">
                      <FaPassport className="text-xl" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-800 mb-2.5">Before You Go</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                        <li>Check visa requirements and passport validity (minimum 6 months)</li>
                        <li>Register with your embassy if traveling internationally</li>
                        <li>Download offline maps and translation apps</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-green-50 p-3 rounded-full text-green-600 mt-1">
                      <FaSuitcaseRolling className="text-xl" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-800 mb-2.5">Packing Smart</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                        <li>Pack layers for changing weather conditions</li>
                        <li>Include universal power adapters and portable charger</li>
                        <li>Carry essential medications in original packaging</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-purple-50 p-3 rounded-full text-purple-600 mt-1">
                      <FaPlaneDeparture className="text-xl" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-800 mb-2.5">Airport Essentials</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                        <li>Arrive 3 hours early for international flights</li>
                        <li>Have printed copies of boarding passes and hotel reservations</li>
                        <li>Keep liquids under 100ml in a clear, resealable bag</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-amber-50 p-3 rounded-full text-amber-600 mt-1">
                      <FaMapMarkedAlt className="text-xl" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-800 mb-2.5">At Your Destination</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                        <li>Exchange some currency before leaving the airport</li>
                        <li>Save emergency contacts and local embassy info</li>
                        <li>Learn basic phrases in the local language</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setBookingData(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition duration-200"
            >
              Search Another Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const CountdownTimer = ({ departureTime }: { departureTime: string }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(departureTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(departureTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [departureTime]);

  function calculateTimeLeft(departureTime: string) {
    const difference = new Date(departureTime).getTime() - new Date().getTime();
    if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <span>
      {timeLeft.days > 0 && `${timeLeft.days}d `}
      {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
    </span>
  );
};