'use client';

import React, { useEffect, useState } from 'react';
import { DuffelPayments } from '@duffel/components';
import { FiArrowLeft, FiCheckCircle, FiCreditCard, FiLock } from 'react-icons/fi';

interface PaymentFormProps {
  clientToken: string;
  paymentIntentId?: string;
  amount: number;
  currency?: string;
  onPaymentSuccess: (paymentIntentId: string, paymentResult?: any) => void;
  onPaymentError: (error: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit?: (paymentData: {
    name: string;
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    token?: string;
  }) => Promise<void>;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  clientToken,
  paymentIntentId,
  amount,
  currency = 'USD',
  onPaymentSuccess,
  onPaymentError,
  loading: propLoading = false,
  error: propError = null,
  onSubmit
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Combine prop error and local error
  const error = propError || localError;
  const loading = propLoading || isProcessing;

  // Log when client token changes
  useEffect(() => {
    if (clientToken) {
      console.log('PaymentForm - Client token received, length:', clientToken.length);
      console.log('Token prefix:', clientToken.substring(0, 10) + '...');
      setLocalError(null);
    } else {
      console.warn('PaymentForm - No client token received');
    }
  }, [clientToken]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handlePaymentSuccess = async (paymentResult: any) => {
    console.log('Payment successful, payment intent ID:', paymentIntentId);
    
    // Safely log payment result with redacted sensitive data
    console.log('Payment result:', {
      ...(paymentResult || {}),
      // Redact sensitive data from logs
      payment_method: paymentResult?.payment_method ? '***REDACTED***' : undefined,
      card: paymentResult?.card ? '***REDACTED***' : undefined
    });

    if (paymentIntentId) {
      try {
        // Safely extract payment method details with fallbacks
        const paymentMethodType = paymentResult?.payment_method?.type || 'card';
        const lastFour = paymentResult?.payment_method?.card?.last4 || '••••';
        const cardBrand = paymentResult?.payment_method?.card?.brand || 'card';
        
        // Store the payment result in localStorage for the confirmation page
        const paymentData = {
          status: 'succeeded',
          paymentIntentId,
          amount: amount,
          currency: currency || 'EUR',
          timestamp: new Date().toISOString(),
          paymentMethod: paymentMethodType,
          lastFour: lastFour,
          brand: cardBrand
        };

        // Store the payment data in localStorage
        localStorage.setItem('lastPayment', JSON.stringify(paymentData));
        
        // Call the success handler with the payment result
        onPaymentSuccess(paymentIntentId);
        
      } catch (error) {
        console.error('Error processing payment success:', error);
        const errorMsg = 'Payment succeeded but encountered an error processing the result';
        setLocalError(errorMsg);
        onPaymentError(errorMsg);
      }
    } else {
      const errorMsg = 'Payment succeeded but no paymentIntentId was provided';
      console.error(errorMsg);
      setLocalError(errorMsg);
      onPaymentError(errorMsg);
    }
  };

  const handlePaymentError = (error: unknown) => {
    console.error('Payment error:', error);
    
    // Default error message
    let errorMessage = 'Payment processing failed';
    
    if (error === null || error === undefined) {
      // Handle null/undefined error
      errorMessage = 'No error details available';
    } else if (typeof error === 'string') {
      // Handle string errors
      errorMessage = error;
    } else if (typeof error === 'object') {
      const errorObj = error as Record<string, any>;
      
      // Handle Error objects or objects with a message property
      if (typeof errorObj.message === 'string') {
        errorMessage = errorObj.message;
      }
      
      // Handle nested error objects (like Axios errors)
      if (errorObj.error && typeof errorObj.error === 'object') {
        if (typeof errorObj.error.message === 'string') {
          errorMessage = errorObj.error.message;
        }
      }
      
      // Log additional debug info if available
      const debugInfo = { ...errorObj };
      if (debugInfo.message) delete debugInfo.message;
      if (debugInfo.error) delete debugInfo.error;
      
      if (Object.keys(debugInfo).length > 0) {
        console.error('Payment error details:', debugInfo);
      }
    }
    
    // Update local error state and notify parent
    setLocalError(errorMessage);
    onPaymentError(errorMessage);
  };

  const handleConfirmPayment = async () => {
    if (!paymentIntentId) {
      const errorMsg = 'No payment intent ID available';
      console.error(errorMsg);
      setLocalError(errorMsg);
      onPaymentError(errorMsg);
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch('/api/book-flight/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      onPaymentSuccess(paymentIntentId);
    } catch (err) {
      console.error('Payment confirmation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment confirmation failed';
      setLocalError(errorMessage); 
      onPaymentError(errorMessage);
    } finally {
      if (isMounted) {
        setIsProcessing(false);
      }
    }
  };



  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The actual payment handling is done by the DuffelPayments component
    // This just ensures the form is submitted properly
    console.log('Form submitted');
  };

  // Log when client token is received
  useEffect(() => {
    if (clientToken) {
      console.log('PaymentForm - Client token/secret received, length:', clientToken.length);
      console.log('Client token/secret prefix:', clientToken.substring(0, 10) + '...');
      console.log('Payment intent ID:', paymentIntentId);
      
      // Verify the token format (should be a JWT)
      try {
        const tokenParts = clientToken.split('.');
        if (tokenParts.length === 3) {
          console.log('Token appears to be a valid JWT');
          // Decode the payload (middle part)
          const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
          console.log('Token payload:', payload);
          
          // Log token type if available
          if (payload.type) {
            console.log('Token type:', payload.type);
          }
        } else if (clientToken.startsWith('pi_')) {
          console.log('Token appears to be a payment intent ID');
        } else {
          console.warn('Token does not appear to be a standard JWT');
        }
      } catch (error) {
        console.error('Error parsing token:', error);
        // Log the error but don't fail - the token might still be valid
      }
    }
  }, [clientToken, paymentIntentId]);

  // Debug: log props on mount/update
  useEffect(() => {
    console.log('PaymentForm props - amount:', amount, 'currency:', currency);
  }, [amount, currency]);

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-white p-4 sm:p-6 border-b border-gray-100">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <FiCreditCard className="mr-3 text-blue-600" />
            Payment Details
          </h3>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="bg-gray-50 rounded-md p-3 sm:p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total</span>
              <span className="text-lg sm:text-xl font-medium text-gray-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency || 'EUR'
                }).format(amount)}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Includes all taxes and fees</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-gray-50 p-2 sm:p-3 border-b border-gray-200">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700">Card Information</h4>
              </div>
              <div className="p-2 sm:p-3">
                <DuffelPayments
                  key={clientToken}
                  paymentIntentClientToken={clientToken}
                  onSuccessfulPayment={() => {
                    if (paymentIntentId) {
                      handlePaymentSuccess({
                        paymentIntentId,
                        status: 'succeeded',
                        timestamp: new Date().toISOString()
                      });
                    } else {
                      console.error('Payment succeeded but no paymentIntentId is available');
                      handlePaymentError('Payment succeeded but we encountered an issue. Please contact support.');
                    }
                  }}
                  onFailedPayment={(error) => {
                    console.error('Payment failed:', error);
                    handlePaymentError(error?.message || 'Payment failed. Please try again.');
                  }}
                />
              </div>
            </div>

            <div className="flex items-start text-xs sm:text-sm text-gray-500">
              <FiLock className="mt-0.5 mr-2 text-gray-400" />
              <span>Payments secured with 256-bit encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;