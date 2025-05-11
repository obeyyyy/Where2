'use client';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
      <div className="flex flex-col items-center space-y-4">
        {/* Loading circle animation */}
        <div className="relative w-24 h-24">
          <div className="absolute w-full h-full border-4 border-gray-300 rounded-full" />
          <div className="absolute w-full h-full border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
        </div>
        
        {/* Animated Loading text */}
        <div className="text-2xl text-blue-600 font-semibold flex">
          Loading
          <span className="animate-[dots_1.5s_ease-in-out_infinite]">.</span>
          <span className="animate-[dots_1.5s_ease-in-out_0.5s_infinite]">.</span>
          <span className="animate-[dots_1.5s_ease-in-out_1s_infinite]">.</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes dots {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          80%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
