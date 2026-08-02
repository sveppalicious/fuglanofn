/**
 * Scientific names contain a space (`Grallaria ridgelyi`), so they are slugified
 * for URLs rather than percent-encoded — see §10 of CLAUDE.md. Order and family
 * names are single Latin words and slugify to themselves, lowercased.
 *
 * The reverse direction is a lookup against the data, never a de-slugify: see
 * `speciesBySlug` and friends in `lib/species.ts`.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
