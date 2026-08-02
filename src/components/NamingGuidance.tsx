import { t } from "@/lib/strings";

/**
 * §5 of CLAUDE.md — the conventions real Icelandic bird names follow. This sits
 * beside the suggestion form so the rules are in view while someone writes, and
 * so the eventual soft validation has something to point at.
 */

export function NamingGuidance() {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{t.species.guidanceHeading}</h2>

      <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
        <li>
          Nöfn eru yfirleitt <strong className="font-medium text-foreground">eitt
          samsett orð</strong>, ekki orðasamband: <em>skógarþröstur</em>,{" "}
          <em>hrafnsönd</em>, <em>silfursvarri</em>.
        </li>
        <li>
          Nafnið þarf að vera{" "}
          <strong className="font-medium text-foreground">beygjanlegt íslenskt
          nafnorð</strong> með skýru kyni.
        </li>
        <li>
          Forðastu umritun úr ensku. <em>Okarito Brown Kiwi</em> er ekki nafn;{" "}
          <em>brúnkíví</em> er það.
        </li>
      </ul>


      <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
        Íslensk málnefnd og fuglafræðisamfélagið eru þeir aðilar sem ráða
        málinu til lykta. Þessi síða leggur til — hún kveður ekki upp úr.
      </p>
    </section>
  );
}
