import React from "react";

const Footer: React.FC = () => (
  <footer
    id="contact"
    className="w-full bg-gradient-to-t from-gray-900 via-gray-950 to-gray-900 text-gray-200 mt-16 border-t border-[#FFA500]/20 relative overflow-x-hidden"
  >
    {/* Top Divider */}
    <div className="absolute left-1/2 top-0 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-[#FFA500] via-[#FF8C00] to-transparent rounded-full opacity-70" />
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 items-start px-4 sm:px-8 md:px-12 lg:px-20 relative z-10">
      {/* Branding */}
      <div className="flex flex-col items-start gap-3">
        <img src="/Logo.svg" alt="Where2 Logo" className="w-28 h-auto mb-2" />
        <span className="font-bold text-lg text-[#FFA500]">Where2</span>
        <span className="text-gray-400 text-sm">Your next adventure starts here.</span>
      </div>
      {/* Quick Links */}
      <div>
        <h4 className="font-bold text-lg mb-3 text-[#FFA500]">Quick Links</h4>
        <ul className="space-y-2">
          <li><a href="#features" className="hover:text-[#FF8C00] focus:text-[#FF8C00]">Features</a></li>
          <li><a href="#testimonials" className="hover:text-[#FF8C00] focus:text-[#FF8C00]">Testimonials</a></li>
          <li><a href="#faq" className="hover:text-[#FF8C00] focus:text-[#FF8C00]">FAQ</a></li>
          <li><a href="#blog" className="hover:text-[#FF8C00] focus:text-[#FF8C00]">Blog</a></li>
        </ul>
      </div>
      {/* Newsletter Signup (placeholder, customize as needed) */}
      <div>
        <h4 className="font-bold text-lg mb-3 text-[#FFA500]">Newsletter</h4>
        <form className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="Enter your email"
            className="p-2 rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFA500]"
          />
          <button
            type="submit"
            className="bg-[#FFA500] text-gray-900 font-semibold rounded p-2 hover:bg-[#FF8C00] focus:bg-[#FF8C00] transition"
          >
            Subscribe
          </button>
        </form>
        <span className="block text-xs text-gray-500 mt-2">No spam, just the best deals.</span>
      </div>
      {/* Social & Contact */}
      <div>
        <h4 className="font-bold text-lg mb-3 text-[#FFA500]">Contact & Social</h4>
        <div className="flex gap-4 mt-2">
          <a href="https://twitter.com" aria-label="Twitter" className="hover:text-[#1DA1F2] focus:text-[#1DA1F2]" target="_blank" rel="noopener noreferrer"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.59-2.47.7a4.3 4.3 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.04A4.28 4.28 0 0 0 16.11 4c-2.37 0-4.29 1.92-4.29 4.29 0 .34.04.67.11.98-3.57-.18-6.74-1.89-8.86-4.48a4.27 4.27 0 0 0-.58 2.16c0 1.49.76 2.8 1.92 3.57-.71-.02-1.37-.22-1.95-.54v.05c0 2.08 1.48 3.82 3.44 4.21-.36.1-.74.15-1.13.15-.28 0-.54-.03-.8-.08.54 1.7 2.11 2.94 3.97 2.97A8.61 8.61 0 0 1 2 19.54a12.1 12.1 0 0 0 6.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.39-.01-.58A8.7 8.7 0 0 0 24 4.59a8.51 8.51 0 0 1-2.54.7z" /></svg></a>
          <a href="https://facebook.com" aria-label="Facebook" className="hover:text-[#1877F3] focus:text-[#1877F3]" target="_blank" rel="noopener noreferrer"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.67 0H1.33C.6 0 0 .6 0 1.33v21.33C0 23.4.6 24 1.33 24h11.5v-9.29H9.69V11.1h3.14V8.41c0-3.1 1.89-4.79 4.66-4.79 1.33 0 2.47.1 2.81.14v3.25h-1.93c-1.51 0-1.8.72-1.8 1.77v2.32h3.6l-.47 3.61h-3.13V24h6.13c.73 0 1.33-.6 1.33-1.33V1.33C24 .6 23.4 0 22.67 0"/></svg></a>
          <a href="https://instagram.com" aria-label="Instagram" className="hover:text-[#C13584] focus:text-[#C13584]" target="_blank" rel="noopener noreferrer"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.584.012 4.85.07 1.17.056 1.97.24 2.43.41a4.9 4.9 0 0 1 1.71 1.09 4.9 4.9 0 0 1 1.09 1.71c.17.46.354 1.26.41 2.43-.71-.02-1.37-.22-1.95-.54v.05c0 2.08 1.48 3.82 3.44 4.21-.36.1-.74.15-1.13.15-.28 0-.54-.03-.8-.08.54 1.7 2.11 2.94 3.97 2.97A8.61 8.61 0 0 1 2 19.54a12.1 12.1 0 0 0 6.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.39-.01-.58A8.7 8.7 0 0 0 24 4.59a8.51 8.51 0 0 1-2.54.7z" /></svg></a>
        </div>
        <div className="mt-4">
          <p className="text-gray-300">Email: <a href="mailto:info@where2.com" className="underline hover:text-[#FF8C00] focus:text-[#FF8C00]">info@where2.com</a></p>
          <p className="text-gray-300 mt-2">Phone: <a href="tel:+1234567890" className="underline hover:text-[#FF8C00] focus:text-[#FF8C00]">+1 234 567 890</a></p>
        </div>
      </div>
    </div>
    <div className="mt-10 flex flex-col md:flex-row justify-between items-center text-gray-400 text-xs gap-2 border-t border-gray-800 pt-6 px-4 sm:px-8 md:px-12 lg:px-20">
      <span>&copy; {new Date().getFullYear()} Where2. All rights reserved.</span>
      <div className="flex gap-4">
        <a href="/privacy" className="hover:text-[#FFA500] focus:text-[#FFA500] underline">Privacy Policy</a>
        <a href="/terms" className="hover:text-[#FFA500] focus:text-[#FFA500] underline">Terms of Service</a>
      </div>
    </div>
  </footer>
);

export default Footer;
