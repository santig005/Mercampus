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
    // T-152b: `/` used to be a 308 to /antojos, so the site had no home
    // page. The landing that lived at /about is now served at `/` (and
    // `/en`), and /about points there so its old links and search results
    // keep working. Permanent, like the redirect it replaces.
    return [
      { source: '/about', destination: '/', permanent: true },
      { source: '/en/about', destination: '/en', permanent: true },
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
