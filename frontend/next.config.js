/** @type {import('next').NextConfig} */
const nextConfig = {
  // FIX: 'appDir' experimental flag removed — stable in Next.js 14, caused deprecation warning
  images: {
    // FIX: 'domains' deprecated, replaced with 'remotePatterns'
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  env: {
    // FIX: was 'API_URL' but api.ts reads 'NEXT_PUBLIC_API_URL' — unified variable name
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    // Strip trailing /api/v1 so rewrite destination doesn't double it
    const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${baseUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
