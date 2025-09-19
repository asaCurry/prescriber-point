/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Optimize for ISR and SEO
  generateEtags: false,
  poweredByHeader: false,
  
  // Configure ISR settings
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/:path*`,
      },
    ]
  },
  
  // Headers for SEO and performance
  async headers() {
    return [
      {
        source: '/drugs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=604800, stale-while-revalidate=1209600', // 1 week cache, 2 week stale
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
