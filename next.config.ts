import type { NextConfig } from "next";

/**
 * Nothing to configure. The site runs on a Node runtime on Vercel, so there is
 * no static export, no basePath and no trailingSlash — all three existed only to
 * fit GitHub Pages, which could not host a database or a sign-in flow.
 *
 * Images still come from the R2 bucket via NEXT_PUBLIC_IMAGE_BASE; that is
 * independent of what runs the app. See src/lib/config.ts.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
