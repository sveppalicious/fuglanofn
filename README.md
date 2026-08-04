# Fuglanöfn

Íslensk nöfn á fuglum heimsins — a browsable taxonomy explorer over AviList
v2025b, where each of the 8.402 species without an Icelandic name is an open
invitation to propose one.

The project brief is [CLAUDE.md](CLAUDE.md). Read it before changing anything;
it records the data quirks that will otherwise bite.

## Where this is

Steps 1–3 of the build order in §9 are done: taxonomy browse, and images fetched
and served. No database and no auth yet — step 4 is next, and the move to Vercel
was the groundwork for it.

- Landing page with overall progress
- `/orders` → `/orders/:order` → `/families/:family` → `/species/:sciName`
- Card grid with photograph, status badge, IUCN category, text search, status
  and IUCN filters, and four sorts
- Icelandic-first UI throughout

Orders and families are prerendered from `site-data/species.json`; species pages
render on demand and are cached. See [Why not GitHub Pages](#why-not-github-pages)
for why it is not the other way round.

## Running it

```bash
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
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
takes the lead image, checks its Commons licence, and caches a 360px thumbnail
and a 600px detail image as WebP. Needs Pillow; everything else is standard
library.

```bash
export FUGLANOFN_CONTACT="you@example.com"
python3 scripts/fetch_images.py --limit 50    # spread sample across the taxonomy
python3 scripts/fetch_images.py               # full run, several hours
python3 scripts/fetch_images.py --reflag      # redo review flags, no network
```

The manifest at `site-data/images.json` is committed; the images themselves are
not — 445 MB across 21.476 files, reproducible from the manifest, and served
from R2 rather than the repo.

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

Runs on **Vercel** on a Node runtime — the brief's §7 stack. Images are served
from a **Cloudflare R2** bucket, which is independent of what runs the app.

| variable | value |
|---|---|
| `NEXT_PUBLIC_IMAGE_BASE` | `https://pub-1ad2e45445fb4fa2a9357f1a245a98de.r2.dev` |

Leave it unset in development and the images come out of `public/images/species/`,
so a local fetch run is visible with no bucket involved. In production an unset
value means every card falls back to its placeholder — the cache is gitignored
and never in the repo, so rendering placeholders beats thousands of broken
`<img>` tags.

The `r2.dev` origin is Cloudflare's development subdomain and is rate limited.
If the gallery starts throttling, the fix is a custom domain, which is a change
to `NEXT_PUBLIC_IMAGE_BASE` and nothing else.

### Why not GitHub Pages

It was on Pages, and the move was not only about needing a database.

Prerendering all 11.131 species pages cost **68 KB per page to deliver about
1,4 KB of text unique to the bird** — the React tree serialised four or five
times over: as HTML, as an inlined RSC payload for hydration, as a standalone
payload for client navigation, as a byte-identical duplicate of that, and again
sliced into per-segment prefetch files. That came to 759 MB, and with families
and orders the export was 840 MB before a single photograph, against a hard 1 GB
Pages limit.

On a server runtime none of that is necessary. `generateStaticParams` for
species returns an empty array: orders and families stay prerendered (298 pages,
and the ones people arrive on) while species pages render on first request and
are cached. Build time went from 44 s to about 10 s and the 840 MB stopped
existing.

Do not reintroduce a filesystem check for the image cache in server code. An
`fs.existsSync` on `public/images/species` makes the bundler trace the directory
and pull all 21.476 files into the server bundle as dependencies —
`src/lib/config.ts` decides on environment instead, for that reason.

### Image sizes and the masters

`scripts/resize_images.py` cuts the renditions to the sizes the site displays:
360px thumbnails and 600px detail images, down from 400px and 1200px. That took
the WebP cache from 1,2 GB to 445 MB. The 1200px detail rendition was roughly
3,5× the ~340px column it renders in, so almost all of that was waste.

It re-encodes from `image-masters/detail/*.jpg` — the full-size JPEGs the
fetcher used to write, moved out of `public/` so a static export cannot pick
them up. Sourcing from the masters rather than the WebP keeps the script
idempotent: running it twice cannot downscale an already-downscaled file.

**Keep `image-masters/`.** It is 1,7 GB, gitignored, and the only remaining
full-size copy. Without it, changing the rendition sizes means another
multi-hour fetch against Wikimedia.

### Setting up the bucket

1. Create an R2 bucket in the Cloudflare dashboard and enable public access.
2. Configure `rclone` — see the notes at the top of `scripts/upload_images.sh`.
   Set the values one at a time rather than as one long line, and set
   `no_check_bucket true`, which a bucket-scoped token requires.
3. `scripts/upload_images.sh` — syncs WebP only, ~21.000 files.
4. `gh variable set IMAGE_BASE --body "https://pub-….r2.dev"` and re-run the
   workflow.

Two errors worth not repeating, both hit on the first attempt:
`rclone lsd r2:` is not a valid check — listing buckets is an account-level
operation, so a correctly scoped token gets 403 for it. Use
`rclone size r2:<bucket>`. And without `no_check_bucket`, rclone tries to
create the bucket before uploading, which the same token also cannot do.

R2's free tier is 10 GB with no egress charges, which is the reason to prefer it
over anything that bills for bandwidth on a public gallery.

## Next

Per §9 of the brief: wire the manifest into `SpeciesThumb` and the detail page
with per-image attribution, run the full fetch in the background, then auth and
the suggestion form, then voting, comments and moderation.
