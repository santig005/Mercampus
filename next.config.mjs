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

export default nextConfig;
