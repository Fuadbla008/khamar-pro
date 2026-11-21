import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/**
 * @type {(phase: string) => import('next').NextConfig}
 */
const nextConfig = (phase) => ({
  /*
   * Keep dev and production output apart. `next dev` keeps its incremental
   * state in `.next/dev`, while `next build` owns `.next`. On Windows both
   * processes locking the same manifest file causes EPERM rename errors, so
   * dev gets its own directory and a build can run while dev is live.
   */
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",

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
});

export default nextConfig;
