import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix Turbopack workspace root detection when multiple package-lock.json
  // files exist on the filesystem (e.g. /Users/owner/package-lock.json).
  turbopack: {
    root: __dirname,
  },
  // Include the skills directory in every serverless function bundle.
  // Without this, Vercel's static file tracer misses the .md files because
  // they're loaded at runtime via fs.readFileSync with a dynamic path.
  outputFileTracingIncludes: {
    "/api/agents/run": ["./skills/**"],
    "/api/agents/run-pipeline": ["./skills/**"],
    "/api/opportunities/search": ["./skills/**"],
    "/api/proposals/[id]/download": ["./node_modules/docx/**"],
  },
};

export default nextConfig;
