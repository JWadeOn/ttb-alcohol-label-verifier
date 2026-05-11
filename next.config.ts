import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Keeps output file tracing scoped to this package when other lockfiles exist up-tree */
const nextConfig: NextConfig = {
  /** Enables `output: 'standalone'` for Docker (see repository Dockerfile). */
  output: "standalone",
  outputFileTracingRoot: path.join(root),
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
