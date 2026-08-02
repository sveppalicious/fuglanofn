import Link from "next/link";

import { t } from "@/lib/strings";

export default function NotFound() {
  return (
    <div className="max-w-prose py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t.common.notFound}</h1>
      <p className="mt-3 text-muted">
        Þessi slóð svarar engum ættbálki, ætt eða tegund í AviList v2025b.
      </p>
      <p className="mt-6 flex gap-4">
        <Link href="/" className="underline hover:text-accent">
          {t.nav.home}
        </Link>
        <Link href="/orders" className="underline hover:text-accent">
          {t.taxon.orders}
        </Link>
      </p>
    </div>
  );
}
