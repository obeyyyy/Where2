"use client";

import React from "react";
import dynamic from "next/dynamic";

interface AnimatedStepCharacterProps {
  lottieUrl: string;
  alt: string;
}

const Player = dynamic(() => import("@lottiefiles/react-lottie-player").then(mod => mod.Player), {
  ssr: false
});

const AnimatedStepCharacter: React.FC<AnimatedStepCharacterProps> = ({ lottieUrl, alt }) => {
  return (
    <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
      <Player
        autoplay
        loop
        src={lottieUrl}
        style={{ height: "100%", width: "100%" }}
        aria-label={alt}
      />
    </div>
  );
};

export default AnimatedStepCharacter;
