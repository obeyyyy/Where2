import React from "react";
import { motion } from "framer-motion";
import { FiShield, FiDollarSign, FiAward, FiGlobe } from "react-icons/fi";

const TrustBadges: React.FC = () => {
  const badges = [
    {
      title: "Secure Payments",
      description: "256-bit SSL encryption",
      icon: <FiShield className="text-white w-6 h-6" />,
    },
    {
      title: "Best Price Guarantee",
      description: "Found it cheaper? We'll match it",
      icon: <FiDollarSign className="text-white w-6 h-6" />,
    },
    {
      title: "Award-Winning Service",
      description: "5-star rated by 10,000+ travelers",
      icon: <FiAward className="text-white w-6 h-6" />,
    },
    {
      title: "Global Coverage",
      description: "Flights to 100+ countries",
      icon: <FiGlobe className="text-white w-6 h-6" />,
    }
  ];

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map((badge, index) => (
          <motion.div
            key={index}
            className="bg-gradient-to-r from-[#FF8C00] to-[#FFA500] rounded-xl p-4 shadow-lg text-white"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-full">
                {badge.icon}
              </div>
              <h3 className="font-bold text-lg">{badge.title}</h3>
            </div>
            <p className="text-sm opacity-90">{badge.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrustBadges;
