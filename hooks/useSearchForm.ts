// hooks/useSearchForm.ts
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FormData, AirportOption } from '../types/search.types';
import { DEFAULT_FORM_DATA } from '../app/constants/search.constants';
import {
  validateFlightSearch,
  validateHotelSearch,
  buildFlightSearchParams,
  buildHotelSearchParams,
  paramsToQueryString,
} from '../app/utils/search.utils';

export function useSearchForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string | number | AirportOption | null) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      // Clear errors when user makes changes
      if (errors.length > 0) {
        setErrors([]);
      }
    },
    [errors.length]
  );

  const handleFlightSearch = useCallback(
    async (tripType: string) => {
      setIsSubmitting(true);
      setErrors([]);

      const validation = validateFlightSearch(formData, tripType);

      if (!validation.isValid) {
        setErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }

      try {
        const params = buildFlightSearchParams(formData, tripType);
        const queryString = paramsToQueryString(params);
        
        router.push(`/search?${queryString}`);
      } catch (error) {
        console.error('Flight search error:', error);
        setErrors(['An error occurred while searching for flights. Please try again.']);
        setIsSubmitting(false);
      }
    },
    [formData, router]
  );

  const handleHotelSearch = useCallback(
    async () => {
      setIsSubmitting(true);
      setErrors([]);

      const validation = validateHotelSearch(formData);

      if (!validation.isValid) {
        setErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }

      try {
        const params = buildHotelSearchParams(formData);
        const queryString = paramsToQueryString(params);
        
        router.push(`/hotel?${queryString}`);
      } catch (error) {
        console.error('Hotel search error:', error);
        setErrors(['An error occurred while searching for hotels. Please try again.']);
        setIsSubmitting(false);
      }
    },
    [formData, router]
  );

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors([]);
    setIsSubmitting(false);
  }, []);

  return {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleFlightSearch,
    handleHotelSearch,
    resetForm,
  };
}

