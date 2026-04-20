/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lock next/image to the two hosts the app actually fetches from.
  // Audit #14: the previous `hostname: '**'` allowed any HTTPS origin, which
  // is an SSRF/data-exfil vector through the image-optimisation proxy.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.composio.dev' },
      { protocol: 'https', hostname: 'api.composio.dev' },
      { protocol: 'https', hostname: 'logo.clearbit.com' },
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },

  // Audit #13: removed `typescript.ignoreBuildErrors` and
  // `eslint.ignoreDuringBuilds`. CI and `next build` now fail on any type
  // or lint error, so shape drift (Zustand/Drizzle/React) cannot ship to prod.
};

module.exports = nextConfig;
