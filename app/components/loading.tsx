'use client';
import React from 'react';
import AnimatedStepCharacter from './AnimatedStepCharacter';
import { motion } from 'framer-motion';

interface LoadingProps {
  lottieUrl: string;
  alt: string;
  message?: string;
}

export default function Loading({ lottieUrl, alt, message = 'Finding your perfect trip...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full py-8">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="relative aspect-square w-[180px] xs:w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px] mx-auto">
          <AnimatedStepCharacter lottieUrl={lottieUrl} alt={alt} className="w-full h-full" />
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mt-4"
        >
          <p className="text-lg sm:text-xl font-medium text-gray-700">{message}</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </motion.div>
      </div>
    </div>
  );
}
