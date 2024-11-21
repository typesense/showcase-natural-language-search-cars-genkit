/** @type {import('next').NextConfig} */
const nextConfig = {
  //https://github.com/open-telemetry/opentelemetry-js/issues/4297
  experimental: {
    serverComponentsExternalPackages: [
      '@opentelemetry/auto-instrumentations-node',
      '@opentelemetry/sdk-node',
    ],
  },
};

export default nextConfig;
