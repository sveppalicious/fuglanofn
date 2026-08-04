import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NamingGuidance } from "@/components/NamingGuidance";
import { ImageCredit, SpeciesThumb } from "@/components/SpeciesThumb";
import { StatusBadge } from "@/components/StatusBadge";
import { iucnClasses, iucnLabel } from "@/lib/iucn";
import { externalLinks } from "@/lib/links";
import { familyBySlug, familyNeighbours, speciesBySlug } from "@/lib/species";
import { t } from "@/lib/strings";

type Params = { slug: string };

/**
 * Deliberately empty.
 *
 * Prerendering all 11.131 species produced 759 MB of HTML and RSC payloads — 68
 * KB per page to deliver about 1,4 KB of text unique to the bird — which is what
 * made this site too large for static hosting in the first place. On a server
 * runtime there is no reason to pay it: `dynamicParams` (on by default) renders
 * a species page the first time it is asked for and caches the result, so a
 * popular bird is served from cache and the long tail costs nothing until
 * somebody actually looks at it.
 *
 * Orders and families stay prerendered — there are only 298 of them, and they
 * are the pages people arrive on.
 */
export function generateStaticParams(): Params[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const species = speciesBySlug((await params).slug);
  if (!species) return { title: t.common.notFound };
  return {
    title: species.isName ? `${species.isName} — ${species.sciName}` : species.sciName,
    description: species.isName
      ? `${species.isName} (${species.sciName}) — ${species.enName}.`
      : `${species.sciName} — ${species.enName}. Þessa tegund vantar íslenskt nafn.`,
  };
}

export default async function SpeciesPage({ params }: { params: Promise<Params> }) {
  const species = speciesBySlug((await params).slug);
  if (!species) notFound();

  const family = familyBySlug(species.familySlug)!;
  const { previous, next } = familyNeighbours(species);
  const links = externalLinks(species);
  const named = species.status === "has_name";

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: t.nav.home, href: "/" },
          { label: t.taxon.orders, href: "/orders" },
          { label: species.order, href: `/orders/${species.orderSlug}` },
          { label: species.family, href: `/families/${species.familySlug}` },
          { label: species.sciName, italic: true },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-line">
            <SpeciesThumb
              sciName={species.sciName}
              family={species.family}
              image={species.image}
              size="detail"
              alt={species.isName || species.enName}
            />
          </div>
          {species.image ? (
            <ImageCredit image={species.image} />
          ) : (
            <p className="text-xs text-muted">
              Mynd kemur síðar, úr Wikimedia Commons með höfundar- og
              leyfismerkingu.
            </p>
          )}

          <section>
            <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
              {t.species.links}
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-accent"
                  >
                    {link.label}
                  </a>
                  {link.note && (
                    <span className="ml-1.5 text-xs text-muted">({link.note})</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={named ? "named" : "unnamed"} />
              {named && (
                <span
                  title={t.status.seededHelp}
                  className="rounded-full border border-line px-2 py-0.5 text-xs text-muted"
                >
                  {t.status.seeded}
                </span>
              )}
              {species.iucn && (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${iucnClasses(species.iucn)}`}
                >
                  {species.iucn} — {iucnLabel(species.iucn)}
                </span>
              )}
            </div>

            {named ? (
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-accent">
                {species.isName}
              </h1>
            ) : (
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {species.enName}
              </h1>
            )}

            <p className="mt-1 text-xl text-muted italic">{species.sciName}</p>
            {named && <p className="text-lg text-muted">{species.enName}</p>}
          </header>

          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">{t.taxon.order}</dt>
              <dd>
                <Link
                  href={`/orders/${species.orderSlug}`}
                  className="underline hover:text-accent"
                >
                  {species.order}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t.taxon.family}</dt>
              <dd>
                <Link
                  href={`/families/${species.familySlug}`}
                  className="underline hover:text-accent"
                >
                  {species.family}
                </Link>{" "}
                <span className="text-muted">— {family.familyEn}</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted">{t.taxon.authority}</dt>
              <dd>{species.authority}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted">{t.taxon.range}</dt>
              <dd className={species.range ? "" : "text-muted"}>
                {species.range || t.taxon.rangeMissing}
              </dd>
            </div>
          </dl>

          <section className="rounded-xl border border-dashed border-line p-5">
            <h2 className="font-semibold">{t.species.suggestHeading}</h2>
            <p className="mt-1 text-sm text-muted">{t.species.suggestComingSoon}</p>
          </section>

          <NamingGuidance />

          <nav className="flex justify-between gap-4 border-t border-line pt-4 text-sm">
            {previous ? (
              <Link href={`/species/${previous.slug}`} className="hover:text-accent">
                ← {t.species.previous}
                <span className="block text-muted italic">{previous.sciName}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/species/${next.slug}`}
                className="text-right hover:text-accent"
              >
                {t.species.next} →
                <span className="block text-muted italic">{next.sciName}</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
