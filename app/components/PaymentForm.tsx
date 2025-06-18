'use client';

import React, { useEffect, useState } from 'react';
import { DuffelPayments } from '@duffel/components';
import { FiArrowLeft, FiCheckCircle, FiCreditCard } from 'react-icons/fi';

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
    <div className="m-2 mt-8 bg-gray-50 flex items-center justify-center sm:px-4">
      <div className=" w-full max-w-sm mx-auto"> {/* Max width reduced, space-y reduced */}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded-lg border border-red-300 text-sm" role="alert">
            <p className="font-semibold">Payment Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {/* Main Payment Card */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"> {/* Reduced padding, softer shadow */}
          <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center"> {/* Smaller heading */}
            <FiCreditCard className="mr-2 text-blue-600 text-2xl" /> {/* Smaller icon */}
            Payment Details
          </h3>

          {/* Loading State for Payment Form */}
          {!clientToken ? (
            <div className="p-4 bg-blue-50 text-blue-700 rounded-md border border-blue-200 flex items-center justify-center space-x-2 text-sm"> {/* Reduced padding, font size */}
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="font-medium">Loading payment form...</p>
            </div>
          ) : (
            <div className="space-y-4"> {/* Reduced space-y */}
              {/* Payment Summary */}
              <div className="rounded-md overflow-hidden border border-blue-300"> {/* Softer border radius */}
                <div className="bg-blue-600 text-white p-3.5"> {/* Reduced padding */}
                  <div className="flex justify-between items-center text-lg"> {/* Smaller font size for summary */}
                    <h4 className="font-semibold">Payment Summary</h4>
                    <span className="font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'EUR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(amount)}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">Includes all taxes and fees</p> {/* Reduced margin */}
                </div>

                <div className="p-3 bg-blue-50"> {/* Reduced padding */}
                  <div className="flex items-center text-sm text-blue-800">
                    <FiCheckCircle className="mr-2 text-blue-600" />
                    <span>Secure payment processing</span>
                  </div>
                  {paymentIntentId && (
                    <p className="text-xs text-blue-600 pl-5 break-words">Transaction ID: <span className="font-mono">{paymentIntentId}</span></p> 
                  )}

                </div>
              </div>

              {/* Card Details Input */}
              <div className="border border-gray-300 rounded-md overflow-hidden"> {/* Softer border radius */}
                <div className="p-3 bg-gray-50 border-b border-gray-200"> {/* Reduced padding */}
                  <h4 className="font-medium text-gray-700 text-base">Enter Card Details</h4> {/* Smaller heading */}
                </div>
                <div className="p-4"> {/* Reduced padding */}
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

              {/* Security Message */}
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 p-2 bg-gray-100 rounded-md"> {/* Reduced padding, smaller font */}
                <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Your payment is securely processed by our partners **Duffel** and **Stripe**.</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center transition-colors duration-200"
            disabled={isProcessing || loading}
          >
            <FiArrowLeft className="mr-1.5" /> Back
          </button>

          {loading && (
            <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md shadow-sm"> {/* Reduced padding */}
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">Processing payment...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;