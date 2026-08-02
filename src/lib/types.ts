export type NameStatus = "has_name" | "needs_name";

/** A row exactly as it appears in `site-data/species.json`. */
export type RawSpecies = {
  sciName: string;
  authority: string;
  enName: string;
  isName: string;
  status: NameStatus;
  order: string;
  family: string;
  familyEn: string;
  ebird: string;
  avibase: string;
  iucn: string;
  range: string;
};

/** One rendition of a cached Wikimedia image, as URLs the browser can request. */
export type Rendition = {
  webp: string;
  jpg: string;
  width: number;
  height: number;
};

/**
 * A freely licensed photograph cached from Wikimedia Commons. Every field below
 * the renditions is attribution, and it is not optional — CC-BY and CC-BY-SA both
 * require the credit to be visible wherever the image is, which on this site
 * means the card grid as well as the detail page.
 */
export type SpeciesImage = {
  thumb: Rendition;
  detail: Rendition;
  license: string;
  licenseUrl: string;
  artist: string;
  /** The Commons file page — the canonical source for the licence terms. */
  descriptionUrl: string;
};

/** A species enriched with the slugs and sequence number the site navigates by. */
export type Species = RawSpecies & {
  slug: string;
  orderSlug: string;
  familySlug: string;
  /** Position in the AviList taxonomic sequence. */
  seq: number;
  /** Absent until `scripts/fetch_images.py` has reached this species. */
  image?: SpeciesImage;
};

/**
 * The badge a card carries. `pending` is the amber state — suggestions exist but
 * none has been accepted. Nothing produces it yet; suggestions land in a later
 * phase, and the badge is here so the grid does not need reworking then.
 */
export type CardStatus = "named" | "pending" | "unnamed";

export type Counts = {
  total: number;
  needs: number;
};

export type FamilyNode = Counts & {
  family: string;
  familyEn: string;
  slug: string;
  order: string;
  orderSlug: string;
};

export type OrderNode = Counts & {
  order: string;
  slug: string;
  families: FamilyNode[];
};
