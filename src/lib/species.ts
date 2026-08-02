import fs from "node:fs";
import path from "node:path";

import { compareNames } from "./collate";
import { imageBase, imagesAvailable } from "./config";
import { slugify } from "./slug";
import type {
  Counts,
  FamilyNode,
  OrderNode,
  RawSpecies,
  Species,
  SpeciesImage,
} from "./types";

/**
 * Server-only. Everything here reads `site-data/species.json` from disk at build
 * time; the taxonomy pages are statically generated, so this never runs on a
 * request in production. Do not import this module from a client component —
 * pass the plain species objects down as props instead.
 *
 * `site-data/taxonomy-tree.json` is deliberately not read. The order and family
 * tree is derived from the species rows so there is a single source of truth,
 * and the array order of species.json is the AviList taxonomic sequence.
 */

const DATA_PATH = path.join(process.cwd(), "site-data", "species.json");
const IMAGES_PATH = path.join(process.cwd(), "site-data", "images.json");

let cache: Dataset | null = null;

/** A manifest entry as `scripts/fetch_images.py` writes it. */
type ManifestEntry = {
  status: string;
  license?: string;
  licenseUrl?: string;
  artist?: string;
  descriptionUrl?: string;
  files?: Record<string, { webp: string; jpg: string; width: number; height: number }>;
};

/**
 * Attach cached images to the species records. The manifest is keyed by sciName
 * and covers only the species the fetcher has reached; a full run takes hours, so
 * a partial manifest is the normal state and every consumer treats `image` as
 * optional. Paths are stored relative to `public/` and become absolute URLs here.
 *
 * Note this is read once per process. During a fetch run the dev server keeps
 * serving the manifest as it was at boot — restart it to pick up new images.
 */
function loadImages(): Map<string, SpeciesImage> {
  const images = new Map<string, SpeciesImage>();
  if (!imagesAvailable || !fs.existsSync(IMAGES_PATH)) return images;

  const manifest = JSON.parse(fs.readFileSync(IMAGES_PATH, "utf8")) as Record<
    string,
    ManifestEntry
  >;

  for (const [sciName, entry] of Object.entries(manifest)) {
    if (entry.status !== "ok" || !entry.files?.thumb || !entry.files?.detail) continue;
    const url = (p: string) => `${imageBase}/${p.replace(/^\/+/, "")}`;
    images.set(sciName, {
      thumb: { ...entry.files.thumb, webp: url(entry.files.thumb.webp), jpg: url(entry.files.thumb.jpg) },
      detail: { ...entry.files.detail, webp: url(entry.files.detail.webp), jpg: url(entry.files.detail.jpg) },
      license: entry.license ?? "",
      licenseUrl: entry.licenseUrl ?? "",
      artist: entry.artist ?? "",
      descriptionUrl: entry.descriptionUrl ?? "",
    });
  }
  return images;
}

type Dataset = {
  species: Species[];
  bySlug: Map<string, Species>;
  orders: OrderNode[];
  ordersBySlug: Map<string, OrderNode>;
  families: FamilyNode[];
  familiesBySlug: Map<string, FamilyNode>;
  speciesByFamilySlug: Map<string, Species[]>;
  totals: Counts;
};

function load(): Dataset {
  if (cache) return cache;

  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as RawSpecies[];
  const images = loadImages();

  const species: Species[] = raw.map((row, seq) => ({
    ...row,
    seq,
    slug: slugify(row.sciName),
    orderSlug: slugify(row.order),
    familySlug: slugify(row.family),
    image: images.get(row.sciName),
  }));

  const bySlug = new Map<string, Species>();
  for (const s of species) {
    if (bySlug.has(s.slug)) {
      throw new Error(`Slug collision on "${s.slug}" (${s.sciName})`);
    }
    bySlug.set(s.slug, s);
  }

  // Insertion order of both maps follows the taxonomic sequence, which is the
  // default sort everywhere on the site.
  const speciesByFamilySlug = new Map<string, Species[]>();
  const familiesBySlug = new Map<string, FamilyNode>();
  const ordersBySlug = new Map<string, OrderNode>();

  for (const s of species) {
    let family = familiesBySlug.get(s.familySlug);
    if (!family) {
      family = {
        family: s.family,
        familyEn: s.familyEn,
        slug: s.familySlug,
        order: s.order,
        orderSlug: s.orderSlug,
        total: 0,
        needs: 0,
      };
      familiesBySlug.set(s.familySlug, family);
      speciesByFamilySlug.set(s.familySlug, []);

      let order = ordersBySlug.get(s.orderSlug);
      if (!order) {
        order = {
          order: s.order,
          slug: s.orderSlug,
          total: 0,
          needs: 0,
          families: [],
        };
        ordersBySlug.set(s.orderSlug, order);
      }
      order.families.push(family);
    }

    const order = ordersBySlug.get(s.orderSlug)!;
    speciesByFamilySlug.get(s.familySlug)!.push(s);

    family.total += 1;
    order.total += 1;
    if (s.status === "needs_name") {
      family.needs += 1;
      order.needs += 1;
    }
  }

  const orders = [...ordersBySlug.values()];
  const families = [...familiesBySlug.values()];

  cache = {
    species,
    bySlug,
    orders,
    ordersBySlug,
    families,
    familiesBySlug,
    speciesByFamilySlug,
    totals: {
      total: species.length,
      needs: species.filter((s) => s.status === "needs_name").length,
    },
  };
  return cache;
}

export function allSpecies(): Species[] {
  return load().species;
}

export function speciesBySlug(slug: string): Species | undefined {
  return load().bySlug.get(slug);
}

export function allOrders(): OrderNode[] {
  return load().orders;
}

export function orderBySlug(slug: string): OrderNode | undefined {
  return load().ordersBySlug.get(slug);
}

export function allFamilies(): FamilyNode[] {
  return load().families;
}

export function familyBySlug(slug: string): FamilyNode | undefined {
  return load().familiesBySlug.get(slug);
}

export function speciesInFamily(familySlug: string): Species[] {
  return load().speciesByFamilySlug.get(familySlug) ?? [];
}

export function siteTotals(): Counts {
  return load().totals;
}

/** Neighbours in the taxonomic sequence, for prev/next on a detail page. */
export function familyNeighbours(species: Species): {
  previous?: Species;
  next?: Species;
} {
  const siblings = speciesInFamily(species.familySlug);
  const index = siblings.findIndex((s) => s.slug === species.slug);
  return {
    previous: index > 0 ? siblings[index - 1] : undefined,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined,
  };
}

/** Families with the most unnamed species — the landing page's "where to start". */
export function biggestGaps(limit: number): FamilyNode[] {
  return [...load().families]
    .filter((f) => f.needs > 0)
    .sort((a, b) => b.needs - a.needs || compareNames(a.family, b.family))
    .slice(0, limit);
}

/** Families where every species already has a name, largest first. */
export function completeFamilies(limit: number): FamilyNode[] {
  return [...load().families]
    .filter((f) => f.needs === 0)
    .sort((a, b) => b.total - a.total || compareNames(a.family, b.family))
    .slice(0, limit);
}
