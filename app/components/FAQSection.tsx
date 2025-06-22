import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Plane, Clock, Shield, DollarSign } from "lucide-react";

const faqs = [
  {
    icon: <Plane className="w-6 h-6" />,
    question: "How do you provide real-time flight data?",
    answer: "We partner with Duffel, a leading flight API provider, to access live inventory from hundreds of airlines worldwide. This ensures you get accurate prices, schedules, and availability directly from the source.",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    question: "How quickly are flight bookings confirmed?",
    answer: "Thanks to our integration with Duffel's API, flight bookings are confirmed instantly. You'll receive immediate confirmation and e-tickets directly from the airlines.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    question: "What happens if my flight is changed or cancelled?",
    answer: "Our Duffel integration provides real-time updates about any schedule changes or cancellations. You'll be automatically notified and can manage your booking directly through our platform.",
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    question: "Do you offer the best flight prices?",
    answer: "Yes! Through Duffel, we access the same rates available directly from airlines, ensuring competitive pricing. Plus, our smart filtering helps you find the best value flights for your budget.",
  },
];

const FAQSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-gradient-to-b from-white to-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-4xl font-bold mb-4 text-center bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
          Frequently Asked Questions
        </h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Learn more about our flight booking system powered by Duffel API
        </p>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <button
                className={`w-full flex items-center p-6 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 ${activeIndex === idx ? 'bg-orange-50/50' : ''}`}
                onClick={() => toggleAccordion(idx)}
                aria-expanded={activeIndex === idx}
                aria-controls={`faq-content-${idx}`}
              >
                <div className="mr-4 text-orange-500">{faq.icon}</div>
                <h3 className="flex-1 text-lg font-semibold text-gray-900">{faq.question}</h3>
                <div className="ml-4">
                  {activeIndex === idx ? (
                    <ChevronUp className="w-5 h-5 text-orange-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {activeIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    id={`faq-content-${idx}`}
                    className="px-6 pb-6"
                  >
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
