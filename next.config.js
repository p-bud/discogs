/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.discogs.com' },
      { protocol: 'https', hostname: 'i.discogs.com' },
      { protocol: 'https', hostname: 'st.discogs.com' },
    ],
  },
  async headers() {
    // Restrict CORS to the app's own origin — never use wildcard with credentials.
    const allowedOrigin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://raerz.com'
        : 'http://localhost:3000');

    return [
      // ── Security headers for all routes ─────────────────────────────────────
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://img.discogs.com https://i.discogs.com https://st.discogs.com",
              "connect-src 'self' https://api.discogs.com https://www.discogs.com",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      // ── CORS for API routes ──────────────────────────────────────────────────
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
