import type { Metadata } from "next";
import "./globals.css";
import { TripCartProvider } from "./components/TripCartContext";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "Where2 travels",
  description: "Where2 travels and trips",
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FFFDF6] font-sans text-[#1A1A1A] w-full">
        {/* TripCartProvider gives cart context to the whole app */}
        <TripCartProvider>
          <Navbar />
          {children}
        </TripCartProvider>
      </body>
    </html>
  );
}
