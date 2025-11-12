import type { NextConfig } from "next";

// ============================================================================
// BUNDLE ANALYZER CONFIGURATION
// ============================================================================
// Conditional bundle analyzer - enable with: ANALYZE=true npm run build
// Generates interactive treemap visualization of bundle composition
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================================
// NEXT.JS CONFIGURATION
// ============================================================================
const nextConfig: NextConfig = {
  // --------------------------------------------------------------------------
  // PERFORMANCE OPTIMIZATIONS
  // --------------------------------------------------------------------------

  // Enable React strict mode for development (catches potential problems)
  reactStrictMode: true,

  // Compiler optimizations (SWC is default in Next.js 16+)
  compiler: {
    // Remove console logs in production (optional - uncomment to enable)
    // removeConsole: isProduction ? { exclude: ['error', 'warn'] } : false,
  },

  // Experimental features for better performance
  experimental: {
    // Optimize server actions (Next.js 16 feature)
    serverActions: {
      bodySizeLimit: '2mb', // Limit payload size for security
      allowedOrigins: undefined, // Allow all origins in development
    },

    // Optimize package imports for large libraries (reduces bundle size)
    optimizePackageImports: [
      'lucide-react',      // Icon library
      'recharts',          // Chart library
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
    ],

    // Enable optimized font loading
    optimizeCss: true,
  },

  // --------------------------------------------------------------------------
  // IMAGE OPTIMIZATION
  // --------------------------------------------------------------------------
  images: {
    // Supported image formats (WebP for smaller sizes, AVIF for even better compression)
    formats: ['image/webp', 'image/avif'],

    // Responsive image sizes for different devices
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // Smaller image sizes for icons and thumbnails
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Remote image domains (add your external image sources)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Add more patterns as needed:
      // {
      //   protocol: 'https',
      //   hostname: 'images.example.com',
      // },
    ],

    // Minimize image processing overhead
    minimumCacheTTL: 60,

    // Disable static image import optimization in development for faster builds
    unoptimized: isDevelopment ? false : false,
  },

  // --------------------------------------------------------------------------
  // SECURITY HEADERS
  // --------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy (CSP)
          // Note: Adjust based on your actual third-party services
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.anthropic.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // --------------------------------------------------------------------------
  // REDIRECTS & REWRITES
  // --------------------------------------------------------------------------
  async redirects() {
    return [
      // Example: Redirect old URLs to new ones
      // {
      //   source: '/old-path',
      //   destination: '/new-path',
      //   permanent: true,
      // },
    ];
  },

  async rewrites() {
    return [
      // Example: Rewrite API paths
      // {
      //   source: '/api/v1/:path*',
      //   destination: '/api/:path*',
      // },
    ];
  },

  // --------------------------------------------------------------------------
  // OUTPUT & LOGGING CONFIGURATION
  // --------------------------------------------------------------------------

  // Generate build ID for cache busting
  generateBuildId: async () => {
    // Use timestamp for unique build IDs (ensures fresh deployments)
    return `build-${Date.now()}`;
  },

  // Output configuration
  output: undefined, // 'standalone' for Docker, undefined for standard deployment

  // Compress output (reduces bandwidth)
  compress: true,

  // Power consumption tracking in development
  poweredByHeader: false, // Remove X-Powered-By header for security

  // --------------------------------------------------------------------------
  // TYPESCRIPT CONFIGURATION
  // --------------------------------------------------------------------------

  // Type checking during build (set to false to speed up CI builds)
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors (NOT RECOMMENDED for production)
    ignoreBuildErrors: false,
  },

  // Note: ESLint configuration is no longer supported in next.config.ts
  // Use .eslintrc.json or run `npm run lint` separately

  // --------------------------------------------------------------------------
  // ENVIRONMENT-SPECIFIC SETTINGS
  // --------------------------------------------------------------------------

  // Source maps for debugging
  productionBrowserSourceMaps: false, // Disable in production for security

  // Turbopack configuration (Next.js 16+ default bundler)
  // Empty config acknowledges Turbopack usage and silences warnings
  // Note: For TLS issues with Google Fonts, set environment variable:
  // NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1
  turbopack: {},

  // Development origin configuration
  // Allow cross-origin requests from local network IPs in development
  allowedDevOrigins: isDevelopment ? ['192.168.0.111'] : undefined,

  // Webpack configuration (if needed - fallback when using --webpack flag)
  // Note: Next.js 16 uses Turbopack by default for better performance
  webpack: (config, { dev, isServer }) => {
    // Development-only optimizations
    if (dev) {
      // Faster builds in development
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }

    // Make @sentry/nextjs optional (ignore if not installed)
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@sentry\/nextjs$/,
        checkResource(resource: string) {
          // Only ignore if the module doesn't exist
          try {
            require.resolve('@sentry/nextjs');
            return false; // Module exists, don't ignore
          } catch {
            return true; // Module doesn't exist, ignore it
          }
        },
      })
    );

    // Production-only optimizations
    if (!dev && !isServer) {
      // Additional optimizations for production client bundle
      config.optimization = {
        ...config.optimization,
        minimize: true,
        // Split chunks for better caching
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for third-party libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunks shared between pages
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    return config;
  },

  // --------------------------------------------------------------------------
  // PERFORMANCE MONITORING
  // --------------------------------------------------------------------------

  // onDemandEntries configuration for development
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },

  // --------------------------------------------------------------------------
  // STANDALONE OUTPUT (Optional - for Docker/containerization)
  // --------------------------------------------------------------------------
  // Uncomment to enable standalone output for Docker deployments
  // output: 'standalone',
};

// ============================================================================
// EXPORT WITH BUNDLE ANALYZER
// ============================================================================
export default withBundleAnalyzer(nextConfig);
