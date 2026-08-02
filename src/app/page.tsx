import Link from "next/link";

import { ProgressBar } from "@/components/ProgressBar";
import { FamilyCard } from "@/components/TaxonCard";
import {
  allFamilies,
  allOrders,
  biggestGaps,
  completeFamilies,
  siteTotals,
} from "@/lib/species";
import { fmt, percent, t } from "@/lib/strings";

export default function HomePage() {
  const totals = siteTotals();
  const named = totals.total - totals.needs;
  const orders = allOrders();
  const families = allFamilies();

  return (
    <div className="flex flex-col gap-14">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t.site.tagline}
          </h1>
          <p className="mt-4 max-w-prose text-lg text-muted">
            Heimslistinn AviList telur {fmt(totals.total)} fuglategundir.{" "}
            {fmt(named)} þeirra eiga íslenskt nafn — {fmt(totals.needs)} gera það
            ekki. Þetta eru að mestu suðrænir spörfuglar sem aldrei hafa þurft
            nafn á íslensku.
          </p>
          <p className="mt-3 max-w-prose text-muted">
            Hér má fletta í gegnum flokkunarkerfið, ættbálk fyrir ættbálk, og sjá
            hverja tegund sem bíður nafns.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/orders"
              className="rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:opacity-90"
            >
              {t.home.ctaBrowse}
            </Link>
            <Link
              href="/about"
              className="rounded-lg border border-line px-4 py-2.5 font-medium hover:border-accent hover:text-accent"
            >
              {t.home.ctaAbout}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
            {t.progress.heading}
          </h2>
          <p className="mt-3 text-4xl font-semibold tabular-nums">
            {percent(named, totals.total)}%
          </p>
          <p className="text-muted">{t.progress.ofTotal(named, totals.total)}</p>
          <div className="mt-4">
            <ProgressBar
              total={totals.total}
              needs={totals.needs}
              showCaption={false}
            />
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-muted">{t.taxon.orders}</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {fmt(orders.length)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t.taxon.families}</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {fmt(families.length)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t.status.unnamed}</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {fmt(totals.needs)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t.home.gapsHeading}
        </h2>
        <p className="mt-1 max-w-prose text-muted">{t.home.gapsIntro}</p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {biggestGaps(8).map((family) => (
            <li key={family.slug} className="contents">
              <FamilyCard family={family} showOrder />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t.home.doneHeading}
        </h2>
        <p className="mt-1 max-w-prose text-muted">{t.home.doneIntro}</p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {completeFamilies(4).map((family) => (
            <li key={family.slug} className="contents">
              <FamilyCard family={family} showOrder />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
