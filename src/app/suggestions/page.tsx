import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.nav.suggestions };

export default function SuggestionsPage() {
  return (
    <div className="max-w-prose">
      <Breadcrumbs
        items={[{ label: t.nav.home, href: "/" }, { label: t.nav.suggestions }]}
      />

      <h1 className="text-3xl font-semibold tracking-tight">{t.nav.suggestions}</h1>
      <p className="mt-4 leading-relaxed text-muted">
        Hér verður straumur af nýjum tillögum, athugasemdum og samþykktum nöfnum
        af öllum vefnum. Tillögur opna í næsta áfanga, þegar innskráning og
        umræður bætast við.
      </p>
      <p className="mt-4">
        <Link href="/orders" className="underline hover:text-accent">
          {t.home.ctaBrowse}
        </Link>
      </p>
    </div>
  );
}
