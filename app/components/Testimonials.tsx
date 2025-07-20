"use client";
import { motion } from "framer-motion";
import { FiStar, FiUser } from "react-icons/fi";
import Image from "next/image";

const testimonials = [
  {
    name: "Emily R.",
    title: "Solo Traveler from Canada",
    image: "/images/users/emily.jpg",
    rating: 5,
    quote:
      "Where2 helped me find a last-minute trip to Portugal that matched my visa, budget, and time off — without stress. It’s genius!",
  },
  {
    name: "Mohammed A.",
    title: "Frequent Flyer from UAE",
    image: "/images/users/mohammed.jpg",
    rating: 5,
    quote:
      "Everything was bundled. I booked a flight and hotel in one click — cheaper than anywhere else. Never going back to Skyscanner!",
  },
  {
    name: "Sophie D.",
    title: "Backpacker from Germany",
    image: "/images/users/sophie.jpg",
    rating: 4,
    quote:
      "As someone who hates travel planning, Where2 made it shockingly easy. I just picked my budget and dates — done.",
  },
];

export default function Testimonials() {
  return (
    <section className="w-full py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <h2 className="text-4xl font-extrabold mb-8 text-center bg-gradient-to-r from-[#FF7A00] to-[#FFB400] bg-clip-text text-transparent select-none drop-shadow-md">
            What Travelers Are Saying
          </h2>
          <p className="text-center text-lg text-orange-700 mb-16 font-medium tracking-wide max-w-2xl mx-auto">
            Real stories from real people. See why travelers around the world trust Where2 for smarter, stress-free bookings.
          </p>
        </motion.div>

        <div className="grid gap-10 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              whileHover={{ boxShadow: "0 8px 24px rgba(255, 165, 0, 0.25)" }}
              className="bg-white rounded-3xl shadow-xl p-8 text-left border border-orange-200 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-6">
                <motion.div 
                  className="relative w-14 h-14 rounded-full bg-orange-200 text-orange-600 p-3 shadow-sm overflow-hidden flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <FiUser className="w-8 h-8" />
                </motion.div>
                <div>
                  <h4 className="text-lg font-semibold text-orange-700">{t.name}</h4>
                  <p className="text-sm text-orange-500">{t.title}</p>
                </div>
              </div>
              <p className="text-orange-800 mb-4 leading-relaxed">"{t.quote}"</p>
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <FiStar key={i} className="text-orange-500 w-5 h-5" />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
