"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useInView } from "react-intersection-observer";

interface AnimatedStepCharacterProps {
  lottieUrl: string;
  alt: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  rendererSettings?: object;
}

// Dynamically import the Lottie player with no SSR to avoid hydration issues
const Player = dynamic(() => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-orange-100 rounded-full w-full h-full"></div>
});

const AnimatedStepCharacter: React.FC<AnimatedStepCharacterProps> = ({
  lottieUrl,
  alt,
  className = "w-32 h-32 md:w-40 md:h-40",
  loop = true,
  autoplay = true,
  speed = 0.8, // Slightly reduced speed for smoother animation
  rendererSettings = {
    preserveAspectRatio: "xMidYMid slice",
    progressiveLoad: true,
  },
}) => {
  // Use intersection observer to only play animations when in view
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.1,
    rootMargin: "100px",
  });

  // Track if the component has been loaded
  const [isLoaded, setIsLoaded] = useState(false);
  const playerRef = useRef<any>(null);

  // Handle visibility changes to pause/play animations
  useEffect(() => {
    if (playerRef.current) {
      if (inView && !isLoaded) {
        playerRef.current.play();
        setIsLoaded(true);
      } else if (!inView && isLoaded) {
        playerRef.current.pause();
      } else if (inView && isLoaded) {
        playerRef.current.play();
      }
    }
  }, [inView, isLoaded]);

  return (
    <div ref={ref} className={`flex items-center justify-center ${className}`}>
      {inView && (
        <Player
          // Using a callback ref instead of direct ref prop
          lottieRef={instance => {
            playerRef.current = instance;
          }}
          autoplay={autoplay && inView}
          loop={loop}
          speed={speed}
          src={lottieUrl}
          style={{ 
            height: "100%", 
            width: "100%", 
            willChange: "transform", // Optimize for animations
            transform: "translateZ(0)" // Force GPU acceleration
          }}
          aria-label={alt}
          rendererSettings={rendererSettings}
          onEvent={event => {
            if (event === 'load') setIsLoaded(true);
          }}
          background="transparent"
          className="transform-gpu" // Force GPU acceleration with Tailwind
        />
      )}
    </div>
  );
};

export default AnimatedStepCharacter;
