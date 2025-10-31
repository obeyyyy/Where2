/**
 * Utility functions for hotel-related operations
 */

import { Room, RoomRate, HotelDetails } from '@/types/hotel.types';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x600?text=Image+Not+Available';

export const normalizePhotos = (photos: any[] | undefined): { url: string; caption: string }[] => {
  if (!Array.isArray(photos)) return [];
  
  return photos
    .map((photo) => {
      if (!photo) return null;
      if (typeof photo === 'string') {
        return { url: photo, caption: '' };
      }
      if (typeof photo === 'object') {
        const url = photo.url || photo.original;
        if (url) {
          return { 
            url,
            caption: photo.caption || photo.description || ''
          };
        }
      }
      return null;
    })
    .filter((p): p is { url: string; caption: string } => p !== null && typeof p?.url === 'string');
};

export const formatDisplayDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
};

export const formatPrice = (amount: string, currency: string = 'USD'): string => {
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) return 'Price not available';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountNum);
};

export const calculateNights = (checkIn: string, checkOut: string): number => {
  try {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating nights:', error);
    return 0;
  }
};

export const getDefaultRoomPhoto = (room: Room): string => {
  return room.photos[0]?.url || PLACEHOLDER_IMAGE;
};

export const getDefaultHotelPhoto = (hotel: HotelDetails): string => {
  return hotel.accommodation.photos[0]?.url || PLACEHOLDER_IMAGE;
};

export const getCancellationPolicyText = (policy?: { type: string; description?: string }): string => {
  if (!policy) return 'Cancellation policy not available';
  
  switch (policy.type) {
    case 'FREE_CANCELLATION':
      return 'Free cancellation available';
    case 'NON_REFUNDABLE':
      return 'Non-refundable';
    case 'PARTIALLY_REFUNDABLE':
      return 'Partially refundable';
    default:
      return policy.description || 'Cancellation policy varies';
  }
};
