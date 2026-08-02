#!/usr/bin/env python3
"""Fetch species photographs from Wikimedia Commons via the English Wikipedia.

See §3 of CLAUDE.md. For each species this resolves `sciName` against the English
Wikipedia (scientific names redirect to the common-name article in most cases),
takes the lead image, reads its Commons licensing metadata, rejects anything that
is not freely licensed, and caches a 400px card thumbnail and a 1200px detail
image locally as WebP with a JPEG fallback.

Output is a manifest keyed by sciName at `site-data/images.json`, written after
every species so the run is resumable. Re-running skips species that already have
a terminal result unless --refresh is given.

Usage:

    export FUGLANOFN_CONTACT="you@example.com"
    python3 scripts/fetch_images.py --limit 50          # spread sample, eyeball it
    python3 scripts/fetch_images.py                     # the full run, hours
    python3 scripts/fetch_images.py --species "Grallaria ridgelyi"
    python3 scripts/fetch_images.py --retry error       # only re-try past failures

Requires Pillow. Everything else is standard library.
"""

from __future__ import annotations

import argparse
import gzip
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPECIES_JSON = ROOT / "site-data" / "species.json"
MANIFEST = ROOT / "site-data" / "images.json"
IMAGE_ROOT = ROOT / "public" / "images" / "species"

API = "https://en.wikipedia.org/w/api.php"

# The API takes up to 50 titles per query. Metadata therefore costs ~223 requests
# for the whole checklist rather than 11.131, which is both faster and a lot
# politer than one request per species. The image downloads are still one request
# each and are what makes a full run take hours.
BATCH = 50

THUMB_WIDTH = 400
DETAIL_WIDTH = 1200
# What to ask Wikimedia to scale to. Originals run to several megabytes each and
# there is no reason to pull a 4288px JPEG to make a 1200px one.
SOURCE_WIDTH = 1600

WEBP_QUALITY = 82

# Accepted: public domain, CC0, CC-BY, CC-BY-SA, plus the Free Art License and
# the GFDL. Rejected: non-commercial, no-derivatives, fair use, and anything
# unrecognised. Erring towards rejection is correct here — a missing image is a
# gap, a wrongly licensed one is a liability.
#
# FAL and GFDL are free licences that Commons accepts, and they turn out to be
# the bulk of what a CC-only filter throws away. GFDL carries a real obligation
# the CC licences do not — it wants the licence text carried with the work — so
# `_LICENCE_URLS` guarantees every such image ships a link to the full terms.
_FREE_PREFIXES = (
    "cc0", "cc-zero", "pd", "publicdomain", "public-domain", "cc-by",
    "fal", "gfdl",
)
_UNFREE_TOKENS = {"nc", "nd", "noncommercial", "noderivs", "noderivatives"}

# Commons leaves LicenseUrl empty for these, and they are the two that most need
# a reachable copy of the terms.
_LICENCE_URLS = {
    "fal": "https://artlibre.org/licence/lal/en/",
    "gfdl-1.2": "https://www.gnu.org/licenses/old-licenses/fdl-1.2.html",
    "gfdl": "https://www.gnu.org/licenses/fdl-1.3.html",
}

# Wikipedia lead images are occasionally a range map, an egg, a specimen or a
# 19th-century plate rather than a live bird. Those need manual replacement, so
# flag them for review instead of silently shipping them. The sample run showed
# the file name alone catches almost nothing — Keulemans plates are filed under
# the bare scientific name — so three further signals do the real work. See
# `review_reasons`.
_FILENAME_HINTS = {
    "map", "range", "distribution", "egg", "eggs", "nest",
    "skull", "skeleton", "bone", "bones", "subfossil", "fossil", "specimen",
    "mount", "taxidermy", "illustration", "drawing", "plate", "lithograph",
    "engraving", "painting", "restoration", "reconstruction",
    "stamp", "sign", "logo", "diagram", "chart",
}

# Words that show up in the Artist or Credit of a drawn or engraved work.
_ARTWORK_HINTS = (
    "drawn by", "drawing", "illustration", "illustrated", "lithograph",
    "engraving", "painting", "painted by", "plate", "monograph",
    "keulemans", "gould", "audubon", "wolf del", "recherches sur",
    "restoration", "reconstruction", "del. et lith",
)


class _TextExtractor(HTMLParser):
    """extmetadata Artist and Credit come back as HTML fragments."""

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def strip_html(value: str) -> str:
    parser = _TextExtractor()
    parser.feed(value or "")
    return re.sub(r"\s+", " ", "".join(parser.parts)).strip()


def slugify(value: str) -> str:
    """Must agree with `slugify` in src/lib/slug.ts — the site looks images up by
    the same slug it uses in URLs."""
    decomposed = unicodedata.normalize("NFKD", value)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", stripped.lower()))


class Api:
    """Wikimedia asks for a descriptive User-Agent with a contact address and
    blocks generic ones. It also asks that you not hammer it."""

    def __init__(self, contact: str, delay: float) -> None:
        self.headers = {
            "User-Agent": (
                f"Fuglanofn/0.1 (Icelandic bird-name project; {contact}) "
                "Python-urllib"
            ),
            "Accept-Encoding": "gzip",
        }
        self.delay = delay
        self._last = 0.0

    def _wait(self) -> None:
        elapsed = time.monotonic() - self._last
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last = time.monotonic()

    @staticmethod
    def _body(response) -> bytes:
        """urllib asks for gzip but will not decompress it for us."""
        payload = response.read()
        if response.headers.get("Content-Encoding") == "gzip":
            return gzip.decompress(payload)
        return payload

    def _backoff(self, err: Exception, attempt: int) -> float:
        """Wikimedia throttles anonymous traffic harder than the one-request-a-second
        rule of thumb suggests, and answers 429 with a Retry-After. Honour it; a
        blind exponential retry just burns through the next window too.

        A sustained 429 also raises the floor delay for the rest of the run, so a
        long unattended job settles at a pace the API is willing to serve rather
        than sawtoothing against the limit.
        """
        if isinstance(err, urllib.error.HTTPError) and err.code == 429:
            retry_after = err.headers.get("Retry-After") if err.headers else None
            wait = min(float(retry_after), 300.0) if (retry_after or "").isdigit() else 30.0 * (attempt + 1)
            self.delay = min(self.delay * 1.5, 10.0)
            print(f"    ! 429 rate limited, waiting {wait:.0f}s "
                  f"(floor delay now {self.delay:.1f}s)", flush=True)
            return wait
        return float(2 ** attempt)

    def get(self, params: dict[str, str], retries: int = 5) -> dict:
        params = {**params, "format": "json", "formatversion": "2"}
        url = f"{API}?{urllib.parse.urlencode(params)}"
        for attempt in range(retries):
            self._wait()
            try:
                req = urllib.request.Request(url, headers=self.headers)
                with urllib.request.urlopen(req, timeout=60) as response:
                    return json.loads(self._body(response))
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
                if attempt == retries - 1:
                    raise
                wait = self._backoff(err, attempt)
                if not isinstance(err, urllib.error.HTTPError) or err.code != 429:
                    print(f"    ! {type(err).__name__}, retrying in {wait:.0f}s", flush=True)
                time.sleep(wait)
        raise RuntimeError("unreachable")

    def download(self, url: str, retries: int = 5) -> bytes:
        for attempt in range(retries):
            self._wait()
            try:
                req = urllib.request.Request(url, headers=self.headers)
                with urllib.request.urlopen(req, timeout=120) as response:
                    return self._body(response)
            except (urllib.error.URLError, TimeoutError) as err:
                if attempt == retries - 1:
                    raise
                time.sleep(self._backoff(err, attempt))
        raise RuntimeError("unreachable")


def resolve_titles(api: Api, titles: list[str]) -> dict[str, dict]:
    """Map each requested title to its page, following normalisation and redirects.

    Returns {requested_title: page_dict}; pages that do not exist are omitted.
    """
    data = api.get({
        "action": "query",
        "redirects": "1",
        "titles": "|".join(titles),
        "prop": "pageimages",
        "piprop": "original|name",
    })
    query = data.get("query", {})

    # requested -> normalised -> redirect target
    forward: dict[str, str] = {}
    for hop in query.get("normalized", []):
        forward[hop["from"]] = hop["to"]
    redirects = {hop["from"]: hop["to"] for hop in query.get("redirects", [])}

    by_title = {page["title"]: page for page in query.get("pages", []) if "missing" not in page}

    resolved: dict[str, dict] = {}
    for requested in titles:
        final = forward.get(requested, requested)
        final = redirects.get(final, final)
        page = by_title.get(final)
        if page is not None:
            resolved[requested] = page
    return resolved


def canonical_title(title: str) -> str:
    """`pageimage` gives a file name with underscores; the API echoes titles back
    with spaces. Key both sides the same way or every lookup misses."""
    return title.replace("_", " ").strip()


def fetch_file_info(api: Api, file_titles: list[str]) -> dict[str, dict]:
    data = api.get({
        "action": "query",
        "titles": "|".join(file_titles),
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime",
        "iiurlwidth": str(SOURCE_WIDTH),
    })
    out: dict[str, dict] = {}
    for page in data.get("query", {}).get("pages", []):
        info = (page.get("imageinfo") or [None])[0]
        if info:
            out[canonical_title(page["title"])] = info
    return out


def licence_verdict(extmeta: dict) -> tuple[bool, str, str, str]:
    """(accepted, licence_id, short_name, reason_if_rejected).

    Commons fills the machine-readable `License` for the CC templates but leaves
    it empty for others — GFDL and FAL among them, which is exactly why a filter
    keyed on `License` alone rejected them as "unrecognised". Where it is empty,
    the human-readable `LicenseShortName` is slugged into the same shape and used
    instead.
    """
    licence_id = (extmeta.get("License", {}).get("value") or "").strip().lower()
    short = strip_html(extmeta.get("LicenseShortName", {}).get("value") or "")

    if not licence_id and not short:
        return False, "", "", "no licence metadata"

    key = licence_id or re.sub(r"[^a-z0-9.]+", "-", short.lower()).strip("-")

    # Country suffixes like cc-by-sa-3.0-nl must not read as NoDerivatives.
    if set(key.split("-")) & _UNFREE_TOKENS:
        return False, key, short, f"non-free licence ({short or key})"

    if "fair use" in f"{key} {short}".lower() or "non-free" in f"{key} {short}".lower():
        return False, key, short, "fair use"

    if key.startswith(_FREE_PREFIXES):
        return True, key, short, ""

    return False, key, short, f"unrecognised licence ({short or key})"


def licence_url(extmeta: dict, licence_id: str) -> str:
    """Commons' LicenseUrl, or a known-good fallback for the licences it omits."""
    url = strip_html(extmeta.get("LicenseUrl", {}).get("value") or "")
    if url:
        return url
    for prefix, fallback in sorted(_LICENCE_URLS.items(), key=lambda kv: -len(kv[0])):
        if licence_id.startswith(prefix):
            return fallback
    return ""


def review_reasons(record: dict, species: dict) -> list[str]:
    """Why a human should look at this image before it ships.

    Not a rejection — the image is cached either way. This is the queue for the
    eyeballing step in §3 of CLAUDE.md, and it is deliberately loose: a false
    positive costs someone a glance, a false negative ships a picture of a bone.
    """
    reasons: list[str] = []

    words = set(re.split(r"[^a-z0-9]+", record.get("fileTitle", "").lower()))
    if words & _FILENAME_HINTS:
        reasons.append("file name suggests a map, egg, specimen or artwork")

    # Free bird photographs on Commons are overwhelmingly CC-BY or CC-BY-SA.
    # Public domain almost always means the copyright has expired, which means a
    # plate from a 19th-century monograph rather than a photograph.
    if (record.get("licenseId") or "").startswith(("pd", "public")):
        reasons.append("public domain, so probably a pre-1929 plate")

    blurb = f"{record.get('artist', '')} {record.get('credit', '')}".lower()
    if any(hint in blurb for hint in _ARTWORK_HINTS):
        reasons.append("artist or credit reads like a drawn work")

    # No live photograph of an extinct bird exists, so whatever came back is a
    # painting, a reconstruction or a museum specimen.
    if species.get("iucn") in ("EX", "EW"):
        reasons.append("species is extinct, so this cannot be a live bird")

    return reasons


def write_renditions(payload: bytes, slug: str) -> dict:
    """400px card thumbnail and 1200px detail image, WebP only.

    §3 of CLAUDE.md asks for a JPEG fallback as well. It is not written any more:
    WebP has been baseline in every browser since Safari 14 in 2020, and the
    fallback was 56% of a 3 GB cache — the single biggest thing standing between
    the image set and a hosting tier that fits it. Manifest entries from earlier
    runs keep their `jpg` path and the files are still on disk; nothing reads
    them.
    """
    with Image.open(io.BytesIO(payload)) as source:
        source.load()
        image = source.convert("RGB")

    files: dict[str, dict[str, str]] = {}
    for label, width in (("thumb", THUMB_WIDTH), ("detail", DETAIL_WIDTH)):
        target = min(width, image.width)  # never upscale
        height = round(image.height * target / image.width)
        rendition = image.resize((target, height), Image.LANCZOS)

        directory = IMAGE_ROOT / label
        directory.mkdir(parents=True, exist_ok=True)

        webp = directory / f"{slug}.webp"
        rendition.save(webp, "WEBP", quality=WEBP_QUALITY, method=6)

        files[label] = {
            "webp": str(webp.relative_to(ROOT / "public")),
            "width": target,
            "height": height,
        }
    return files


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def process_batch(
    api: Api,
    batch: list[dict],
    manifest: dict[str, dict],
    dry_run: bool,
) -> None:
    """One batch: two metadata requests, then one download per accepted image."""
    pages = resolve_titles(api, [s["sciName"] for s in batch])

    # Fall back to the English name where the scientific name has no article.
    missing = [s for s in batch if s["sciName"] not in pages]
    en_pages: dict[str, dict] = {}
    if missing:
        en_pages = resolve_titles(api, [s["enName"] for s in missing])

    targets: list[tuple[dict, dict, str]] = []  # species, page, matched_via
    for species in batch:
        page = pages.get(species["sciName"])
        via = "sciName"
        if page is None:
            page = en_pages.get(species["enName"])
            via = "enName"
        if page is None:
            manifest[species["sciName"]] = {
                "status": "no_page",
                "checkedAt": now(),
            }
            continue
        if not page.get("pageimage"):
            manifest[species["sciName"]] = {
                "status": "no_image",
                "wikiTitle": page["title"],
                "checkedAt": now(),
            }
            continue
        targets.append((species, page, via))

    if not targets:
        return

    file_titles = sorted({canonical_title(f"File:{page['pageimage']}") for _, page, _ in targets})
    infos: dict[str, dict] = {}
    for start in range(0, len(file_titles), BATCH):
        infos.update(fetch_file_info(api, file_titles[start:start + BATCH]))

    for species, page, via in targets:
        sci = species["sciName"]
        file_title = canonical_title(f"File:{page['pageimage']}")
        info = infos.get(file_title)
        if info is None:
            manifest[sci] = {"status": "no_image", "wikiTitle": page["title"], "checkedAt": now()}
            continue

        extmeta = info.get("extmetadata", {})
        accepted, licence_id, short, reason = licence_verdict(extmeta)

        record = {
            "wikiTitle": page["title"],
            "matchedVia": via,
            "fileTitle": file_title,
            "descriptionUrl": info.get("descriptionurl", ""),
            "licenseId": licence_id,
            "license": short,
            "licenseUrl": licence_url(extmeta, licence_id),
            "artist": strip_html(extmeta.get("Artist", {}).get("value") or ""),
            "credit": strip_html(extmeta.get("Credit", {}).get("value") or "")[:400],
            "checkedAt": now(),
        }

        if not accepted:
            manifest[sci] = {**record, "status": "license_rejected", "reason": reason}
            print(f"  ✗ {sci}: {reason}", flush=True)
            continue

        if (info.get("mime") or "").startswith("image/svg"):
            manifest[sci] = {**record, "status": "license_rejected", "reason": "vector file, probably a map"}
            continue

        source_url = info.get("thumburl") or info["url"]
        if dry_run:
            manifest[sci] = {**record, "status": "ok", "sourceUrl": source_url, "dryRun": True}
            continue

        try:
            payload = api.download(source_url)
            files = write_renditions(payload, slugify(sci))
        except Exception as err:  # noqa: BLE001 - the run must survive one bad file
            manifest[sci] = {**record, "status": "error", "reason": f"{type(err).__name__}: {err}"}
            print(f"  ! {sci}: {type(err).__name__}: {err}", flush=True)
            continue

        manifest[sci] = {
            **record,
            "status": "ok",
            "sourceUrl": source_url,
            "originalUrl": info["url"],
            "files": files,
            "review": review_reasons(record, species),
        }
        flag = "  ⚠ review" if manifest[sci]["review"] else ""
        print(f"  ✓ {sci} — {short}{flag}", flush=True)


def select(species: list[dict], args: argparse.Namespace, manifest: dict) -> list[dict]:
    if args.species:
        wanted = set(args.species)
        chosen = [s for s in species if s["sciName"] in wanted]
        unknown = wanted - {s["sciName"] for s in chosen}
        if unknown:
            sys.exit(f"Not in AviList: {', '.join(sorted(unknown))}")
        return chosen

    pool = species
    if args.family:
        pool = [s for s in pool if s["family"].lower() == args.family.lower()]
        if not pool:
            sys.exit(f"No such family: {args.family}")

    if not args.refresh:
        retry = set(args.retry or [])
        pool = [
            s for s in pool
            if s["sciName"] not in manifest
            or manifest[s["sciName"]].get("status") in retry
        ]

    if args.limit and len(pool) > args.limit:
        if args.strategy == "head":
            pool = pool[: args.limit]
        else:
            # Spread the sample across the taxonomic sequence. A straight first-50
            # would be ratites and tinamous, which says nothing about how the
            # pipeline copes with obscure tropical passerines.
            step = len(pool) / args.limit
            pool = [pool[int(i * step)] for i in range(args.limit)]
    return pool


def reflag() -> int:
    """Re-apply `review_reasons` to everything already fetched.

    The heuristics will keep changing as more odd lead images turn up, and the
    manifest already holds every field they read. Re-running the whole fetch to
    update a flag would be both slow and rude to Wikimedia.
    """
    if not MANIFEST.exists():
        sys.exit(f"No manifest at {MANIFEST.relative_to(ROOT)} — run a fetch first.")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_sci = {s["sciName"]: s for s in json.loads(SPECIES_JSON.read_text(encoding="utf-8"))}

    changed = 0
    for sci, entry in manifest.items():
        if entry.get("status") != "ok":
            continue
        reasons = review_reasons(entry, by_sci.get(sci, {}))
        if reasons != entry.get("review"):
            changed += 1
        entry["review"] = reasons

    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    flagged = {sci: e["review"] for sci, e in manifest.items() if e.get("review")}
    print(f"{changed} entries changed. {len(flagged)} of "
          f"{sum(1 for e in manifest.values() if e.get('status') == 'ok')} flagged for review:\n")
    for sci, reasons in sorted(flagged.items()):
        print(f"  {sci}")
        for reason in reasons:
            print(f"      - {reason}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, help="stop after N species")
    parser.add_argument("--strategy", choices=("spread", "head"), default="spread",
                        help="how --limit picks its sample (default: spread across the taxonomy)")
    parser.add_argument("--species", nargs="+", metavar="SCINAME", help="specific scientific names")
    parser.add_argument("--family", help="restrict to one family")
    parser.add_argument("--refresh", action="store_true", help="ignore the manifest and redo everything")
    parser.add_argument("--retry", nargs="+", metavar="STATUS", default=["error"],
                        choices=("error", "no_page", "no_image", "license_rejected", "ok"),
                        help="manifest statuses to re-attempt (default: error)")
    parser.add_argument("--delay", type=float, default=1.0, help="minimum seconds between requests")
    parser.add_argument("--dry-run", action="store_true", help="resolve and licence-check, download nothing")
    parser.add_argument("--reflag", action="store_true",
                        help="recompute review flags over the existing manifest, no network, no downloads")
    args = parser.parse_args()

    if args.reflag:
        return reflag()

    contact = os.environ.get("FUGLANOFN_CONTACT", "").strip()
    if not contact:
        sys.exit(
            "Set FUGLANOFN_CONTACT to an email address or project URL first.\n"
            "Wikimedia blocks generic User-Agents and asks for a way to reach you."
        )

    species = json.loads(SPECIES_JSON.read_text(encoding="utf-8"))
    manifest: dict[str, dict] = {}
    if MANIFEST.exists() and not args.refresh:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    targets = select(species, args, manifest)
    if not targets:
        print("Nothing to do — the manifest already covers every selected species.")
        return 0

    print(f"{len(targets)} species, {args.delay}s between requests, "
          f"{'dry run' if args.dry_run else str(IMAGE_ROOT.relative_to(ROOT))}\n", flush=True)

    api = Api(contact, args.delay)
    started = time.monotonic()

    try:
        for start in range(0, len(targets), BATCH):
            batch = targets[start:start + BATCH]
            print(f"[{start + 1}–{start + len(batch)} of {len(targets)}]", flush=True)
            process_batch(api, batch, manifest, args.dry_run)
            # Written every batch, so an interrupted run resumes where it stopped.
            MANIFEST.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
                encoding="utf-8",
            )
    except KeyboardInterrupt:
        print("\nInterrupted — manifest saved, re-run to resume.", flush=True)
    finally:
        MANIFEST.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    counts: dict[str, int] = {}
    for entry in manifest.values():
        counts[entry["status"]] = counts.get(entry["status"], 0) + 1
    review = sum(1 for e in manifest.values() if e.get("review"))

    print(f"\nDone in {time.monotonic() - started:.0f}s. Manifest: {MANIFEST.relative_to(ROOT)}")
    for status in sorted(counts):
        print(f"  {status:18} {counts[status]}")
    if review:
        print(f"  {'flagged for review':18} {review}   (map/egg/specimen in the file name)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
