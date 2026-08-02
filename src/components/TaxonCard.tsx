import Link from "next/link";

import { fmt, t } from "@/lib/strings";
import type { FamilyNode, OrderNode } from "@/lib/types";

import { ProgressBar } from "./ProgressBar";

export function OrderCard({ order }: { order: OrderNode }) {
  return (
    <Link
      href={`/orders/${order.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-md"
    >
      <div>
        <h3 className="font-semibold group-hover:underline">{order.order}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {fmt(order.families.length)}{" "}
          {order.families.length === 1 ? t.taxon.family.toLowerCase() : t.taxon.families.toLowerCase()}{" "}
          · {fmt(order.total)}{" "}
          {order.total === 1 ? t.taxon.species.toLowerCase() : t.taxon.speciesPlural.toLowerCase()}
        </p>
      </div>
      <div className="mt-auto">
        <ProgressBar total={order.total} needs={order.needs} />
      </div>
    </Link>
  );
}

export function FamilyCard({
  family,
  showOrder = false,
}: {
  family: FamilyNode;
  showOrder?: boolean;
}) {
  return (
    <Link
      href={`/families/${family.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-md"
    >
      <div>
        <h3 className="font-semibold group-hover:underline">{family.family}</h3>
        <p className="mt-0.5 text-sm text-muted">{family.familyEn}</p>
        {showOrder && (
          <p className="mt-0.5 text-xs text-muted">{family.order}</p>
        )}
      </div>
      <div className="mt-auto">
        <ProgressBar total={family.total} needs={family.needs} />
      </div>
    </Link>
  );
}
