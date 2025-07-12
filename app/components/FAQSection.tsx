import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Plane, Clock, Shield, DollarSign, CheckCircle2 } from "lucide-react";

const faqs = [
  {
    icon: <Plane className="w-7 h-7" />,
    question: "How do you provide real-time flight data?",
    answer: "We partner with Duffel, the world’s leading flight API, to bring you up-to-the-minute flight info from hundreds of airlines worldwide — so you always get accurate prices, schedules, and availability.",
  },
  {
    icon: <Clock className="w-7 h-7" />,
    question: "How fast are flight bookings confirmed?",
    answer: "Instantly! Once you book, Duffel’s powerful API confirms your flight immediately and sends you your e-ticket right away — no waiting, no stress.",
  },
  {
    icon: <Shield className="w-7 h-7" />,
    question: "What if my flight changes or gets cancelled?",
    answer: "Don’t worry! We track your booking in real time and instantly notify you of any changes or cancellations. Manage everything easily, all in one place.",
  },
  {
    icon: <DollarSign className="w-7 h-7" />,
    question: "Are these the best flight prices available?",
    answer: "Yes! We access airline rates directly via Duffel, so you get competitive pricing every time. Our smart filters also help you find flights that perfectly match your budget and preferences.",
  },
];

const FAQSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-gradient-to-b from-white to-orange-50 py-24">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-extrabold mb-8 text-center bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent select-none drop-shadow-md">
          Got Questions? We’ve Got Answers!
        </h2>
        <p className="text-center text-lg text-orange-700 mb-16 font-medium tracking-wide">
          Your dream vacation is just a few clicks away. Here’s everything you need to know to book with confidence.
        </p>

        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={false} // no initial animation on load
              whileHover={{ boxShadow: "0 8px 24px rgba(255, 165, 0, 0.25)" }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="bg-white rounded-3xl border border-orange-200 cursor-pointer"
            >
              <button
                onClick={() => toggleAccordion(idx)}
                aria-expanded={activeIndex === idx}
                aria-controls={`faq-content-${idx}`}
                className={`flex items-center w-full px-8 py-5 rounded-3xl focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 focus-visible:ring-opacity-60
                  ${
                    activeIndex === idx
                      ? "bg-orange-100 text-orange-900 font-semibold"
                      : "text-orange-700 hover:bg-orange-50"
                  }
                `}
              >
                <motion.div
                  className="mr-6 flex items-center justify-center rounded-full bg-orange-200 text-orange-600 p-3 shadow-sm"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {faq.icon}
                </motion.div>
                <h3 className="flex-1 text-xl leading-tight">{faq.question}</h3>
                <motion.div
                  className="ml-6"
                  animate={{ rotate: activeIndex === idx ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                >
                  {activeIndex === idx ? (
                    <ChevronUp className="w-6 h-6 text-orange-600" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-orange-400" />
                  )}
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {activeIndex === idx && (
                  <motion.div
                    key="content"
                    id={`faq-content-${idx}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="px-12 pb-8 text-orange-800 text-lg leading-relaxed select-text"
                  >
                    <div className="flex items-center mb-3 space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-orange-500" />
                      <span className="font-semibold">Trusted & Reliable</span>
                    </div>
                    <p>{faq.answer}</p>
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
