import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProgressBar } from "@/components/ProgressBar";
import { OrderCard } from "@/components/TaxonCard";
import { allOrders, siteTotals } from "@/lib/species";
import { fmt, t } from "@/lib/strings";

export const metadata: Metadata = { title: t.taxon.orders };

export default function OrdersPage() {
  const orders = allOrders();
  const totals = siteTotals();

  return (
    <div>
      <Breadcrumbs items={[{ label: t.nav.home, href: "/" }, { label: t.taxon.orders }]} />

      <h1 className="text-3xl font-semibold tracking-tight">{t.taxon.orders}</h1>
      <p className="mt-2 max-w-prose text-muted">
        {fmt(orders.length)} ættbálkar í ættfræðilegri röð, eins og þeir standa í
        AviList. Súlan sýnir hlutfall tegunda sem á sér íslenskt nafn.
      </p>

      <div className="mt-5 max-w-md">
        <ProgressBar total={totals.total} needs={totals.needs} />
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.map((order) => (
          <li key={order.slug} className="contents">
            <OrderCard order={order} />
          </li>
        ))}
      </ul>
    </div>
  );
}
