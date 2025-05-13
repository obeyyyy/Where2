import React from "react";

interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface BookingSummaryProps {
  offerId: string;
  passengerData: PassengerInfo[];
}

const BookingSummary: React.FC<BookingSummaryProps> = ({ offerId, passengerData }) => {
  return (
    <div className="mb-6">
      <div className="mb-4 p-4 border rounded-xl bg-gray-50">
        <div className="font-semibold text-gray-700 mb-2">Selected Flight Offer ID:</div>
        <div className="text-sm text-gray-800 break-all">{offerId}</div>
      </div>
      <div className="mb-2 font-semibold text-gray-700">Passenger Details:</div>
      <ul className="space-y-2">
        {passengerData.map((p, idx) => (
          <li key={idx} className="p-3 border rounded-xl bg-white shadow-sm">
            <div className="font-medium">Passenger {idx + 1}</div>
            <div className="text-sm text-gray-600">{p.firstName} {p.lastName}</div>
            <div className="text-xs text-gray-500">Email: {p.email} | Phone: {p.phone}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BookingSummary;
