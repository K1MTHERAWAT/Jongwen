/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@jongwen/shared'],
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
