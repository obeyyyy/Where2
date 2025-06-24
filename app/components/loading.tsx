'use client';
import AnimatedStepCharacter from "./AnimatedStepCharacter";

interface LoadingProps {
  lottieUrl: string;
  alt: string;
}

export default function Loading({ lottieUrl, alt }: LoadingProps) {
  return (
    <div className="flex items-center justify-center h-screen">
      <AnimatedStepCharacter lottieUrl={lottieUrl} alt={alt} />
    </div>
  );
}
