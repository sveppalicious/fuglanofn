#!/usr/bin/env bash
#
# Sync the cached Wikimedia images to a Cloudflare R2 bucket.
#
# The images do not live in git — a full cache is over a gigabyte across tens of
# thousands of files, and GitHub Pages has a hard 1 GB published-site limit. The
# site is deployed to Pages; the images are served from R2, whose free tier is
# 10 GB with no egress charges.
#
# Only WebP is uploaded. The fetcher also wrote a JPEG of each rendition, kept
# locally as a fallback that turned out to be unnecessary — WebP has been
# baseline in every browser since Safari 14 in 2020 — and uploading it would
# double both the storage and the sync time.
#
# One-time setup
# --------------
#   1. Create an R2 bucket in the Cloudflare dashboard (e.g. `fuglanofn-images`)
#      and enable public access. Note the public URL, `https://pub-….r2.dev`.
#   2. Create an R2 API token with Object Read & Write, scoped to that bucket.
#   3. Configure rclone — it handles tens of thousands of small files far better
#      than the AWS CLI. Set the values one at a time; a single long line is
#      easy to truncate on paste, and a half-written remote fails later with a
#      misleading "secret_access_key not found".
#
#        rclone config create r2 s3 provider=Cloudflare
#        rclone config update r2 endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com
#        rclone config update r2 access_key_id <ACCESS_KEY>
#
#      Keep the secret out of shell history:
#
#        printf 'R2 secret: '; read -rs S; echo; rclone config update r2 secret_access_key "$S"; unset S
#
#      Required for a bucket-scoped token. Without it rclone tries to create the
#      bucket before every upload and the token cannot, so writes fail with
#      "CreateBucket … AccessDenied":
#
#        rclone config update r2 no_check_bucket true
#
#   4. Check it. Note that `rclone lsd r2:` is the WRONG test — listing buckets
#      is an account-level operation and a bucket-scoped token gets 403 for it,
#      correctly. Look inside the bucket instead:
#
#        rclone size r2:fuglanofn-images
#
#   5. Point the site at the bucket, so CI builds with the right image origin:
#
#        gh variable set IMAGE_BASE --body "https://pub-….r2.dev"
#
# Usage
# -----
#   scripts/upload_images.sh                      # sync to the default bucket
#   scripts/upload_images.sh my-bucket            # sync to a named bucket
#   DRY_RUN=1 scripts/upload_images.sh            # show what would transfer
#
set -euo pipefail

BUCKET="${1:-fuglanofn-images}"
REMOTE="${RCLONE_REMOTE:-r2}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/public/images/species"

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is not installed. On macOS: brew install rclone" >&2
  echo "See the setup notes at the top of this script." >&2
  exit 1
fi

if [ ! -d "$SOURCE" ]; then
  echo "No image cache at $SOURCE — run scripts/fetch_images.py first." >&2
  exit 1
fi

if ! rclone listremotes | grep -qx "${REMOTE}:"; then
  echo "rclone remote '${REMOTE}:' is not configured." >&2
  echo "See the setup notes at the top of this script." >&2
  exit 1
fi

ARGS=(
  --include "*.webp"
  # Immutable content: every file is named for a species slug and is only ever
  # replaced by a re-fetch of that same species.
  --header-upload "Cache-Control: public, max-age=31536000, immutable"
  --transfers 32
  --checkers 32
  --progress
  --stats-one-line
)

if [ -n "${DRY_RUN:-}" ]; then
  ARGS+=(--dry-run)
  echo "DRY RUN — nothing will be uploaded"
fi

echo "Syncing $(find "$SOURCE" -name '*.webp' | wc -l | tr -d ' ') WebP files"
echo "  from $SOURCE"
echo "    to ${REMOTE}:${BUCKET}/images/species"
echo

# `copy`, not `sync`: sync deletes anything in the bucket that is not in the
# source, and a partial local cache should never wipe the served images.
rclone copy "$SOURCE" "${REMOTE}:${BUCKET}/images/species" "${ARGS[@]}"

echo
echo "Done. If this is the first upload, point the site at the bucket:"
echo "  gh variable set IMAGE_BASE --body \"https://pub-….r2.dev\""
