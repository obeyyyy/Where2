"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100 h-24 md:h-28">
      <div className="container mx-auto px-6 flex items-center h-full justify-between">
        <Link href="/" className="flex items-center flex-none h-full group">
          <motion.div
            className="h-full flex items-center justify-center flex-none"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.97 }}
          >
            <img src="/Logo.svg" alt="Where2 Logo" className="h-12 w-auto md:h-16 object-contain drop-shadow-lg transition-transform group-hover:scale-105" />
          </motion.div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/trip-summary">
            <button
              className={`relative px-6 py-2 rounded-xl font-bold shadow transition focus:outline-none focus:ring-2 focus:ring-[#FFA500] text-lg tracking-tight border-2 border-[#FFA500] ${pathname === "/trip-summary" ? "bg-[#FFA500] text-white" : "bg-yellow-50 text-[#FFA500] hover:bg-[#FFA500] hover:text-white"}`}
            >
              Trip Summary
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
