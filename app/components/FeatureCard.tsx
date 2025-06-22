import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export const FeatureCard = ({
  title,
  description,
  features,
  icon: Icon,
}: {
  title: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
}) => {
  return (
    <motion.div 
      className="relative w-full p-8 bg-white border-4 border-orange-500 rounded-none
        shadow-[15px_15px_0_-2.5px_#fff,15px_15px_0_0_#F97316]
        hover:shadow-[20px_20px_0_-2.5px_#fff,20px_20px_0_0_#F97316]
        transition-all duration-300 group"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Header */}
      <div className="flex items-start gap-5 mb-6">
        <div className="p-3 border-2 border-orange-500 rounded-none bg-orange-50">
          <Icon className="w-7 h-7 text-orange-600" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-orange-600">{title}</h3>
          <p className="text-gray-700 mt-2 leading-relaxed">{description}</p>
        </div>
      </div>
      
      {/* Features */}
      <div className="my-6 border-t-2 border-orange-100 pt-6 flex-grow">
        <ul className="space-y-4">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-800 font-medium">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Button */}
      <div className="mt-8 pt-6 border-t-2 border-orange-100">
        <motion.button
          className="w-full py-3 px-6 rounded-none text-base font-bold text-orange-600
            border-2 border-orange-500 bg-white hover:bg-orange-50
            transition-all duration-200 flex items-center justify-center gap-2"
          whileHover={{ 
            scale: 1.02,
            boxShadow: '5px 5px 0 0 #F97316'
          }}
          whileTap={{ scale: 0.98 }}
        >
          LEARN MORE
          <motion.span 
            initial={{ x: 0 }}
            whileHover={{ x: 3 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            →
          </motion.span>
        </motion.button>
      </div>
    </motion.div>
  );
};
