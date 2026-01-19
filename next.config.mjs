/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: Static SPA export for Capacitor
  output: 'export',

  // Disable SSR completely
  typescript: {
    ignoreBuildErrors: true,
  },

  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },

  // Disable trailing slashes for cleaner URLs in SPA
  trailingSlash: false,

  // Transpile Ionic packages for Next.js compatibility
  transpilePackages: [
    '@ionic/react',
    '@ionic/core',
    '@stencil/core',
    'ionicons',
  ],

  // Webpack configuration for Ionic/Stencil compatibility
  webpack: (config, { isServer }) => {
    // Ignore dynamic import warnings from Stencil
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /@stencil\/core/,
      },
      {
        module: /@ionic\/core/,
      },
    ]

    // Make sure Stencil components work in SSG context
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }

    return config
  },
}

export default nextConfig
