import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProgressBar } from "@/components/ProgressBar";
import { SpeciesBrowser } from "@/components/SpeciesBrowser";
import { allFamilies, familyBySlug, speciesInFamily } from "@/lib/species";
import { fmt, t } from "@/lib/strings";

type Params = { family: string };

export function generateStaticParams(): Params[] {
  return allFamilies().map((family) => ({ family: family.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const family = familyBySlug((await params).family);
  return {
    title: family ? `${family.family} — ${family.familyEn}` : t.common.notFound,
  };
}

export default async function FamilyPage({ params }: { params: Promise<Params> }) {
  const slug = (await params).family;
  const family = familyBySlug(slug);
  if (!family) notFound();

  const species = speciesInFamily(slug);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: t.nav.home, href: "/" },
          { label: t.taxon.orders, href: "/orders" },
          { label: family.order, href: `/orders/${family.orderSlug}` },
          { label: family.family },
        ]}
      />

      <h1 className="text-3xl font-semibold tracking-tight">{family.family}</h1>
      <p className="mt-1 text-lg text-muted">{family.familyEn}</p>
      <p className="mt-2 text-muted">
        {fmt(family.total)} {t.taxon.speciesPlural.toLowerCase()} · {fmt(family.needs)}{" "}
        {t.progress.needs}
      </p>

      <div className="mt-5 mb-8 max-w-md">
        <ProgressBar total={family.total} needs={family.needs} />
      </div>

      <SpeciesBrowser species={species} />
    </div>
  );
}
