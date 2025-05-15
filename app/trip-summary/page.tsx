"use client";
import React from "react";
import { useTripCart } from "../components/TripCartContext";
import TripCard from "../components/TripCard";

export default function TripSummaryPage() {
  const { trip } = useTripCart();
  if (!trip) {
    return <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow text-center text-gray-500">No trip selected yet.</div>;
  }
  // Pass dummy budget and searchParams if needed (customize as needed)
  return (
    <div className="max-w-3xl mx-auto mt-10">
      <TripCard trip={trip.trip} budget={9999} searchParams={trip.trip.searchParams || {}} />
    </div>
  );
}
