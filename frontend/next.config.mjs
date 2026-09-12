/** @type {import('next').NextConfig} */
// The GitHub Actions runner pre-sets GITHUB_REPOSITORY (read-only, cannot be
// overridden per-step), so the deploy build picks up the /Token-Print basePath
// from it automatically. CI smoke/visual builds set NEXT_DISABLE_BASEPATH=1
// to produce a basePath-free static export served at "/".
const repo = process.env.NEXT_DISABLE_BASEPATH
  ? undefined
  : process.env.GITHUB_REPOSITORY?.split("/")[1];
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(repo ? { basePath: `/${repo}`, assetPrefix: `/${repo}` } : {}),
  transpilePackages: ["three", "three-stdlib", "@react-three/fiber", "@react-three/drei"],
  webpack: (config) => {
    // Prevent server-side bundling of WebGL / three.js internals
    config.externals = config.externals || [];
    return config;
  },
};

export default nextConfig;
