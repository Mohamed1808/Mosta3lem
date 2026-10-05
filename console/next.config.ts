import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The simulated backend is the shared engine in ../prototype/js, so the bundler's root is
  // the repository, not this folder (Turbopack does not resolve files outside its root).
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
