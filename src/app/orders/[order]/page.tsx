import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProgressBar } from "@/components/ProgressBar";
import { FamilyCard } from "@/components/TaxonCard";
import { allOrders, orderBySlug } from "@/lib/species";
import { fmt, t } from "@/lib/strings";

type Params = { order: string };

export function generateStaticParams(): Params[] {
  return allOrders().map((order) => ({ order: order.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const order = orderBySlug((await params).order);
  return { title: order ? order.order : t.common.notFound };
}

export default async function OrderPage({ params }: { params: Promise<Params> }) {
  const order = orderBySlug((await params).order);
  if (!order) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: t.nav.home, href: "/" },
          { label: t.taxon.orders, href: "/orders" },
          { label: order.order },
        ]}
      />

      <h1 className="text-3xl font-semibold tracking-tight">{order.order}</h1>
      <p className="mt-2 text-muted">
        {fmt(order.families.length)}{" "}
        {order.families.length === 1
          ? t.taxon.family.toLowerCase()
          : t.taxon.families.toLowerCase()}{" "}
        · {fmt(order.total)} {t.taxon.speciesPlural.toLowerCase()} · {fmt(order.needs)}{" "}
        {t.progress.needs}
      </p>

      <div className="mt-5 max-w-md">
        <ProgressBar total={order.total} needs={order.needs} />
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {order.families.map((family) => (
          <li key={family.slug} className="contents">
            <FamilyCard family={family} />
          </li>
        ))}
      </ul>
    </div>
  );
}
