/**
 * Deployment-dependent URLs, resolved at build time.
 *
 * The site is a static export served from a subpath on GitHub Pages, while the
 * cached Wikimedia images live in a Cloudflare R2 bucket — Pages has a hard 1 GB
 * published-site limit and the image cache alone would blow through it.
 *
 * `NEXT_PUBLIC_` is required on both: these are read while rendering, and family
 * pages ship species data (image URLs included) to the client.
 */

/** Subpath the site is served from. Empty in dev, `/fuglanofn` on Pages. */
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** Explicit image origin, e.g. an R2 bucket. Empty when none is configured. */
const configuredImageBase = (process.env.NEXT_PUBLIC_IMAGE_BASE ?? "").replace(/\/$/, "");

/**
 * Whether cached images can actually be served.
 *
 * Locally they can: `next dev` serves `public/images/species/…` straight off
 * disk, so a fetch run is visible immediately with no bucket involved. A static
 * export does not carry the cache, so there it takes an explicit origin — and
 * without one the site renders placeholders rather than thousands of broken
 * <img> tags, which is the right way to fail before the bucket exists.
 */
export const imagesAvailable = Boolean(configuredImageBase) || !basePath;

/**
 * Origin the images are served from, without a trailing slash.
 *
 * Note `basePath` does not apply automatically: Next rewrites hrefs for
 * `next/link`, but these end up in a raw `<img src>`, so the prefix is added by
 * hand.
 */
export const imageBase = configuredImageBase || basePath;
