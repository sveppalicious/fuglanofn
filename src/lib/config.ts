/**
 * Where the cached Wikimedia images are served from.
 *
 * Set `NEXT_PUBLIC_IMAGE_BASE` to the R2 bucket origin in any deployed
 * environment. Leave it unset locally and the images are served out of
 * `public/images/species/`, so a local fetch run shows up immediately with no
 * bucket involved.
 *
 * `NEXT_PUBLIC_` is required: family pages ship species data, image URLs
 * included, to the client.
 */
export const imageBase = (process.env.NEXT_PUBLIC_IMAGE_BASE ?? "").replace(
  /\/$/,
  "",
);

/** True when an explicit origin is configured, rather than the local cache. */
export const usingRemoteImages = imageBase !== "";

/**
 * Whether to attach cached images to species at all.
 *
 * In development the answer is always yes: `public/images/species/` is served
 * off disk, so a local fetch run is visible with no bucket involved. In a
 * deployed environment the cache is not in the repo — it is gitignored, and far
 * too large to track — so it takes a configured origin, and without one the site
 * renders placeholders rather than thousands of broken <img> tags.
 *
 * This deliberately does not stat the filesystem. Checking for the image
 * directory made the bundler trace it, which pulled all 21.476 files in as
 * traced dependencies of the server bundle.
 */
export const imagesAvailable =
  usingRemoteImages || process.env.NODE_ENV !== "production";
