"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Where2Button({
  text = "Plan Your Trip",
  href = "/search",
  icon = true,
  noLink = false, // Add this prop to conditionally disable the Link wrapper
}) {
  // The button content that will be used with or without the Link
  const ButtonContent = (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center px-6 py-6 rounded-5xl bg-gradient-to-r from-orange-500 via-red-500 to-yellow-400 bg-[length:400%] text-white font-semibold text-lg shadow-lg transition-all duration-100 animate-gradient-pulse"
    >
      {icon && (
        <img
          src="./images/Logo.svg"
          className="h-10 w-[20vh]"
          alt="Where2 logo"
        />
      )}
      <span className="relative top-0.5">{text}</span>
    </motion.button>
  );

  // If noLink is true, don't wrap in Link component
  if (noLink) {
    return ButtonContent;
  }

  // Otherwise, wrap in Link component
  return <Link href={href}>{ButtonContent}</Link>;
}
