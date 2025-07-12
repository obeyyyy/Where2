"use client";
import React from "react";
import { motion } from "framer-motion";
import {
  FiShield,
  FiDollarSign,
  FiPackage,
  FiGlobe,
} from "react-icons/fi";

const badges = [
  {
    title: "Visa Ready Destinations",
    icon: <FiGlobe className="w-6 h-6 text-white" />,
  },
  {
    title: "Hotel + Flights packages",
    icon: <FiPackage className="w-6 h-6 text-white" />,
  },
  {
    title: "Budget Results",
    icon: <FiDollarSign className="w-6 h-6 text-white" />,
  },
  {
    title: "Travel Backup",
    icon: <FiShield className="w-6 h-6 text-white" />,
  },
];

const TrustBadges: React.FC = () => {
  return (
    <section className="w-full mx-auto px-4 sm:px-6 lg:px-8">
     

      <div className="flex grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge, i) => (
          <motion.article
            key={i}
            className="relative bg-white/5 backdrop-blur-md rounded-3xl p-6 lg:p-8 shadow-xl border border-white/10 transition-all duration-300 hover:shadow-3xl hover:-translate-y-1 text-center"
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {/* glow ring */}
            <span className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-white/10"></span>

            {/* icon */}
            <div className="mb-6 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/80 shadow-inner shadow-orange-300/30">
              {badge.icon}
            </div>

            {/* title */}
            <h3 className="text-lg font-bold text-white mb-2">
              {badge.title}
            </h3>

          </motion.article>
        ))}
      </div>
    </section>
  );
};

export default TrustBadges;
