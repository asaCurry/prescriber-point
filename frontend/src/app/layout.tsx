import type { Metadata } from 'next'
import './globals.css'
import Script from 'next/script'
import { Providers } from './providers'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Prescriber Point - AI-Enhanced Drug Information Platform',
    template: '%s | Prescriber Point',
  },
  description: 'AI-Enhanced Drug Information Platform for Healthcare Professionals',
  keywords: ['healthcare', 'drug information', 'prescriber', 'medication', 'FDA'],
  authors: [{ name: 'Prescriber Point' }],
  creator: 'Prescriber Point',
  publisher: 'Prescriber Point',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-verification-code', // Add your verification code
  },
  category: 'healthcare',
  classification: 'medical reference',
}

// Force dynamic rendering for SSR-only
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'} />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Viewport meta tag for mobile optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#f97316" />
        <meta name="msapplication-TileColor" content="#f97316" />

        {/* Additional SEO meta tags */}
        <meta name="language" content="en" />
        <meta name="robots" content="index, follow" />
        <meta
          name="googlebot"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PrescriberPoint" />

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Structured Data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'PrescriberPoint',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'https://prescriberpoint.com',
              logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://prescriberpoint.com'}/icon.svg`,
              description: 'AI-Enhanced Drug Information Platform for Healthcare Professionals',
              sameAs: [],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer service',
                availableLanguage: 'English',
              },
            }),
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>

        {/* Performance monitoring script (placeholder for future analytics) */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="performance-monitor"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                // Performance monitoring placeholder
                if (typeof window !== 'undefined' && 'performance' in window) {
                  window.addEventListener('load', () => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData) {
                      console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart);
                    }
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  )
}
