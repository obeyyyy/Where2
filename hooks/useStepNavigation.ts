// hooks/useStepNavigation.ts
import { useState, useCallback } from 'react';
import { ViewState } from '../types/trip-search.types';

export function useStepNavigation(initialState: ViewState = 'initial') {
  const [viewState, setViewState] = useState<ViewState>(initialState);

  const handleNext = useCallback(() => {
    if (viewState === 'initial') {
      setViewState('dates');
    } else if (viewState === 'dates') {
      setViewState('details');
    }
  }, [viewState]);

  const handleBack = useCallback(() => {
    if (viewState === 'details') {
      setViewState('dates');
    } else if (viewState === 'dates') {
      setViewState('initial');
    }
  }, [viewState]);

  const getCurrentStepIndex = useCallback(() => {
    const steps = ['initial', 'dates', 'details'];
    return steps.indexOf(viewState);
  }, [viewState]);

  return {
    viewState,
    setViewState,
    handleNext,
    handleBack,
    getCurrentStepIndex,
  };
}