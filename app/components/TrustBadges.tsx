import React from "react";
import { motion } from "framer-motion";

const badges = [
  { 
    alt: "Secure Payment", 
    label: "Secure Payment",
    description: "Bank-level encryption",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6a3 3 0 110 6 3 3 0 010-6z" />
      </svg>
    )
  },
  { 
    alt: "Money-back Guarantee", 
    label: "Money-back Guarantee",
    description: "100% satisfaction",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    )
  },
  { 
    alt: "24/7 Support", 
    label: "24/7 Support",
    description: "Always here to help",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" />
      </svg>
    )
  },
  { 
    alt: "Best Price", 
    label: "Best Price",
    description: "Guaranteed lowest rates",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
    )
  }
];

const TrustBadges: React.FC = () => (
  <div className="w-full bg-gradient-to-b from-white to-gray-50 py-16">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {badges.map((badge, index) => (
          <motion.div
            key={badge.alt}
            className="flex flex-col items-center text-center group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 
              flex items-center justify-center mb-4 text-orange-500 group-hover:scale-110 transition-transform">
              {badge.icon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{badge.label}</h3>
            <p className="text-sm text-gray-500">{badge.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default TrustBadges;
