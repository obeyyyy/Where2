import React from "react";

interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface AirportInfo {
  iata: string;
  name: string;
}

interface AncillaryItem {
  title?: string;
  type?: string;
  details?: string;
  amount?: number;
  quantity?: number;
  selected?: boolean;
}

interface BookingSummaryProps {
  offerId: string;
  passengerData: PassengerInfo[];
  originAirport: AirportInfo;
  destinationAirport: AirportInfo;
  ancillaryItems?: AncillaryItem[];
  currency?: string;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({ offerId, passengerData, originAirport, destinationAirport, ancillaryItems = [], currency = 'EUR' }) => {
  return (
    <div className="mb-6">
      <div className="mb-4 p-4 border rounded-xl bg-gray-50">
        <div className="font-semibold text-gray-700 mb-2">Selected Flight Offer ID:</div>
        <div className="text-sm text-gray-800 break-all mb-4">{offerId}</div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mb-2">
          <div>
            <span className="font-semibold text-gray-700">Origin: </span>
            <span className="text-gray-900">{originAirport.iata} - {originAirport.name}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Destination: </span>
            <span className="text-gray-900">{destinationAirport.iata} - {destinationAirport.name}</span>
          </div>
        </div>
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
      
      {/* Ancillary Options */}
      {ancillaryItems && ancillaryItems.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 font-semibold text-gray-700">Selected Ancillary Options:</div>
          <ul className="space-y-2">
            {ancillaryItems.map((item, idx) => (
              <li key={idx} className="p-3 border rounded-xl bg-white shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{item.title || item.type || 'Extra Service'}</div>
                    <div className="text-sm text-gray-600">{item.details || (item.quantity ? `Quantity: ${item.quantity}` : '')}</div>
                  </div>
                  <div className="text-sm font-semibold">
                    {typeof item.amount === 'number' ? `${currency} ${item.amount.toFixed(2)}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BookingSummary;
