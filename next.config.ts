import type { NextConfig } from "next";

/**
 * Every page on this site is static — the taxonomy changes once a year — so the
 * whole thing exports to plain files and is served by GitHub Pages.
 *
 * `output: "export"` is set only when NEXT_PUBLIC_BASE_PATH is present, i.e. in
 * CI. Locally that keeps `next dev` and `next build` on the normal server
 * runtime, and stops a local build from copying the multi-gigabyte image cache
 * in `public/` into `out/`.
 *
 * `trailingSlash` makes the export emit `about/index.html` rather than
 * `about.html`, which is the form GitHub Pages resolves without surprises.
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(basePath
    ? { output: "export" as const, basePath, trailingSlash: true }
    : {}),
};

export default nextConfig;
