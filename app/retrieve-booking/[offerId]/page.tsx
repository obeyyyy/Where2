'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingRetrieval from '../page';

interface PageProps {
  params: {
    offerId: string;
  };
}

const validateOrderId = (id: string) => /^[a-zA-Z0-9_-]{8,64}$/.test(id);

export default function OfferIdPage({
  params,
}: PageProps) {
  const router = useRouter();
  
  useEffect(() => {
    if (!validateOrderId(params.offerId)) {
      router.push('/retrieve-booking?error=invalid_id');
    }
  }, [params.offerId, router]);

  return validateOrderId(params.offerId) ? 
    <BookingRetrieval searchParams={{ prefilledOrderId: params.offerId }} /> :
    null;
}
