"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FaClipboardList, FaPlane, FaTimes, FaBars } from "react-icons/fa";

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
        {/* Desktop View - Keep original buttons */}
        <div className="hidden md:flex items-center gap-4 ml-4">
          <Link href="/trip-summary" className="bg-[#FFA500] hover:bg-[#FF8C00] text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors duration-200">
            <FaClipboardList className="text-lg" />
            Trip Summary
          </Link>
          <Link href="/retrieve-booking" className="bg-[#FFA500] hover:bg-[#FF8C00] text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors duration-200">
            <FaPlane className="text-lg" />
            Retrieve Booking
          </Link>
        </div>
        {/* Mobile View - Compact Retrieve Booking button */}
        <div className="md:hidden flex items-center gap-2 ml-3">
          <Link href="/retrieve-booking" className="bg-[#FFA500]/90 hover:bg-[#FF8C00] text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all duration-200 hover:shadow-sm">
            <FaPlane className="text-xs" />
            <span>Booking</span>
          </Link>
          {/* Hamburger menu button */}
          <button
            className="p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFA500]/50 hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FaTimes className="text-gray-700 text-base" /> : <FaBars className="text-gray-700 text-base" />}
          </button>
        </div>
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
            {/* Mobile View - Add to hamburger menu */}
            <div className="md:hidden flex flex-col gap-2 mt-4">
              <Link href="/trip-summary" className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-base font-medium flex items-center gap-2">
                <FaClipboardList />
                Trip Summary
              </Link>
            </div>
          </ul>
        )}
      </nav>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease; }
      `}</style>
    </header>
  );
}
