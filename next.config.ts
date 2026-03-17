import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include the skills directory in every serverless function bundle.
  // Without this, Vercel's static file tracer misses the .md files because
  // they're loaded at runtime via fs.readFileSync with a dynamic path.
  outputFileTracingIncludes: {
    "/api/agents/run": ["./skills/**"],
    "/api/agents/run-pipeline": ["./skills/**"],
    "/api/opportunities/search": ["./skills/**"],
  },
};

export default nextConfig;
