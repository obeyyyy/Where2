import React from 'react';
import HotelSentiment from './HotelSentiment';
import { useRouter } from 'next/navigation';

interface HotelInfo {
  price: string;
  currency: string;
  name?: string;
  offerId?: string;
  totalPrice?: string;
  rating?: number;
  address?: string;
  amenities?: string[];
  searchResultId?: string;
  accommodation_id?: string;
  check_in_date?: string;
  check_out_date?: string;
  rooms?: number;
  guests?: Array<{ type: string; age?: number }>;
}

interface HotelCardProps {
  hotel: HotelInfo;
  idx: number;
  selected: boolean;
  nights: number | null;
  onSelect: () => void;
  sentiment?: any;
  loadingSentiment?: boolean;
  sentimentError?: string;
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, idx, selected, nights, onSelect, sentiment, loadingSentiment, sentimentError }) => {
  const router = useRouter();
  return (
    <div
      key={hotel.offerId || idx}
      id={`hotel-card-${hotel.offerId || idx}`}
      className={`min-w-[220px] max-w-[220px] p-4 rounded-xl border flex-shrink-0 transition-all duration-300 cursor-pointer ${
        selected
          ? 'bg-white shadow-md border-[#FFA500] scale-[1.03] z-10'
          : 'bg-white/70 hover:bg-white hover:shadow-sm border-transparent hover:border-yellow-200'
      }`}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSelect) {
          onSelect();
        } else if (hotel.searchResultId && hotel.accommodation_id) {
          // Navigate to hotel details with all required parameters
          const url = `/hotel/${hotel.searchResultId}:${hotel.accommodation_id}:${hotel.check_in_date || ''}:${hotel.check_out_date || ''}:${hotel.rooms || 1}:${hotel.guests?.length || 1}`;
          window.open(url, '_blank');
        }
      }}
      onFocus={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base text-gray-800 truncate">{hotel.name || 'Hotel'}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            {hotel.rating ? (
              <div className="flex items-center gap-0.5" title={`${hotel.rating} star${hotel.rating > 1 ? 's' : ''}`}>
                {[...Array(Math.round(hotel.rating))].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.176 0l-3.38 2.455c-.784.57-1.838-.197-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                  </svg>
                ))}
              </div>
            ) : null}
            {idx === 0 && (
              <span className="text-[10px] font-medium text-[#FFA500] bg-yellow-50 rounded-full px-2 py-0.5 border border-yellow-200">Best Value</span>
            )}
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="text-[#FFA500] font-bold">{hotel.currency} {parseFloat(hotel.price).toFixed(0)}</div>
          <div className="text-[10px] text-gray-500">per night</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center text-xs text-gray-600">
          <svg className="w-3.5 h-3.5 text-gray-400 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{hotel.address || 'Address not provided'}</span>
        </div>
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 3).map((am, i) => (
              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-100">
                {am}
              </span>
            ))}
            {hotel.amenities.length > 3 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-500">
                +{hotel.amenities.length - 3}
              </span>
            )}
          </div>
        )}
        {loadingSentiment ? (
          <div className="text-xs text-gray-400 mt-2">Loading sentiment...</div>
        ) : sentimentError ? (
          <div className="text-xs text-red-400 mt-2">{sentimentError}</div>
        ) : (
          <HotelSentiment sentiment={sentiment} />
        )}
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5">
              {nights ? `Total for ${nights} night${nights > 1 ? 's' : ''}` : 'Total price'}
            </div>
            <div className="font-bold text-[#FFA500]">{hotel.currency} {hotel.totalPrice}</div>
          </div>
          <button
            className={`px-3 py-1.5 rounded font-medium text-xs transition-all duration-200 ${selected ? 'bg-[#FFA500] text-white shadow-sm hover:bg-[#FF8C00]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'}`}
            type="button"
            tabIndex={-1}
          >
            {selected ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
