/** @type {import('next').NextConfig} */
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
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
