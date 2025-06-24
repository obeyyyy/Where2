'use client';
import AnimatedStepCharacter from "./AnimatedStepCharacter";
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <AnimatedStepCharacter lottieUrl="https://lottie.host/989cdfb3-3cc9-4dcc-b046-0b7a763fbe8f/RU2HndI7KD.json" alt="Loading" />
    </div>
  );
}
