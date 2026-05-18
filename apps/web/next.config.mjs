/**
 * Static export config so the build is deployable to GitHub Pages.
 *
 * BASE_PATH is what GH Pages needs when the repo is hosted at
 *   https://<user>.github.io/<repo>/
 * The workflow sets it to "/<repo>"; locally it stays empty.
 */
const basePath = process.env.BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
