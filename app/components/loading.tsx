'use client';

import React from 'react';
import dynamic from 'next/dynamic';

interface LoadingProps {
  lottieUrl: string;
  alt: string;
}

const Player = dynamic(
  () => import('@lottiefiles/react-lottie-player').then(mod => mod.Player),
  { ssr: false }
);

const Loading: React.FC<LoadingProps> = ({ lottieUrl, alt }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-amber-400 mb-5">
      <div className="text-lg font-semibold mb-0">
        <h1 className="text-2xl font-bold text-amber-400">Loading, please wait...</h1>
      </div>

      <div className="w-[300px] sm:w-[400px] md:w-[500px]">
        <Player
          autoplay
          loop
          src={lottieUrl}
          aria-label={alt}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default Loading;
