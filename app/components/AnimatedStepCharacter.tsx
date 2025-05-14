import React from "react";
import { Player } from "@lottiefiles/react-lottie-player";

interface AnimatedStepCharacterProps {
  lottieUrl: string;
  alt: string;
}

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
