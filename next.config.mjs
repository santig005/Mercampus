import createNextIntlPlugin from 'next-intl/plugin';
// Default import, not `{ withSentryConfig }`: this file is loaded by plain
// Node ESM (not bundled by webpack like every other import of
// '@sentry/nextjs' in this repo), and Node's CJS/ESM interop can't always
// statically detect named exports on a conditionally-exported CJS package.
import sentryNextjs from '@sentry/nextjs';
const { withSentryConfig } = sentryNextjs;

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
  experimental: {
    // Next 14 (unlike 15+) gates src/instrumentation.ts behind this flag.
    // Needed regardless of whether SENTRY_DSN is set - instrumentation.ts
    // itself decides at runtime whether to call Sentry.init(), see T-60.
    instrumentationHook: true,
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

// Source-map upload and the rest of withSentryConfig's build-time work only
// run when all three are set (see docs/observability.md / T-60b) - without
// them it's explicitly skipped rather than left to fail or silently no-op
// on a partial config.
const sentryBuildIsConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
);

const config = withNextIntl(nextConfig);

export default sentryBuildIsConfigured
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
    })
  : config;
