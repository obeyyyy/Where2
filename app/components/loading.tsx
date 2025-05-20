'use client';

import { motion, useCycle } from 'framer-motion';
import { useState } from 'react';

export default function Loading() {
  const [index, cycleIndex] = useCycle(0, 1, 2, 3, 4);
  const words = ['trips', 'flights', 'vacations', 'hashtags', 'stays'];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col items-center space-y-8 pb-20">
      {/* Spinner */}
      <motion.div 
        className="w-24 h-24 border-4 border-gray-500 rounded-full border-r-[#FFB800]"
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1],
          borderColor: isHovered ? '#FF8C00' : 'gray-500'
        }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop"
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Animated Loading Text */}
      <div className="text-center">
        <motion.p 
          className="text-3xl font-semibold text-gray-600"
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: {
              duration: 0.8,
              ease: "easeOut"
            }
          }}
        >
          loading
        </motion.p>
        <div className="relative h-16">
          <div className="absolute inset-y-0 left-0 flex flex-col space-y-3">
            {words.map((word, i) => (
              <motion.span 
                key={word}
                className="text-2xl font-medium text-[#FFB800]"
                initial={{ 
                  opacity: 0,
                  y: -30,
                  scale: 0.8
                }}
                animate={{ 
                  opacity: i === index ? 1 : 0, 
                  y: i === index ? 0 : -30,
                  scale: i === index ? 1 : 0.8
                }}
                transition={{ 
                  duration: 0.8,
                  ease: "easeInOut",
                  delay: i * 0.2
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
