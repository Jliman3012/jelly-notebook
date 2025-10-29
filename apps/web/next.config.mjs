import { createSecureHeaders } from './next.secure-headers.mjs';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  headers: async () => createSecureHeaders(),
};

export default nextConfig;
