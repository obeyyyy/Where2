"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FaClipboardList, FaPlane, FaTimes, FaBars, FaTicketAlt, FaSearch } from "react-icons/fa";

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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-50/30 to-transparent opacity-60"></div>
      <nav className="container mx-auto px-4 md:px-6 flex items-center h-20 md:h-24 justify-between relative z-10">
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
        <ul className="hidden md:flex gap-6 font-medium text-orange-800 text-base items-center">
          {navLinks.map((link, index) => (
            <motion.li 
              key={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <a 
                href={link.href} 
                className="relative px-3 py-2 rounded-full hover:bg-orange-50 focus:bg-orange-50 transition-all duration-300 focus:outline-none group" 
                tabIndex={0}
                onClick={link.href.startsWith('#') ? handleLinkClick : undefined}
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB400] group-hover:w-full transition-all duration-300"></span>
              </a>
            </motion.li>
          ))}
        </ul>
        
        {/* Desktop View - Action Buttons */}
        <div className="hidden md:flex items-center gap-3 ml-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.03 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-300 to-orange-400 rounded-full opacity-70 group-hover:opacity-100 blur-sm transition duration-200"></div>
            <Link 
              href="/trip-summary" 
              className="relative bg-white hover:bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors duration-300 border border-orange-200 group-hover:border-orange-300"
            >
              <div className="p-1.5 bg-gradient-to-br from-[#FF7A00] to-[#FFB400] rounded-full">
                <FaClipboardList className="text-white text-xs" />
              </div>
              <span>Trip Summary</span>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            whileHover={{ scale: 1.03 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB400] rounded-full opacity-80 group-hover:opacity-100 blur-sm transition duration-200"></div>
            <Link 
              href="/retrieve-booking" 
              className="relative bg-gradient-to-r from-[#FF7A00] to-[#FFB400] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-300 shadow-sm hover:shadow group-hover:shadow-orange-200/50"
            >
              <FaTicketAlt className="text-white text-xs" />
              <span>Retrieve Booking</span>
            </Link>
          </motion.div>
        </div>
        
        {/* Mobile View - Compact Buttons */}
        <div className="md:hidden flex items-center gap-2 ml-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              href="/retrieve-booking" 
              className="bg-gradient-to-r from-[#FF7A00] to-[#FFB400] text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm hover:shadow transition-all duration-200"
            >
              <FaTicketAlt className="text-xs" />
              <span>Booking</span>
            </Link>
          </motion.div>
          
          {/* Hamburger menu button */}
          <motion.button
            className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-300 hover:bg-orange-50 transition-colors bg-white border border-orange-200"
            onClick={() => setMenuOpen(!menuOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {menuOpen ? 
              <FaTimes className="text-orange-600 text-base" /> : 
              <FaBars className="text-orange-600 text-base" />
            }
          </motion.button>
        </div>
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div 
              className="absolute top-full left-0 right-0 bg-white border-b border-orange-100 shadow-lg md:hidden z-50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.ul 
                className="flex flex-col items-center gap-2 py-6 px-4"
                initial="closed"
                animate="open"
                variants={{
                  open: {
                    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
                  },
                  closed: {
                    transition: { staggerChildren: 0.05, staggerDirection: -1 }
                  }
                }}
              >
                {navLinks.map(link => (
                  <motion.li 
                    key={link.href}
                    className="w-full"
                    variants={{
                      open: { opacity: 1, y: 0 },
                      closed: { opacity: 0, y: -20 }
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <a 
                      href={link.href} 
                      className="block w-full px-4 py-3 font-medium text-orange-800 hover:bg-orange-50 rounded-xl transition-colors" 
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
                  </motion.li>
                ))}
                
                {/* Mobile View - Action Buttons */}
                <motion.div 
                  className="w-full mt-4 space-y-3 px-4"
                  variants={{
                    open: { opacity: 1, y: 0 },
                    closed: { opacity: 0, y: -20 }
                  }}
                >
                  <Link 
                    href="/trip-summary" 
                    className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 py-3 px-4 rounded-xl text-base font-medium flex items-center gap-3 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <div className="p-1.5 bg-gradient-to-br from-[#FF7A00] to-[#FFB400] rounded-full">
                      <FaClipboardList className="text-white text-xs" />
                    </div>
                    <span>Trip Summary</span>
                  </Link>
                  
                  <Link 
                    href="/retrieve-booking" 
                    className="w-full bg-gradient-to-r from-[#FF7A00] to-[#FFB400] text-white py-3 px-4 rounded-xl text-base font-medium flex items-center gap-3 transition-colors shadow-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    <FaSearch className="text-white text-sm" />
                    <span>Find My Booking</span>
                  </Link>
                </motion.div>
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
