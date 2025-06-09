"use client";

import React from "react";
import dynamic from "next/dynamic";

interface AnimatedStepCharacterProps {
  lottieUrl: string;
  alt: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
}

const Player = dynamic(() => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player), {
  ssr: false,
});

const AnimatedStepCharacter: React.FC<AnimatedStepCharacterProps> = ({
  lottieUrl,
  alt,
  className = "w-32 h-32 md:w-40 md:h-40",
  loop = true,
  autoplay = true,
  speed = 1,
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Player
        autoplay={autoplay}
        loop={loop}
        speed={speed}
        src={lottieUrl}
        style={{ height: "100%", width: "100%" }}
        aria-label={alt}
      />
    </div>
  );
};

export default AnimatedStepCharacter;
