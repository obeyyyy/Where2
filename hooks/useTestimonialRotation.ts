// hooks/useTestimonialRotation.ts
import { useState, useEffect } from 'react';

interface UseTestimonialRotationProps {
  totalCount: number;
  interval?: number;
}

export function useTestimonialRotation({
  totalCount,
  interval = 5000,
}: UseTestimonialRotationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalCount);
    }, interval);

    return () => clearInterval(timer);
  }, [totalCount, interval]);

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + totalCount) % totalCount);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalCount);
  };

  return {
    currentIndex,
    goToIndex,
    goToPrevious,
    goToNext,
  };
}