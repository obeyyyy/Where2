"use client";
import React, { useState, useEffect } from "react";
import { useTripCart } from "../components/TripCartContext";
import { FiCheckCircle, FiCalendar, FiMapPin, FiDollarSign, FiUsers } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FlightItineraryCard from "../components/FlightItineraryCard";
import airportsJson from 'airports-json';

interface PriceBreakdown {
  total: number;
  currency: string;
  base: number;
  fees: number;
}

export default function TripSummaryPage() {
  const { trip: contextTrip, setTrip, isLoading, isValidTrip } = useTripCart();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [trip, setTripState] = useState<any>(null);

  useEffect(() => {
    const loadTrip = () => {
      try {
        const storedTrip = localStorage.getItem('current_booking_offer');
        if (storedTrip) {
          const parsedTrip = JSON.parse(storedTrip);
          setTripState(parsedTrip);
          setTrip(parsedTrip);
          return;
        }
        
        if (contextTrip) {
          setTripState(contextTrip);
        }
      } catch (error) {
        console.error('Error loading trip data:', error);
      } finally {
        setIsClient(true);
      }
    };

    loadTrip();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'current_booking_offer') {
        try {
          if (e.newValue) {
            const newTrip = JSON.parse(e.newValue);
            setTripState(newTrip);
            setTrip(newTrip);
          }
        } catch (error) {
          console.error('Error parsing updated trip data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [contextTrip, setTrip]);

  if (isLoading || !isClient) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 text-center">
        <div className="animate-pulse">
          <div className="h-20 w-20 mx-auto bg-gray-200 rounded-full mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
          <div className="h-12 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  if ((!trip || !isValidTrip(trip)) && isClient) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_booking_offer');
      localStorage.removeItem('tripCart');
    }
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          <p>No valid trip found</p>
        </div>
        <Link 
          href="/" 
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const { itineraries = [], price, searchParams = {} } = trip.trip || {};
  const isRoundTrip = searchParams.tripType === 'roundtrip' || itineraries?.length > 1;
  const paymentConfirmed = trip?.paymentStatus === 'succeeded' || trip?.paymentConfirmed || trip?.confirmed;

  // Calculate prices safely
  const calculatePrices = (): PriceBreakdown => {
    try {
      const total = parseFloat(price?.total?.toString() || '0');
      const base = parseFloat(price?.breakdown?.basePrice?.toString() || '0');
      const fees = total - base;
      
      return {
        total,
        currency: price?.currency || price?.breakdown?.currency || 'EUR',
        base,
        fees
      };
    } catch {
      return {
        total: 0,
        currency: 'EUR',
        base: 0,
        fees: 0
      };
    }
  };

  const prices = calculatePrices();

  return (
    <div className="min-h-screen bg-[#FFFDF6] p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <FiCheckCircle className="text-green-500 text-3xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {paymentConfirmed ? 'Booking Confirmed!' : 'Booking Received'}
          </h1>
          <p className="text-gray-600">
            {paymentConfirmed 
              ? `Your booking reference is ${trip.trip.id}`
              : 'Your booking is being processed'}
          </p>
        </div>

        {/* Flight Cards */}
        <div className="grid gap-6 mb-8">
          {itineraries[0] && (
            <FlightItineraryCard 
              itinerary={itineraries[0]}
              type="outbound"
              airports={Object.values(airportsJson)}
              className="bg-white rounded-xl shadow-sm"
            />
          )}
          
          {isRoundTrip && itineraries[1] && (
            <FlightItineraryCard 
              itinerary={itineraries[1]}
              type="return"
              airports={Object.values(airportsJson)}
              className="bg-white rounded-xl shadow-sm"
            />
          )}
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Booking Details</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center">
              <FiCalendar className="text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Booked on</p>
                <p className="font-medium">
                  {new Date(trip.trip.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <FiUsers className="text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Passengers</p>
                <p className="font-medium">{searchParams.travelers || 1}</p>
              </div>
            </div>

            <div className="flex items-center">
              <FiDollarSign className="text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Total Paid</p>
                <p className="font-medium">
                  {prices.currency} {prices.total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <FiMapPin className="text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">
                  {paymentConfirmed ? 'confirmed' : 'processing'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/" 
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium text-center hover:bg-orange-600 transition-colors"
          >
            Back to Home
          </Link>
          <button 
            onClick={() => window.print()}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium text-center hover:bg-gray-50 transition-colors"
          >
            Print Confirmation
          </button>
        </div>
      </div>
    </div>
  );
}
