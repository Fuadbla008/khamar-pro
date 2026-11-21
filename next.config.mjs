/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * PWA note: @ducanh2912/next-pwa is webpack-only, while this project builds
   * with Turbopack. The effective service worker is the hand-written
   * public/sw.js + public/manifest.json pair, so withPWA() is intentionally not
   * wrapped around this config. Keep the plugin installed for webpack builds.
   */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
