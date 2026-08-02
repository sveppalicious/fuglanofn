# Fuglanöfn — Icelandic bird naming project

A public website where people in Iceland can browse the world's birds and suggest
Icelandic names for the ~8,400 species that don't have one.

This file is the project brief. Read it fully before writing code.
**Rename this file to `CLAUDE.md` in the project repo** so Claude Code picks it up
automatically.

---

## 1. The problem

The AviList global checklist (v2025b) contains **11,131 accepted bird species**.
Of these, **2,729 have an Icelandic name** and **8,402 do not** (75.5%).

Coverage is heavily skewed toward birds relevant to Iceland and the North
Atlantic. Gulls, terns, ducks, waders, and seabirds are well covered. Tropical
passerine families are almost entirely unnamed — Grallariidae (antpittas, 70
species), Acanthizidae (66), Pachycephalidae (61) and Tityridae (36) have zero
Icelandic names between them.

The goal is a browsable taxonomy explorer where each unnamed species is an open
invitation to propose a name, and where proposals can be discussed and voted on.

---

## 2. Data

### Source files (already in this folder)

| File | Notes |
|---|---|
| `avilist-extended-33684-taxa.csv` | Raw AviList export. 33,684 rows covering orders, families, genera, species, subspecies. Has a BOM on the first column header — strip it. |
| `AviList-v2025b-10Jun2026-extended.xlsx` | Same data as .xlsx |
| `AviList_v2025_metadata_11Jun.pdf` | Column definitions |
| `Birds_without_Icelandic_names.xlsx` | Analysis output — the missing-name list plus per-family and per-order breakdowns |

### Prepared files (in `site-data/`)

| File | Notes |
|---|---|
| `species.json` | All 11,131 species as a flat array. ~3.8 MB. Fields below. |
| `species.csv` | Same, as CSV |
| `taxonomy-tree.json` | Order → family counts with `total` and `needs` per node. Small; use for the index pages. |
| `sample-species.json` | 431 species across 28 families. Used by the mockup only — not for production. |

### Species record shape

```json
{
  "sciName": "Grallaria ridgelyi",
  "authority": "Krabbe, Agro, Rice, Jácome, Navarrete & Sornoza, 1999",
  "enName": "Jocotoco Antpitta",
  "isName": "",
  "status": "needs_name",
  "order": "Passeriformes",
  "family": "Grallariidae",
  "familyEn": "Antpittas",
  "ebird": "jocant1",
  "avibase": "avibase-6F27C0E1",
  "iucn": "EN",
  "range": "Andes of southern Ecuador and adjacent northern Peru"
}
```

`status` is `"has_name"` or `"needs_name"`.

### How `status` was derived — important

The `Icelandic` column in AviList is **almost never empty** (only 37 truly blank
cells). For unnamed species it contains an **English name copied verbatim** from
one of the three English-name columns as a placeholder. A species counts as
`needs_name` when its Icelandic cell is empty *or* case-insensitively equal to
`English_name_AviList`, `English_name_Clements_*`, or `English_name_BirdLife_*`.

Do not re-derive this by checking for empty strings — you will get 37 instead of
8,402. If you regenerate the data, reuse this rule.

---

## 3. Images — read this before touching image code

Use **Wikimedia Commons**, which is CC-licensed or public domain.

### Pipeline

For each species, resolve `sciName` against the English Wikipedia, then take the
page's lead image and its Commons licensing metadata.

1. **Find the page.** `GET https://en.wikipedia.org/w/api.php` with
   `action=query&format=json&redirects=1&titles=<sciName>&prop=pageimages&piprop=original`.
   Scientific names redirect to the common-name article in most cases.
   If there is no page, fall back to `enName`, then give up and mark the species
   image-less. Expect a meaningful miss rate on obscure tropical species.

2. **Get licensing.** For the returned file title, call
   `action=query&format=json&titles=File:<name>&prop=imageinfo&iiprop=url|extmetadata`.
   Read `extmetadata.LicenseShortName`, `extmetadata.Artist`,
   `extmetadata.LicenseUrl`, `extmetadata.Credit`.

3. **Filter.** Accept only public domain, CC0, CC-BY, and CC-BY-SA. **Reject
   anything non-commercial, no-derivatives, or fair-use.** Store the license and
   artist alongside the image — attribution must render on every card and detail
   page. CC-BY-SA is share-alike; keep the attribution visible.

4. **Cache locally.** Download once, resize to a card thumbnail (400px wide) and a
   detail image (1200px wide), store as WebP with a JPEG fallback. Never hotlink
   Wikimedia in production.

5. **Be polite.** Set a descriptive `User-Agent` with a contact address —
   Wikimedia blocks generic agents. Rate-limit to roughly 1 request/second and
   make the script resumable, since a full run over 11,131 species takes hours.

Write the fetcher as a standalone script (`scripts/fetch_images.py`) that writes a
manifest keyed by `sciName`. Run it on 50 species first and eyeball the results —
Wikipedia lead images are occasionally a range map, an egg, or a museum specimen
rather than a live bird, and those need manual replacement.

> Note: this pipeline is documented from the API's published behaviour but was
> **not executed** during preparation — the environment it was written in had no
> outbound network. Validate the response shapes on the first sample run.

---

## 4. Site structure

Modelled on `birdsoftheworld.org/bow/species` — a three-level drill-down with a
card grid at each level.

```
/                          Landing: what the project is, overall progress, how to take part
/orders                    46 order cards, each with progress bar
/orders/:order             Families within an order
/families/:family          Species cards within a family
/species/:sciName          Detail page — the naming interface
/suggestions               Recent activity across the whole site
/leaderboard               Most active contributors (optional, later)
/about                     Method, sources, licensing, credits
```

### Card grid

Square image, English name as the heading, scientific name in italics beneath,
and a status badge in the corner:

- **Green** — has an Icelandic name (show it prominently)
- **Amber** — has suggestions pending, no accepted name
- **Grey** — no name, no suggestions yet

Filters on every list page: status, IUCN category, and a text search across
scientific / English / Icelandic names. Sort by taxonomic order (default),
alphabetically, or by suggestion count.

### Species detail page

The core interaction. Shows the image with attribution, scientific name and
authority, English name, IUCN status, range text, and links out to Birds of the
World, Avibase, and the BirdLife factsheet (linking is fine — reusing their
images is not).

Below that: the suggestion list, each with its rationale, author, vote count, and
comment thread. Then the suggestion form.

---

## 5. Naming — domain rules that matter

Icelandic bird names follow real conventions. Surface these in the UI as guidance
next to the suggestion form, and consider validating against them softly (warn,
don't block).

- Names are typically **single compound words**, not phrases: *Skógarþröstur*,
  *Hrafnsönd*, *Silfursvarri*.
- Common head elements signal the group: `-önd` (duck), `-máfur` (gull),
  `-þröstur` (thrush), `-titlingur` (bunting/sparrow), `-spói` (curlew),
  `-hæna` (fowl), `-ugla` / `-úfur` (owl), `-fálki` (falcon), `-söngvari`
  (warbler), `-rindill` (wren), `-títa` (small bird).
- Names must be **declinable Icelandic nouns** with a clear grammatical gender.
- Avoid transliterated English. *Okarito Brown Kiwi* is not a name; *Brúnkíví* is.
- Íslensk málnefnd (the Icelandic Language Committee) and the ornithological
  community are the real-world authorities. The site proposes; it does not decree.
  Say so plainly on the About page.

The suggestion form should collect: the proposed name, its **grammatical gender**,
the genitive singular and nominative plural forms, and a free-text rationale. The
rationale field is the valuable part — require it, minimum ~30 characters.

---

## 6. Suggestion and moderation flow

```
draft → submitted → under_discussion → { accepted | rejected | withdrawn }
```

- Anyone signed in may submit and vote. One vote per person per suggestion.
- Votes are advisory. A suggestion becomes `accepted` only by moderator action —
  this is the guard against a species being named by brigading.
- A species may have many suggestions but at most one `accepted` name.
- Keep full history. When a name is accepted, do not delete the alternatives;
  they are the record of how the name was chosen.
- Flagging for abuse, and a moderator queue.
- Rate-limit submissions per user per day.

---

## 7. Tech stack

Recommended, but argue if you disagree before building:

- **Next.js (App Router) + TypeScript**, static generation for the taxonomy pages
  (they change rarely) and dynamic rendering for suggestion data.
- **PostgreSQL** via Prisma. The species table is a seeded read-mostly reference
  table; suggestions, votes, comments, and users are the live data.
- **Tailwind** for the card grid.
- Auth: email magic-link plus a Google option. Real identity matters for
  moderation but the barrier should stay low.
- Host on Vercel; images from local cache on a CDN.

### Language

The UI is **Icelandic-first**. English strings are for reference names only.
Set up i18n from the start rather than retrofitting — but do not ship a half-
translated English UI as the default.

Icelandic sorting is not ASCII sorting. Use
`new Intl.Collator('is-IS')` for every name sort, or Þ, Æ, Ö and the accented
vowels will land in the wrong place.

---

## 8. Data model sketch

```prisma
model Species {
  id           Int      @id @default(autoincrement())
  sciName      String   @unique
  authority    String
  enName       String
  order        String
  family       String
  familyEn     String
  ebirdCode    String?
  avibaseId    String?
  iucn         String?
  rangeText    String?
  acceptedName String?  // the Icelandic name, once there is one
  seededName   Boolean  @default(false) // true = came from AviList, not from this site
  image        SpeciesImage?
  suggestions  Suggestion[]
}

model SpeciesImage {
  id         Int    @id @default(autoincrement())
  speciesId  Int    @unique
  sourceUrl  String
  localPath  String
  license    String
  licenseUrl String
  artist     String
  credit     String
  species    Species @relation(fields: [speciesId], references: [id])
}

model Suggestion {
  id        Int      @id @default(autoincrement())
  speciesId Int
  name      String
  gender    Gender   // KK, KVK, HK
  genitive  String?
  plural    String?
  rationale String
  status    SuggestionStatus @default(SUBMITTED)
  authorId  Int
  createdAt DateTime @default(now())
  votes     Vote[]
  comments  Comment[]
  species   Species  @relation(fields: [speciesId], references: [id])
  @@unique([speciesId, name])
}
```

`seededName` matters: the 2,729 existing names came from AviList and are
established usage. They should be visually distinct from names this site coined,
and should not be up for casual revision.

---

## 9. Build order

1. Seed the database from `site-data/species.json`. Verify 11,131 rows, 2,729 with
   names, 8,402 without.
2. Static taxonomy browse — orders, families, species grid. No auth, no images.
   Get the drill-down and Icelandic sorting right first.
3. Image pipeline on a 50-species sample. Inspect. Then the full run in the
   background while other work continues.
4. Auth and the suggestion form.
5. Voting and comments.
6. Moderation queue and acceptance flow.
7. Search, filters, activity feed.
8. Polish, accessibility pass, mobile.

---

## 10. Things that will bite

- **The BOM.** `avilist-extended-33684-taxa.csv` starts with `Sequence` preceded by a byte-order mark.
- **The placeholder trap.** See §2. Empty-string checks give 37, not 8,402.
- **`sciName` in URLs** contains a space. Slugify to `grallaria-ridgelyi` and keep
  a lookup, rather than URL-encoding.
- **Taxonomy changes.** AviList publishes annually and splits/lumps species. Write
  the seeder to be re-runnable and to report added, removed and renamed species
  rather than silently overwriting. Names attached to a species that later gets
  split need human review — don't auto-propagate.
- **`familyEn` is blank on some species rows** and only present on the family-level
  row. The prepared JSON already backfills this; keep it that way if you re-derive.
- **Do not trust the mockup's HTML** as production code. It's a layout reference
  with sample data inlined.

---

## 11. Attribution

- Taxonomy and existing Icelandic names: **AviList v2025b** (10 Jun 2026),
  the unified global checklist. Credit it on the About page.
- Images: individual Wikimedia Commons contributors, credited per image.
- Existing Icelandic names are the work of Icelandic ornithologists over
  many decades and predate this project.
