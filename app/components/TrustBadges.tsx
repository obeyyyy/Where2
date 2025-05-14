import React from "react";

const badges = [
  { src: "secure-payment.svg", alt: "Secure Payment", label: "Secure Payment" },
  { src: "money-back.svg", alt: "Money-back Guarantee", label: "Money-back Guarantee" },
  { src: "support.svg", alt: "24/7 Support", label: "24/7 Support" },
  { src: "best-price.svg", alt: "Best Price", label: "Best Price" },
];

const TrustBadges: React.FC = () => (
  <div className="flex flex-wrap justify-center gap-6 py-8">
    {badges.map((badge) => (
      <div key={badge.alt} className="flex flex-col items-center">
        <img src={badge.src} alt={badge.alt} className="w-12 h-12 mb-2" />
        <span className="text-xs font-semibold text-gray-700">{badge.label}</span>
      </div>
    ))}
  </div>
);

export default TrustBadges;
