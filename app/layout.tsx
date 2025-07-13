import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TripCartProvider } from './components/TripCartContext';
import Navbar from './components/Navbar';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from 'react-hot-toast';

// Initialize Inter font with specific subsets and display settings
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

// Viewport configuration for responsive design
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

// Metadata configuration for SEO and social sharing
export const metadata: Metadata = {
  title: {
    default: 'Where2 - Your Travel Companion',
    template: '%s | Where2',
  },
  description: 'Discover amazing travel destinations and plan your next adventure with Where2. Find the best places to visit, things to do, and create your perfect trip itinerary.',
  keywords: ['travel', 'vacation', 'destinations', 'trip planning', 'adventure', 'explore'],
  authors: [{ name: 'Where2 Team', url: 'https://where2.vercel.app' }],
  creator: 'Where2',
  publisher: 'Where2',
  
  // Open Graph / Facebook
  openGraph: {
    title: 'Where2 - Your Travel Companion',
    description: 'Discover amazing travel destinations and plan your next adventure with Where2.',
    url: 'https://where2.vercel.app',
    siteName: 'Where2',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Where2 - Your Travel Companion',
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Where2 - Your Travel Companion',
    description: 'Discover amazing travel destinations and plan your next adventure with Where2.',
    creator: '@where2travels',
    images: ['/og-image.jpg'],
  },
  
  // Icons and Favicons
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: 'hsl(var(--color-primary))' },
    ],
  },
  
  // Web App Manifest
  manifest: '/site.webmanifest',
  
  // Apple specific meta tags
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Where2',
  },
  
  // Format detection
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false,
  },
  
  // Metadata base URL
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://where2.vercel.app'),
};

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Theme and color meta tags */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
        <meta name="msapplication-TileColor" content="hsl(var(--color-primary))" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      
      <body className="min-h-screen w-full bg-bg text-text antialiased font-sans">
        <TripCartProvider>
          <Navbar />
          
          <main className="flex-1 w-full">
            {children}
          </main>
          
          {/* Toast notifications */}
          <Toaster
            position="bottom-center"
            toastOptions={{
              className: '!bg-bg !text-text !border !border-border !shadow-lg',
              duration: 3000,
              success: {
                className: '!bg-success/10 !text-success !border-success/20',
                iconTheme: {
                  primary: 'hsl(var(--color-success))',
                  secondary: 'white',
                },
              },
              error: {
                className: '!bg-error/10 !text-error !border-error/20',
                iconTheme: {
                  primary: 'hsl(var(--color-error))',
                  secondary: 'white',
                },
              },
              loading: {
                className: '!bg-bg-alt !text-text !border-border',
              },
            }}
          />
          
          {/* Performance monitoring */}
          <SpeedInsights />
        </TripCartProvider>
      </body>
    </html>
  );
}
