import React from "react";
import { motion } from "framer-motion";
import { FiShield, FiDollarSign, FiAward, FiGlobe } from "react-icons/fi";

const TrustBadges: React.FC = () => {
  const badges = [
    {
      title: "Secure Payments",
      description: "Stripe Secure and PCI Compliant",
      icon: <FiShield className="text-white w-6 h-6" />,
    },
    {
      title: "Best Price Guarantee",
      description: "Found it cheaper? We'll match it",
      icon: <FiDollarSign className="text-white w-6 h-6" />,
    },
    {
      title: "Time Saving",
      description: "Save time with our all-in-one trip booking",
      icon: <FiAward className="text-white w-6 h-6" />,
    },
    {
      title: "Global Coverage",
      description: "Flights to 100+ countries",
      icon: <FiGlobe className="text-white w-6 h-6" />,
    }
  ];

  return (
    <section className="py-10 px-6 max-w-2xl h-min mx-auto">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {badges.map((badge, i) => (
          <motion.article
            key={i}
            className="relative isolate flex flex-col items-center text-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg shadow-orange-500/30 overflow-hidden p-6"
            whileHover={{ y: -6, rotateX: 3 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* glow ring */}
            <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-white/10"></span>

            {/* icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              {badge.icon}
            </div>

            {/* title */}
            <h3 className="text-lg font-semibold tracking-tight text-white drop-shadow-sm">
              {badge.title}
            </h3>

            {/* description */}
            <p className="mt-1 text-sm text-white/90 leading-relaxed max-w-[12rem]">
              {badge.description}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
};

export default TrustBadges;
