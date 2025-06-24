"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "#faq", label: "FAQ" },
    { href: "#blog", label: "Blog" },
    { href: "#contact", label: "Contact" },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = e.currentTarget.getAttribute('href');
    if (target && target.startsWith('#')) {
      const element = document.querySelector(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <nav className="container mx-auto px-4 md:px-6 flex items-center h-24 md:h-28 justify-between relative">
        <Link href="/" className="flex items-center flex-none h-full group" aria-label="Go to homepage">
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
        {/* Desktop Nav Links */}
        <ul className="hidden md:flex gap-8 font-semibold text-gray-700 text-base items-center">
          {navLinks.map(link => (
            <li key={link.href}>
              <a 
                href={link.href} 
                className="hover:text-[#FF8C00] focus:text-[#FF8C00] transition-colors px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-[#FFA500]" 
                tabIndex={0}
                onClick={link.href.startsWith('#') ? handleLinkClick : undefined}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#FFA500]"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 8h16M4 16h16"} />
          </svg>
        </button>
        {/* Mobile Menu */}
        {menuOpen && (
          <ul className="absolute top-full left-0 right-0 bg-white/95 border-b border-gray-100 shadow-lg flex flex-col items-center gap-4 py-6 md:hidden animate-fadeIn">
            {navLinks.map(link => (
              <li key={link.href}>
                <a 
                  href={link.href} 
                  className="block px-4 py-2 font-semibold text-gray-700 hover:text-[#FF8C00] focus:text-[#FF8C00] focus:outline-none focus:ring-2 focus:ring-[#FFA500] rounded text-lg" 
                  tabIndex={0} 
                  onClick={(e) => {
                    if (link.href.startsWith('#')) {
                      handleLinkClick(e);
                    } else {
                      setMenuOpen(false);
                    }
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        {/* Trip Summary Button */}
        <div className="flex items-center gap-4 ml-4 md:ml-0">
          <Link href="/trip-summary">
            <button
              className={`relative px-4 py-2 rounded-xl font-bold shadow transition focus:outline-none focus:ring-2 focus:ring-[#FFA500] text-base tracking-tight border-2 border-[#FFA500] ${pathname === "/trip-summary" ? "bg-[#FFA500] text-white" : "bg-yellow-50 text-[#FFA500] hover:bg-[#FFA500] hover:text-white"}`}
            >
              Trip Summary
            </button>
          </Link>
          <Link href="/retrieve-booking" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
            Retrieve Booking
          </Link>
        </div>
      </nav>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease; }
      `}</style>
    </header>
  );
}
