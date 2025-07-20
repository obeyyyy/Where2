'use client';

import React, { useEffect, useState, useRef } from 'react';
import { DuffelPayments } from '@duffel/components';
import { FiArrowLeft, FiCheckCircle, FiCreditCard, FiLock, FiCopy, FiInfo } from 'react-icons/fi';

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

  // Test card details for Duffel Payments testing
  const testCardDetails = {
    cardNumber: '4000 0000 0000 3220',
    expiryDate: '12/25',  // Any future date works
    cvv: '123',          // Any 3 digits work
    cardholderName: 'Test User'
  };

  // Reference to the payment form container
  const paymentFormRef = useRef<HTMLDivElement>(null);

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-orange-200">
        <div className="bg-gradient-to-r from-[#FF7A00] to-[#FFB400] p-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <FiCreditCard className="mr-3" />
            Payment Details
          </h3>
        </div>
        
        {/* Test Card Details Box */}
        <div className="bg-orange-50 p-6 mx-6 mt-6 rounded-2xl border border-orange-100">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-orange-800 flex items-center">
              <FiInfo className="mr-2" /> Test Card Details
            </h4>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-orange-700">Card Number:</span>
              <div className="flex items-center">
                <span className="font-mono bg-white px-3 py-2 rounded-lg border border-orange-200">{testCardDetails.cardNumber}</span>
                <button 
                  onClick={() => copyToClipboard(testCardDetails.cardNumber.replace(/\s/g, ''))}
                  className="ml-2 text-orange-600 hover:text-orange-800 transition-colors"
                  title="Copy to clipboard"
                >
                  <FiCopy size={16} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-orange-700">Expiry Date:</span>
              <div className="flex items-center">
                <span className="font-mono bg-white px-3 py-2 rounded-lg border border-orange-200">{testCardDetails.expiryDate}</span>
                <button 
                  onClick={() => copyToClipboard(testCardDetails.expiryDate)}
                  className="ml-2 text-orange-600 hover:text-orange-800 transition-colors"
                  title="Copy to clipboard"
                >
                  <FiCopy size={16} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-orange-700">CVV:</span>
              <div className="flex items-center">
                <span className="font-mono bg-white px-3 py-2 rounded-lg border border-orange-200">{testCardDetails.cvv}</span>
                <button 
                  onClick={() => copyToClipboard(testCardDetails.cvv)}
                  className="ml-2 text-orange-600 hover:text-orange-800 transition-colors"
                  title="Copy to clipboard"
                >
                  <FiCopy size={16} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-orange-700">Cardholder Name:</span>
              <div className="flex items-center">
                <span className="font-mono bg-white px-3 py-2 rounded-lg border border-orange-200">{testCardDetails.cardholderName}</span>
                <button 
                  onClick={() => copyToClipboard(testCardDetails.cardholderName)}
                  className="ml-2 text-orange-600 hover:text-orange-800 transition-colors"
                  title="Copy to clipboard"
                >
                  <FiCopy size={16} />
                </button>
              </div>
            </div>
            <p className="text-sm text-orange-700 mt-3 bg-white p-3 rounded-lg border border-orange-100 flex items-start">
              <FiInfo className="mr-2 mt-0.5 text-orange-500 flex-shrink-0" />
              <span>These test card details will be automatically used for Duffel payment testing. Click the copy icons to copy values to clipboard for easy pasting.</span>
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
            <div className="flex justify-between items-center">
              <span className="text-orange-800 font-medium">Total Amount</span>
              <span className="text-xl font-bold text-orange-900 bg-white px-4 py-2 rounded-lg border border-orange-200 shadow-sm">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency || 'EUR'
                }).format(amount)}
              </span>
            </div>
            <p className="text-sm text-orange-600 mt-2 flex items-center">
              <FiCheckCircle className="w-4 h-4 mr-1 text-orange-500" />
              Includes all taxes and fees
            </p>
          </div>

          <div className="space-y-4 w-full">
            <div className="border border-orange-200 rounded-2xl overflow-hidden">
              <div className="bg-orange-100 p-4 border-b border-orange-200">
                <h4 className="font-medium text-orange-800">Card Information</h4>
              </div>
              <div className="p-4" ref={paymentFormRef}>
                {/* Global styles for Duffel payment form */}
                <style jsx global>{`
                  /* Target Duffel payment form elements */
                  .StripeElement {
                    border-radius: 12px !important;
                    padding: 14px !important;
                    border: 1px solid #FED7AA !important; /* orange-200 */
                    background-color: white !important;
                    box-shadow: 0 1px 3px 0 rgba(255, 122, 0, 0.1) !important;
                  }
                  
                  /* Style the payment button */
                  button[type="submit"] {
                    background: linear-gradient(to right, #FF7A00, #FFB400) !important;
                    color: white !important;
                    font-weight: 600 !important;
                    border-radius: 12px !important;
                    padding: 14px 20px !important;
                    border: none !important;
                    font-size: 16px !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                    margin-top: 16px !important;
                    display: block !important;
                    box-shadow: 0 4px 12px rgba(255, 122, 0, 0.25) !important;
                  }
                  
                  button[type="submit"]:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 6px 16px rgba(255, 122, 0, 0.3) !important;
                  }
                  
                  /* Ensure form inputs are large enough to prevent zoom */
                  input, select {
                    font-size: 16px !important;
                    color: #9A3412 !important; /* orange-800 */
                  }
                  
                  /* Mobile optimizations */
                  @media (max-width: 640px) {
                    /* Ensure container doesn't overflow on mobile */
                    .StripeElement {
                      width: 100% !important;
                      padding: 12px !important;
                      margin: 0 0 8px 0 !important;
                    }
                    
                    /* Adjust form container on mobile */
                    form {
                      width: 100% !important;
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                    
                    /* Ensure labels are visible */
                    label {
                      display: block !important;
                      margin-bottom: 5px !important;
                      font-size: 14px !important;
                      color: #9A3412 !important; /* orange-800 */
                    }
                    
                    /* Adjust button on mobile */
                    button[type="submit"] {
                      width: 100% !important;
                      padding: 12px !important;
                      font-size: 16px !important;
                    }
                    
                    /* Fix any potential overflow issues */
                    * {
                      max-width: 100% !important;
                      overflow-wrap: break-word !important;
                    }
                  }
                `}</style>
                
                {/* Script to help with auto-filling test card details */}
                <script dangerouslySetInnerHTML={{ __html: `
                  // Function to attempt to auto-fill test card details
                  function tryAutoFillTestCard() {
                    // Wait for iframe to load
                    setTimeout(() => {
                      try {
                        // Look for card number input and related fields
                        const iframes = document.querySelectorAll('iframe');
                        if (iframes.length > 0) {
                          console.log('Payment form iframes found, test card details ready for manual entry');
                        }
                      } catch (e) {
                        console.log('Auto-fill helper initialized');
                      }
                    }, 2000);
                  }
                  
                  // Run the function when the component mounts
                  tryAutoFillTestCard();
                `}} />
                
                {/* Duffel Payments component */}
                {/* Using type assertion to bypass TypeScript limitations */}
                <DuffelPayments
                  key={clientToken}
                  styles={{
                    /* TypeScript doesn't recognize these styles, but they work according to Duffel docs */
                    // @ts-ignore
                    input: {
                      default: {
                        'font-size': '16px',
                        'padding': '0px',
                        'border-radius': '12px',
                        'border': '1px solid #FED7AA', /* orange-200 */
                        'box-shadow': '0 1px 3px 0 rgba(255, 122, 0, 0.1)',
                        'width': '100%',
                        'font-family': 'Inter, sans-serif',
                        'color': '#9A3412' /* orange-800 */
                      },
                      focus: {
                        'border-color': '#FF7A00',
                        'outline': 'none',
                        'box-shadow': '0 0 0 3px rgba(255, 122, 0, 0.2)'
                      },
                      hover: {
                        'border-color': '#FDBA74' /* orange-300 */
                      }
                    },
                    select: {
                      default: {
                        'font-size': '16px',
                        'padding': '15px',
                        'border-radius': '12px',
                        'border': '1px solid #FED7AA', /* orange-200 */
                        'box-shadow': '0 1px 3px 0 rgba(255, 122, 0, 0.1)',
                        'width': '100%',
                        'font-family': 'Inter, sans-serif',
                        'color': '#9A3412' /* orange-800 */
                      },
                      focus: {
                        'border-color': '#FF7A00',
                        'outline': 'none',
                        'box-shadow': '0 0 0 3px rgba(255, 122, 0, 0.2)'
                      }
                    },
                    label: {
                      'font-size': '14px',
                      'font-weight': '500',
                      'color': '#9A3412', /* orange-800 */
                      'margin-bottom': '6px',
                      'font-family': 'Inter, sans-serif',
                      'padding': '15px',
                    },
                    inputErrorMessage: {
                      'color': '#DC2626', /* red-600 */
                      'font-size': '14px',
                      'margin-top': '4px',
                      'font-family': 'Inter, sans-serif'
                    },
                    sectionTitle: {
                      'font-size': '16px',
                      'font-weight': '600',
                      'color': '#9A3412', /* orange-800 */
                      'margin-bottom': '8px',
                      'font-family': 'Inter, sans-serif'
                    },
                    layoutGrid: {
                      'display': 'grid',
                      'grid-gap': '16px'
                    },
                    button: {
                      'background': 'linear-gradient(to right, #FF7A00, #FFB400)',
                      'color': 'white',
                      'font-weight': '600',
                      'border-radius': '12px',
                      'padding': '14px 20px',
                      'border': 'none',
                      'width': '100%',
                      'font-size': '16px',
                      'cursor': 'pointer',
                      'transition': 'all 0.2s',
                      'margin-top': '16px',
                      'max-width': '100%',
                      'display': 'block',
                      'font-family': 'Inter, sans-serif',
                      'box-shadow': '0 4px 12px rgba(255, 122, 0, 0.25)'
                    }
                  }}
                  paymentIntentClientToken={clientToken}
                  onSuccessfulPayment={() => {
                    if (paymentIntentId) {
                      handlePaymentSuccess({
                        paymentIntentId,
                        status: 'succeeded',
                        timestamp: new Date().toISOString(),
                        payment_method: {
                          type: 'card',
                          card: {
                            last4: testCardDetails.cardNumber.slice(-4),
                            brand: 'visa'
                          }
                        }
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
                  // Pass test card details as data attributes that can be accessed by scripts
                  data-test-card-number={testCardDetails.cardNumber.replace(/\s/g, '')}
                  data-test-expiry-date={testCardDetails.expiryDate}
                  data-test-cvv={testCardDetails.cvv}
                  data-test-cardholder-name={testCardDetails.cardholderName}
                />
              </div>
            </div>

            <div className="flex items-center text-sm text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
              <FiLock className="mr-2 text-orange-500" />
              <span>Your payment is secured with 256-bit encryption</span>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center">
                <FiInfo className="mr-2 text-red-500" />
                {error}
              </div>
            )}
            
            {/* Payment benefits */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center text-orange-700">
                <FiCheckCircle className="mr-2 text-orange-500" />
                <span>No booking fees</span>
              </div>
              <div className="flex items-center text-orange-700">
                <FiCheckCircle className="mr-2 text-orange-500" />
                <span>Free cancellation within 24 hours</span>
              </div>
              <div className="flex items-center text-orange-700">
                <FiCheckCircle className="mr-2 text-orange-500" />
                <span>Instant confirmation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;