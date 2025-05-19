import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-gradient-to-b from-gray-900 to-gray-950 text-gray-200 relative overflow-hidden">
      {/* Decorative Pattern */}
      <div className="absolute inset-0 bg-[url('/patterns/footer-pattern.svg')] bg-cover opacity-5" />
      
      {/* Main Content */}
      <div className="relative">
        {/* Top Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-12">
            {/* Branding */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img 
                  src="/Logo.svg" 
                  alt="Where2 Logo" 
                  className="w-24 h-auto"
                  loading="lazy"
                />
                <span className="text-2xl font-bold text-[#FFA500]">Where2</span>
              </div>
              <p className="text-gray-400 text-lg">
                Your trusted travel companion. Discover amazing destinations and create unforgettable adventures.
              </p>
              <div className="flex gap-6">
                <a 
                  href="https://twitter.com" 
                  aria-label="Follow us on Twitter"
                  className="hover:text-[#1DA1F2] focus:text-[#1DA1F2] transition-colors duration-200"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.59-2.47.7a4.3 4.3 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.04A4.28 4.28 0 0 0 16.11 4c-2.37 0-4.29 1.92-4.29 4.29 0 .34.04.67.11.98-3.57-.18-6.74-1.89-8.86-4.48a4.27 4.27 0 0 0-.58 2.16c0 1.49.76 2.8 1.92 3.57-.71-.02-1.37-.22-1.95-.54v.05c0 2.08 1.48 3.82 3.44 4.21-.36.1-.74.15-1.13.15-.28 0-.54-.03-.8-.08.54 1.7 2.11 2.94 3.97 2.97A8.61 8.61 0 0 1 2 19.54a12.1 12.1 0 0 0 6.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.39-.01-.58A8.7 8.7 0 0 0 24 4.59a8.51 8.51 0 0 1-2.54.7z" />
                  </svg>
                </a>
                <a 
                  href="https://facebook.com" 
                  aria-label="Like us on Facebook"
                  className="hover:text-[#1877F3] focus:text-[#1877F3] transition-colors duration-200"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.67 0H1.33C.6 0 0 .6 0 1.33v21.33C0 23.4.6 24 1.33 24h11.5v-9.29H9.69V11.1h3.14V8.41c0-3.1 1.89-4.79 4.66-4.79 1.33 0 2.47.1 2.81.14v3.25h-1.93c-1.51 0-1.8.72-1.8 1.77v2.32h3.6l-.47 3.61h-3.13V24h6.13c.73 0 1.33-.6 1.33-1.33V1.33C24 .6 23.4 0 22.67 0"/>
                  </svg>
                </a>
                <a 
                  href="https://instagram.com" 
                  aria-label="Follow us on Instagram"
                  className="hover:text-[#C13584] focus:text-[#C13584] transition-colors duration-200"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.2c3.2 0 3.584.012 4.85.07 1.17.056 1.97.24 2.43.41a4.9 4.9 0 0 1 1.71 1.09 4.9 4.9 0 0 1 1.09 1.71c.17.46.354 1.26.41 2.43-.71-.02-1.37-.22-1.95-.54v.05c0 2.08 1.48 3.82 3.44 4.21-.36.1-.74.15-1.13.15-.28 0-.54-.03-.8-.08.54 1.7 2.11 2.94 3.97 2.97A8.61 8.61 0 0 1 2 19.54a12.1 12.1 0 0 0 6.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.39-.01-.58A8.7 8.7 0 0 0 24 4.59a8.51 8.51 0 0 1-2.54.7z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-[#FFA500]">Quick Links</h4>
              <ul className="space-y-4">
                <li>
                  <a 
                    href="#features" 
                    className="text-gray-300 hover:text-[#FF8C00] focus:text-[#FF8C00] transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Features
                  </a>
                </li>
                <li>
                  <a 
                    href="#testimonials" 
                    className="text-gray-300 hover:text-[#FF8C00] focus:text-[#FF8C00] transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                    Testimonials
                  </a>
                </li>
                <li>
                  <a 
                    href="#faq" 
                    className="text-gray-300 hover:text-[#FF8C00] focus:text-[#FF8C00] transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    FAQ
                  </a>
                </li>
                <li>
                  <a 
                    href="#blog" 
                    className="text-gray-300 hover:text-[#FF8C00] focus:text-[#FF8C00] transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-[#FFA500]">Newsletter</h4>
              <p className="text-gray-400 text-lg mb-4">
                Stay updated with our latest travel deals and tips.
              </p>
              <form className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFA500] transition-all duration-200"
                    aria-label="Newsletter email input"
                    required
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FFA500] text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-[#FF8C00] focus:bg-[#FF8C00] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFA500]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  No spam, just the best deals and travel tips.
                </p>
              </form>
            </div>

            {/* Contact */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-[#FFA500]">Contact Us</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <svg className="w-6 h-6 text-[#FFA500]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <span className="block text-gray-300">Email:</span>
                    <a 
                      href="mailto:info@where2.com" 
                      className="text-gray-300 hover:text-[#FF8C00] focus:text-[#FF8C00] transition-colors duration-200"
                    >
                      info@where2.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <svg className="w-6 h-6 text-[#FFA500]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <span className="block text-gray-300">Phone:</span>
                    <a 
                      href="tel:+1234567890" 
                      className="text-gray-300 hover:text-[#FF8C00] focus:text-[#FF8C00] transition-colors duration-200"
                    >
                      +1 234 567 890
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <svg className="w-6 h-6 text-[#FFA500]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <span className="block text-gray-300">Address:</span>
                    <span className="text-gray-300">123 Travel Street, Adventure City, WC 123</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
            <div className="flex items-center gap-4">
              <span>&copy; {new Date().getFullYear()} Where2. All rights reserved.</span>
              <a 
                href="/privacy" 
                className="hover:text-[#FFA500] focus:text-[#FFA500] transition-colors duration-200"
              >
                Privacy Policy
              </a>
              <a 
                href="/terms" 
                className="hover:text-[#FFA500] focus:text-[#FFA500] transition-colors duration-200"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
