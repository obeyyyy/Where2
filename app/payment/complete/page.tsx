import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent') || searchParams.get('payment_intent_id');
    const paymentStatus = searchParams.get('status');

    if (!paymentIntentId) {
      setStatus('failed');
      return;
    }

    // If Duffel already tells us the payment status via query string, we can use it.
    if (paymentStatus === 'succeeded') {
      setStatus('success');
      // Store minimal info so the confirmation page can read it
      localStorage.setItem(
        'lastPayment',
        JSON.stringify({ paymentIntentId, status: 'succeeded', timestamp: new Date().toISOString() })
      );

      // Redirect user to confirmation page after short delay
      setTimeout(() => router.replace('/payment/confirmation'), 1500);
      return;
    }

    // Otherwise fetch the payment intent status from our backend
    fetch(`/api/payments/${paymentIntentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'succeeded') {
          setStatus('success');
          localStorage.setItem('lastPayment', JSON.stringify({ paymentIntentId, status: 'succeeded', timestamp: new Date().toISOString() }));
          router.replace('/payment/confirmation');
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      {status === 'loading' && <p className="text-gray-700 text-lg">Checking payment status...</p>}
      {status === 'success' && <p className="text-green-600 text-lg">Payment Successful! Redirecting...</p>}
      {status === 'failed' && <p className="text-red-600 text-lg">Payment Failed. Please contact support.</p>}
    </div>
  );
}
