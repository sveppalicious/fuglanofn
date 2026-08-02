# Fuglanöfn

Íslensk nöfn á fuglum heimsins — a browsable taxonomy explorer over AviList
v2025b, where each of the 8.402 species without an Icelandic name is an open
invitation to propose one.

The project brief is [CLAUDE.md](CLAUDE.md). Read it before changing anything;
it records the data quirks that will otherwise bite.

## Where this is

Phase 2 of the build order in §9 — static taxonomy browse. No database, no auth,
no images yet.

- Landing page with overall progress
- `/orders` → `/orders/:order` → `/families/:family` → `/species/:sciName`
- Card grid with status badge, IUCN category, text search, status and IUCN
  filters, and four sorts
- Icelandic-first UI throughout

Everything is statically generated from `site-data/species.json` at build time:
11.436 pages (11.131 species, 252 families, 46 orders, plus the flat pages) in
about 20 seconds.

## Running it

```bash
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Static generation of every taxonomy page |
| `npm test` | Collation and formatting tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Two things worth knowing before you edit

**Icelandic collation is hand-rolled on purpose.** `src/lib/collate.ts` does not
use `Intl.Collator("is-IS")`, and `fmt` in `src/lib/strings.ts` does not use
`Intl.NumberFormat`. Icelandic is a small locale; runtimes that ship without its
data do not throw, they silently fall back to the default locale — filing
Æðarfugl next to Akurgæs and printing `11,131` where Icelandic wants `11.131`.
Since the same list is sorted on the server during static generation and again in
the browser when the user changes the sort, a runtime that disagrees with Node
would also produce a hydration mismatch. `npm test` guards both.

**`src/lib/species.ts` is server-only.** It reads the JSON off disk. Client
components get plain species objects as props; do not import it from one.

## Data

`site-data/species.json` is the source of truth for the site. The tree of orders
and families is derived from it rather than read from `taxonomy-tree.json`, so
there is one source of truth and the array order stays the taxonomic sequence.

## Images

`scripts/fetch_images.py` resolves each species against the English Wikipedia,
takes the lead image, checks its Commons licence, and caches a 400px thumbnail
and a 1200px detail image as WebP plus a JPEG fallback. Needs Pillow; everything
else is standard library.

```bash
export FUGLANOFN_CONTACT="you@example.com"
python3 scripts/fetch_images.py --limit 50    # spread sample across the taxonomy
python3 scripts/fetch_images.py               # full run, several hours
python3 scripts/fetch_images.py --reflag      # redo review flags, no network
```

The manifest at `site-data/images.json` is committed; the images themselves are
not — a full run is about 2,8 GB and reproducible from the manifest.

`src/lib/species.ts` merges the manifest into each species record as an optional
`image`, so a partial manifest is the normal state and every consumer treats the
image as absent until the fetcher reaches that species. `SpeciesThumb` falls back
to a tinted placeholder at the same square aspect, so the grid does not reflow as
the cache fills in.

**Attribution is not optional.** CC-BY and CC-BY-SA both require the credit
wherever the image appears, which here means the card grid as well as the detail
page — hence `ImageCredit`, in a compact form on cards and a linked form on
detail pages. Never render a cached image without it.

The manifest is read once per process. During a fetch run the dev server keeps
serving it as it was at boot; restart to pick up newly cached images.

Accepted licences: public domain, CC0, CC-BY, CC-BY-SA, FAL and GFDL. Rejected:
non-commercial, no-derivatives, fair use, and anything unrecognised — including
Flickr's "No restrictions", which is a claim about known restrictions rather than
a licence grant.

Three things the first runs taught us, all now handled in the script:

- **Wikimedia returns 429 well before one request a second.** The script honours
  `Retry-After` and permanently raises its own floor delay when throttled, so a
  long run settles at a pace the API will serve.
- **`extmetadata.License` is empty for some free licences.** Commons fills the
  machine-readable field for the CC templates but not for GFDL or FAL, so a
  filter keyed on it alone rejects both as "unrecognised". The check falls back
  to slugging `LicenseShortName` into the same shape. `_LICENCE_URLS` is a
  safety net for the case where `LicenseUrl` is also missing — in practice
  Commons does supply it for these two, but GFDL wants its licence text carried
  with the work, so the link is worth guaranteeing rather than assuming.
- **The file name alone does not identify a bad lead image.** Keulemans plates
  are filed under the bare scientific name. Review flags now also key off a
  public-domain licence (bird photographs on Commons are almost always CC-BY or
  CC-BY-SA, so PD usually means a pre-1929 plate), illustration wording in the
  artist and credit, and the species being extinct.

Flagged images are still cached — the flag is a queue for a human glance, not a
rejection. Nothing substitutes for looking: in the 50-species sample one entry
was a perfectly licensed photograph in which the bird is a speck in the grass,
and no metadata could have told us that.

## Deployment

Live at **https://sveppalicious.github.io/fuglanofn/**. Every push to `main`
runs `.github/workflows/deploy.yml`: typecheck, lint, tests, static export,
Pages deploy.

The site and its images are hosted separately, because they have to be. Pages
enforces a hard **1 GB published-site limit**, and the export is 350 MB of HTML
against an image cache of 1,2 GB across 21.000 files. So:

| | where | how big |
|---|---|---|
| HTML, CSS, JS | GitHub Pages | ~370 MB |
| Species images | Cloudflare R2 | ~1,2 GB |

`src/lib/config.ts` resolves both origins from environment variables at build
time:

| variable | value | set where |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | `/fuglanofn` | the workflow |
| `NEXT_PUBLIC_IMAGE_BASE` | the R2 public URL | `gh variable set IMAGE_BASE` |

Neither is set in development, which is deliberate: `next dev` serves the images
straight out of `public/`, so a local fetch run shows up immediately with no
bucket involved. `output: "export"` likewise only switches on when
`NEXT_PUBLIC_BASE_PATH` is present, so a local `npm run build` does not copy
gigabytes out of `public/` into `out/`.

**Until `IMAGE_BASE` is set the site deploys with placeholders on every card.**
That is on purpose — a static export does not carry the image cache, so without
an explicit origin the manifest is ignored entirely rather than emitting
thousands of broken `<img>` tags.

### Setting up the bucket

1. Create an R2 bucket in the Cloudflare dashboard and enable public access.
2. Configure `rclone` — see the notes at the top of `scripts/upload_images.sh`.
3. `scripts/upload_images.sh` — syncs WebP only, ~21.000 files.
4. `gh variable set IMAGE_BASE --body "https://pub-….r2.dev"` and re-run the
   workflow.

R2's free tier is 10 GB with no egress charges, which is the reason to prefer it
over anything that bills for bandwidth on a public gallery.

## Next

Per §9 of the brief: wire the manifest into `SpeciesThumb` and the detail page
with per-image attribution, run the full fetch in the background, then auth and
the suggestion form, then voting, comments and moderation.
