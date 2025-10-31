import React from 'react';
import { Room, RoomRate } from '@/types/hotel.types';
import { FiChevronLeft, FiChevronRight, FiCheck, FiX, FiInfo, FiCreditCard, FiStar, FiClock } from 'react-icons/fi';
import { formatPrice, getCancellationPolicyText, formatDisplayDate } from '@/app/utils/hotel.utils';

interface RoomCardProps {
  room: Room;
  isSelected: boolean;
  onSelect: (rate: RoomRate) => void;
  expandedRates: Record<string, boolean>;
  activePhotoIndex: number;
  onToggleRate: (rateId: string) => void;
  onPhotoChange: (newIndex: number) => void;
  checkInDate: string;
  checkOutDate: string;
}

const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isSelected,
  onSelect,
  expandedRates,
  activePhotoIndex,
  onToggleRate,
  onPhotoChange,
  checkInDate,
  checkOutDate
}) => {
  const hasMultiplePhotos = room.photos.length > 1;
  const nights = Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24));

  const renderRateCard = (rate: RoomRate) => {
    const isExpanded = expandedRates[rate.id] || false;
    const isFreeCancellation = rate.cancellation_policy?.type === 'FREE_CANCELLATION';
    const isNonRefundable = rate.cancellation_policy?.type === 'NON_REFUNDABLE';
    
    return (
      <div 
        key={rate.id}
        className={`border rounded-lg overflow-hidden transition-all duration-200 ${
          isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-gray-800">{rate.name}</h4>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <span className="flex items-center">
                  <FiClock className="mr-1" /> 
                  {rate.board_type?.replace(/_/g, ' ')}
                </span>
                {rate.rate_plan_code && (
                  <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {rate.rate_plan_code}
                  </span>
                )}
              </div>
              
              {rate.deal_types && rate.deal_types.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {rate.deal_types.map((deal, i) => (
                    <span key={i} className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      {deal}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(rate.total_amount, rate.total_currency)}
              </div>
              <div className="text-xs text-gray-500">
                for {nights} {nights === 1 ? 'night' : 'nights'}
              </div>
              {rate.base_amount && rate.tax_amount && (
                <div className="text-xs text-gray-500">
                  {formatPrice(rate.base_amount, rate.base_currency)} + {formatPrice(rate.tax_amount, rate.tax_currency)} taxes
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 flex items-center">
            <button
              onClick={() => onToggleRate(rate.id)}
              className="text-sm text-blue-600 hover:underline flex items-center"
            >
              {isExpanded ? 'Hide details' : 'View details'}
              <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
            </button>
            
            <div className="ml-4 flex items-center text-sm">
              <div className={`flex items-center ${isFreeCancellation ? 'text-green-600' : isNonRefundable ? 'text-red-600' : 'text-amber-600'}`}>
                {isFreeCancellation ? (
                  <>
                    <FiCheck className="mr-1" /> Free cancellation
                  </>
                ) : isNonRefundable ? (
                  <>
                    <FiX className="mr-1" /> Non-refundable
                  </>
                ) : (
                  <>
                    <FiInfo className="mr-1" /> {getCancellationPolicyText(rate.cancellation_policy)}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Room Amenities</h5>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {room.amenities.slice(0, 5).map((amenity, i) => (
                      <li key={i} className="flex items-center">
                        <FiCheck className="text-green-500 mr-2" /> {amenity}
                      </li>
                    ))}
                    {room.amenities.length > 5 && (
                      <li className="text-sm text-blue-600">+{room.amenities.length - 5} more</li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Rate Details</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Room rate:</span>
                      <span>{formatPrice(rate.base_amount || rate.total_amount, rate.base_currency || rate.total_currency)}</span>
                    </div>
                    {rate.tax_amount && (
                      <div className="flex justify-between">
                        <span>Taxes & fees:</span>
                        <span>{formatPrice(rate.tax_amount, rate.tax_currency || rate.total_currency)}</span>
                      </div>
                    )}
                    {rate.fee_amount && (
                      <div className="flex justify-between">
                        <span>Fees:</span>
                        <span>{formatPrice(rate.fee_amount, rate.fee_currency || rate.total_currency)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="flex justify-between font-semibold">
                      <span>Total for {nights} {nights === 1 ? 'night' : 'nights'}:</span>
                      <span>{formatPrice(rate.total_amount, rate.total_currency)}</span>
                    </div>
                  </div>
                  
                  {rate.available_payment_methods && rate.available_payment_methods.length > 0 && (
                    <div className="mt-3">
                      <h6 className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <FiCreditCard className="mr-1" /> Payment Methods
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {rate.available_payment_methods.map((method, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {method.join(' / ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {rate.supported_loyalty_programme && (
                    <div className="mt-3 text-sm">
                      <div className="flex items-center text-amber-700">
                        <FiStar className="mr-1" />
                        <span>{rate.supported_loyalty_programme} members may receive benefits</span>
                        {rate.loyalty_programme_required && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Membership required
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {rate.conditions && rate.conditions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="font-medium text-gray-700 mb-2">Important Information</h5>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {rate.conditions.map((condition, i) => (
                      <li key={i} className="flex">
                        <span className="text-blue-500 mr-2">•</span>
                        <div>
                          {condition.title && <span className="font-medium">{condition.title}: </span>}
                          <span>{condition.description}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {rate.cancellation_timeline && rate.cancellation_timeline.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="font-medium text-gray-700 mb-2">Cancellation Policy</h5>
                  <div className="space-y-2 text-sm">
                    {rate.cancellation_timeline.map((timeline, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>Before {new Date(timeline.before).toLocaleDateString()}:</span>
                        <span className="font-medium">
                          {parseFloat(timeline.refund_amount) > 0 
                            ? `Refund ${formatPrice(timeline.refund_amount, timeline.currency)}` 
                            : 'Non-refundable'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => onSelect(rate)}
            className={`mt-4 w-full py-2 px-4 rounded-md font-medium text-center transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {isSelected ? 'Selected' : 'Select Room'}
          </button>
          
          {rate.available_rooms !== undefined && rate.available_rooms > 0 && (
            <div className="mt-2 text-xs text-right text-gray-500">
              Only {rate.available_rooms} {rate.available_rooms === 1 ? 'room' : 'rooms'} left at this price
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Room Photos */}
          <div className="relative w-full md:w-1/3 h-48 rounded-lg overflow-hidden bg-gray-100">
            {room.photos.length > 0 ? (
              <>
                <img
                  src={room.photos[activePhotoIndex]?.url}
                  alt={room.photos[activePhotoIndex]?.caption || `Room ${room.name}`}
                  className="w-full h-full object-cover"
                />
                
                {hasMultiplePhotos && (
                  <>
                    <button
                      onClick={() => onPhotoChange(activePhotoIndex - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-1.5 rounded-full hover:bg-black/50 transition-colors"
                      aria-label="Previous photo"
                    >
                      <FiChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => onPhotoChange(activePhotoIndex + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-1.5 rounded-full hover:bg-black/50 transition-colors"
                      aria-label="Next photo"
                    >
                      <FiChevronRight size={20} />
                    </button>
                    
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
                      {room.photos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => onPhotoChange(index)}
                          className={`w-2 h-2 rounded-full ${index === activePhotoIndex ? 'bg-white' : 'bg-white/50'}`}
                          aria-label={`Go to photo ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No photos available
              </div>
            )}
          </div>
          
          {/* Room Details */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
            <p className="mt-1 text-gray-600">{room.description}</p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              {room.beds.length > 0 && (
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Beds:</span>{' '}
                  {room.beds.map((bed, i) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      {bed.count} {bed.type.toLowerCase()}{bed.count > 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              )}
              
              {room.room_size?.square_meters > 0 && (
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Size:</span>{' '}
                  {room.room_size.square_meters} m² ({room.room_size.square_feet} ft²)
                </div>
              )}
              
              <div className="text-sm text-gray-700">
                <span className="font-medium">Max Occupancy:</span> {room.max_occupancy} {room.max_occupancy === 1 ? 'person' : 'people'}
              </div>
            </div>
            
            {room.amenities.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1.5">
                  {room.amenities.slice(0, 5).map((amenity, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {amenity}
                    </span>
                  ))}
                  {room.amenities.length > 5 && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      +{room.amenities.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Room Rates */}
        <div className="mt-6 space-y-4">
          <h4 className="text-lg font-semibold text-gray-800">Available Rates</h4>
          
          <div className="space-y-4">
            {room.rates.length > 0 ? (
              room.rates.map(rate => renderRateCard(rate))
            ) : (
              <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-center">
                No rates available for the selected dates
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
