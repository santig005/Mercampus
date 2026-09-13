import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/antojos',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/register',
        destination: '/auth/register',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
