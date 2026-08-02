import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { siteTotals } from "@/lib/species";
import { fmt, t } from "@/lib/strings";

export const metadata: Metadata = { title: t.about.heading };

export default function AboutPage() {
  const totals = siteTotals();
  const named = totals.total - totals.needs;

  return (
    <div className="max-w-prose">
      <Breadcrumbs items={[{ label: t.nav.home, href: "/" }, { label: t.about.heading }]} />

      <h1 className="text-3xl font-semibold tracking-tight">{t.about.heading}</h1>

      <div className="mt-6 flex flex-col gap-6 leading-relaxed">
        <p>
          Heimslisti fugla, AviList v2025b, telur {fmt(totals.total)} viðurkenndar
          tegundir. {fmt(named)} þeirra eiga íslenskt nafn og {fmt(totals.needs)}{" "}
          ekki. Nöfnin sem til eru ná einkum yfir fugla sem varða Ísland og
          Norður-Atlantshafið: máfa, þernur, endur, vaðfugla og sjófugla. Heilar
          ættir suðrænna spörfugla eiga ekkert nafn.
        </p>

        <section>
          <h2 className="text-xl font-semibold">Hvernig tek ég þátt?</h2>
          <p className="mt-2">
            Eins og stendur má fletta í gegnum flokkunarkerfið og sjá hvaða
            tegundir bíða nafns. Tillögur, umræður og atkvæðagreiðsla opna í
            næsta áfanga; þá verður hægt að skrá sig inn, leggja fram nafn ásamt
            kyni, eignarfalli, fleirtölu og rökstuðningi, og ræða tillögur
            annarra.
          </p>
          <p className="mt-2">
            Rökstuðningurinn er verðmætasti hlutinn. Nafn sem enginn getur skýrt
            er nafn sem enginn tekur upp.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Hver ræður nöfnunum?</h2>
          <p className="mt-2">
            Ekki þessi síða. Íslensk málnefnd og fuglafræðisamfélagið eru þeir
            aðilar sem hafa raunverulegt vald í þessum efnum. Verkefnið er
            vettvangur til að leggja til, rökræða og halda utan um tillögur — svo
            að þegar nafn er tekið upp liggi fyrir hvernig það varð til.
          </p>
          <p className="mt-2">
            Nöfnin {fmt(named)} sem þegar eru til koma úr AviList. Þau eru verk
            íslenskra fuglafræðinga um áratugaskeið, eru í almennri notkun, og
            eru ekki til endurskoðunar hér.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Heimildir og leyfi</h2>
          <ul className="mt-2 flex list-disc flex-col gap-2 pl-5">
            <li>
              Flokkun, ensk heiti, útbreiðslulýsingar og fyrirliggjandi íslensk
              nöfn:{" "}
              <a
                className="underline hover:text-accent"
                href="https://www.avilist.org/"
                rel="noreferrer"
                target="_blank"
              >
                AviList v2025b
              </a>
              , sameinaði heimslisti fugla, útgefinn 10. júní 2026.
            </li>
            <li>
              Verndarstaða: flokkun{" "}
              <a
                className="underline hover:text-accent"
                href="https://www.iucnredlist.org/"
                rel="noreferrer"
                target="_blank"
              >
                IUCN
              </a>{" "}
              eins og hún stendur í AviList.
            </li>
            <li>
              Myndir: einstakir höfundar á Wikimedia Commons, merktir hver fyrir
              sig. Aðeins efni í almenningseign eða með CC0-, CC-BY- eða
              CC-BY-SA-leyfi er notað. Myndir eru ekki komnar inn enn.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
