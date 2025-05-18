import React from "react";

const badges = [
  { 
    alt: "Secure Payment", 
    label: "Secure Payment",
    icon: <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 14l9-5-9-5-9 5 9 5z"/>
      <path d="M12 14v5l-9-5 9-5v5z"/>
      <path d="M3 2h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
    </svg>
  },
  { 
    alt: "Money-back Guarantee", 
    label: "Money-back Guarantee",
    icon: <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.477 2 2 6.484 2 12.017 2 17.523 6.477 22 12 22s10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.5-13A5.5 5.5 0 0 0 6 12a5.5 5.5 0 0 0 5.5 5.5A5.5 5.5 0 0 0 17 12a5.5 5.5 0 0 0-5.5-5.5z"/>
    </svg>
  },
  { 
    alt: "24/7 Support", 
    label: "24/7 Support",
    icon: <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.477 2 2 6.484 2 12.017 2 17.523 6.477 22 12 22s10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.5-13A5.5 5.5 0 0 0 6 12a5.5 5.5 0 0 0 5.5 5.5A5.5 5.5 0 0 0 17 12a5.5 5.5 0 0 0-5.5-5.5z"/>
      <path d="M12 14v2m0 0v2m0-2h2m-2 0H8m4 0h2m-2 0H6"/>
    </svg>
  },
  { 
    alt: "Best Price", 
    label: "Best Price",
    icon: <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.477 2 2 6.484 2 12.017 2 17.523 6.477 22 12 22s10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.5-13A5.5 5.5 0 0 0 6 12a5.5 5.5 0 0 0 5.5 5.5A5.5 5.5 0 0 0 17 12a5.5 5.5 0 0 0-5.5-5.5z"/>
      <path d="M12 14v2m0 0v2m0-2h2m-2 0H8m4 0h2m-2 0H6"/>
      <path d="M12 14v2m0 0v2m0-2h2m-2 0H8m4 0h2m-2 0H6"/>
    </svg>
  }
];

const TrustBadges: React.FC = () => (
  <div className="flex flex-wrap justify-center gap-6 py-8">
    {badges.map((badge) => (
      <div key={badge.alt} className="flex flex-col items-center">
        {badge.icon}
        <span className="text-xs font-semibold text-gray-700">{badge.label}</span>
      </div>
    ))}
  </div>
);

export default TrustBadges;
