import "./src/env"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@excalidraw/excalidraw"],
  // Empty turbopack config to allow build with webpack config present
  turbopack: {},
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }]
    return config
  },
}

export default nextConfig
