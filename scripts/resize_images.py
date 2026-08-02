#!/usr/bin/env python3
"""Re-encode the cached images to the sizes the site actually displays.

The fetcher wrote a 400px thumbnail and a 1200px detail image. The detail
rendition turned out to be roughly 3,5× the ~340px column it renders in, and at
1,2 GB the WebP cache alone would not fit inside the 1 GB GitHub Pages limit
alongside 370 MB of HTML.

This reads the 1200px JPEG each species already has on disk and writes smaller
WebP renditions over the existing ones. Sourcing from the JPEG rather than the
WebP is deliberate on two counts: the JPEG is never written by this script, so
re-running it is idempotent and cannot compound a downscale; and both formats
were encoded independently from the same Wikimedia download, so neither is a
better master than the other.

Keep the JPEGs. They are the only remaining full-size copy, and they are what a
future run at different dimensions has to work from — without them, changing
your mind means another multi-hour fetch against Wikimedia.

Usage:

    python3 scripts/resize_images.py                    # re-encode everything
    python3 scripts/resize_images.py --thumb 320 --detail 700
    python3 scripts/resize_images.py --limit 50         # try it on a sample
    python3 scripts/resize_images.py --dry-run          # report, write nothing
"""

from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "site-data" / "images.json"
IMAGE_ROOT = ROOT / "public" / "images" / "species"

# The full-size JPEGs live outside public/ so a static export does not carry
# them — they are archival masters, not web assets. Everything under public/ is
# deployed; everything here is the raw material to re-derive it from.
MASTER_ROOT = ROOT / "image-masters"

THUMB_WIDTH = 360
DETAIL_WIDTH = 600
THUMB_QUALITY = 78
DETAIL_QUALITY = 75


def rendition_path(role: str, slug: str, suffix: str) -> Path:
    return IMAGE_ROOT / role / f"{slug}{suffix}"


def source_for(slug: str) -> Path | None:
    """The largest untouched copy: the 1200px detail JPEG master, else its WebP.

    The WebP fallback only matters for species fetched after the JPEG was
    dropped; for those the WebP is the largest copy there is, and re-running this
    script would downscale it a second time. Pass the same `--detail` width, or
    re-fetch, if that ever applies.
    """
    for candidate in (
        MASTER_ROOT / "detail" / f"{slug}.jpg",
        rendition_path("detail", slug, ".webp"),
    ):
        if candidate.exists():
            return candidate
    return None


def resize_one(job: tuple[str, str, int, int, int, int]) -> tuple[str, dict | None, int]:
    slug, sci_name, thumb_w, detail_w, thumb_q, detail_q = job

    source = source_for(slug)
    if source is None:
        return sci_name, None, 0

    try:
        with Image.open(source) as handle:
            handle.load()
            image = handle.convert("RGB")
    except Exception:  # noqa: BLE001 — one unreadable file must not stop the run
        return sci_name, None, 0

    files: dict[str, dict] = {}
    written = 0
    for role, width, quality in (
        ("thumb", thumb_w, thumb_q),
        ("detail", detail_w, detail_q),
    ):
        target = min(width, image.width)  # never upscale
        height = round(image.height * target / image.width)
        out = rendition_path(role, slug, ".webp")
        image.resize((target, height), Image.LANCZOS).save(
            out, "WEBP", quality=quality, method=6
        )
        written += out.stat().st_size
        files[role] = {
            "webp": str(out.relative_to(ROOT / "public")),
            "width": target,
            "height": height,
        }

    return sci_name, files, written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--thumb", type=int, default=THUMB_WIDTH, help=f"thumbnail width (default {THUMB_WIDTH})")
    parser.add_argument("--detail", type=int, default=DETAIL_WIDTH, help=f"detail width (default {DETAIL_WIDTH})")
    parser.add_argument("--thumb-quality", type=int, default=THUMB_QUALITY)
    parser.add_argument("--detail-quality", type=int, default=DETAIL_QUALITY)
    parser.add_argument("--limit", type=int, help="only process the first N species")
    parser.add_argument("--dry-run", action="store_true", help="report the plan, write nothing")
    parser.add_argument("--workers", type=int, help="parallel encoders (default: one per core)")
    args = parser.parse_args()

    if not MANIFEST.exists():
        sys.exit(f"No manifest at {MANIFEST.relative_to(ROOT)} — run scripts/fetch_images.py first.")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    targets = [
        (Path(entry["files"]["detail"]["webp"]).stem, sci)
        for sci, entry in manifest.items()
        if entry.get("status") == "ok" and entry.get("files", {}).get("detail")
    ]
    if args.limit:
        targets = targets[: args.limit]

    missing = [sci for slug, sci in targets if source_for(slug) is None]
    if missing:
        print(f"warning: {len(missing)} species have no source image on disk "
              f"(e.g. {missing[0]}) — they will be left alone\n", flush=True)

    print(f"{len(targets)} species → thumb {args.thumb}px q{args.thumb_quality}, "
          f"detail {args.detail}px q{args.detail_quality}")

    if args.dry_run:
        print("dry run — nothing written")
        return 0

    jobs = [
        (slug, sci, args.thumb, args.detail, args.thumb_quality, args.detail_quality)
        for slug, sci in targets
    ]

    done = 0
    total_bytes = 0
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        for sci_name, files, written in pool.map(resize_one, jobs, chunksize=32):
            done += 1
            if files:
                manifest[sci_name]["files"] = files
                total_bytes += written
            if done % 1000 == 0:
                print(f"  {done}/{len(targets)}  ({total_bytes/1e6:.0f} MB so far)", flush=True)

    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    print(f"\nDone. {done} species, {total_bytes/1e6:.0f} MB of WebP.")
    print(f"Manifest updated: {MANIFEST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
