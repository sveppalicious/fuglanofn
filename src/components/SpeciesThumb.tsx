import type { Rendition, SpeciesImage } from "@/lib/types";

/**
 * The species photograph, or a stand-in where the fetcher has not reached the
 * species yet (or found nothing freely licensed). Both render at the same square
 * aspect, so the grid does not reflow as the image cache fills in.
 *
 * `next/image` is deliberately not used: `scripts/fetch_images.py` already emits
 * exactly two sizes as WebP with a JPEG fallback, so there is nothing left to
 * optimise and a plain <picture> keeps these servable straight off a CDN.
 */
function hue(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) % 360;
  }
  return h;
}

function Placeholder({
  sciName,
  family,
  className,
}: {
  sciName: string;
  family: string;
  className: string;
}) {
  const h = hue(family);
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(145deg, hsl(${h} 32% 88%), hsl(${(h + 40) % 360} 28% 78%))`,
      }}
    >
      <span
        className="font-mono text-4xl font-light select-none"
        style={{ color: `hsl(${h} 30% 38%)` }}
      >
        {sciName.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function SpeciesThumb({
  sciName,
  family,
  image,
  size = "thumb",
  alt,
  className = "",
}: {
  sciName: string;
  family: string;
  image?: SpeciesImage;
  size?: "thumb" | "detail";
  alt?: string;
  className?: string;
}) {
  const box = `relative aspect-square overflow-hidden ${className}`;

  if (!image) {
    return <Placeholder sciName={sciName} family={family} className={box} />;
  }

  const rendition: Rendition = image[size];

  return (
    <picture>
      <source srcSet={rendition.webp} type="image/webp" />
      <img
        src={rendition.jpg}
        alt={alt ?? sciName}
        width={rendition.width}
        height={rendition.height}
        loading="lazy"
        decoding="async"
        className={`${box} h-full w-full object-cover`}
      />
    </picture>
  );
}

/**
 * The credit line. CC-BY and CC-BY-SA both require attribution wherever the image
 * appears, so this renders on cards as well as detail pages — `compact` is the
 * card form. Never render an image without it.
 */
export function ImageCredit({
  image,
  compact = false,
}: {
  image: SpeciesImage;
  compact?: boolean;
}) {
  const credit = [image.artist, image.license].filter(Boolean).join(" · ");

  if (compact) {
    return (
      <p className="truncate text-[11px] text-muted" title={credit}>
        {credit}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted">
      Mynd:{" "}
      {image.descriptionUrl ? (
        <a
          className="underline hover:text-accent"
          href={image.descriptionUrl}
          target="_blank"
          rel="noreferrer"
        >
          {image.artist || "óþekktur höfundur"}
        </a>
      ) : (
        image.artist || "óþekktur höfundur"
      )}
      {image.license && (
        <>
          {" · "}
          {image.licenseUrl ? (
            <a
              className="underline hover:text-accent"
              href={image.licenseUrl}
              target="_blank"
              rel="noreferrer"
            >
              {image.license}
            </a>
          ) : (
            image.license
          )}
        </>
      )}
      {" · Wikimedia Commons"}
    </p>
  );
}
